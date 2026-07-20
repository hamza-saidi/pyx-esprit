/**
 * middleware/tenantScope.js
 *
 * SaaS Multi-Tenancy Scoping Middleware.
 * Extracts the tenant identifier ('club_id') from the authenticated user's
 * JWT payload and runs the rest of the request inside an AsyncLocalStorage
 * tenant context (see utils/tenantContext.js), which the Sequelize hooks in
 * models/hooks/tenantScopeHooks.js read to scope every query automatically.
 *
 * Must run after authenticateToken (needs req.user) and before any route
 * handler that touches the database - see middleware/auth.js's
 * `requireAuthAndTenant` export for the combined pair routes should use.
 */

const logger = require('../utils/logger');
const { runWithTenant } = require('../utils/tenantContext');

// Club itself is never tenant-scoped (it's the tenant root) - same system
// bypass used in authController.js/cronService.js for the one model that
// legitimately needs cross-tenant reads.
const SYSTEM_CONTEXT = { clubId: null, isSystem: true };

// Checked on every tenant-scoped request (see checkClubActive below) so a
// suspension/archival takes effect immediately, not just at next login -
// closes the gap where a club's users kept full access with their existing
// JWT until it naturally expired (up to 24h).
async function checkClubActive(clubId) {
  const { Club } = require('../models');
  const club = await runWithTenant(SYSTEM_CONTEXT, () =>
    Club.findByPk(clubId, { attributes: ['id', 'statut'] })
  );
  if (!club) return { ok: false, code: 'CLUB_NOT_FOUND', message: 'Club introuvable.' };
  if (club.statut === 'suspendu') {
    return {
      ok: false,
      code: 'CLUB_SUSPENDED',
      message: 'Ce club est suspendu. Contactez le support Pylon Pyx.',
    };
  }
  if (club.statut === 'archive') {
    return { ok: false, code: 'CLUB_ARCHIVED', message: 'Ce club a été archivé.' };
  }
  return { ok: true };
}

async function tenantScope(req, res, next) {
  if (!req.user) {
    // Public routes mounted without authenticateToken have no tenant
    // context to extract; they must set one up explicitly if they touch
    // tenant-scoped models (see e.g. contactController's public registration).
    return next();
  }

  if (req.user.role === 'global_admin') {
    const impersonateClubId = req.headers['x-impersonate-club-id'];
    if (!impersonateClubId || !/^\d+$/.test(String(impersonateClubId))) {
      return res.status(400).json({
        message: 'En-tête x-impersonate-club-id requis pour un global_admin.',
      });
    }
    const clubId = Number(impersonateClubId);

    const statusCheck = await checkClubActive(clubId);
    if (!statusCheck.ok) {
      return res.status(403).json({ message: statusCheck.message, code: statusCheck.code });
    }

    logger.warn(`[AUDIT] global_admin impersonation`, {
      userId: req.user.id,
      clubId,
      method: req.method,
      path: req.originalUrl,
    });
    req.clubId = clubId;
    return runWithTenant(
      { clubId, isSystem: false, userId: req.user.id, role: req.user.role },
      next
    );
  }

  const clubId = req.user.club_id;
  if (!clubId) {
    logger.warn(`Tenant context missing for user ${req.user.id}.`);
    return res.status(400).json({
      message: 'Contexte de club manquant. Veuillez vous reconnecter.',
    });
  }

  const statusCheck = await checkClubActive(Number(clubId));
  if (!statusCheck.ok) {
    return res.status(403).json({ message: statusCheck.message, code: statusCheck.code });
  }

  req.clubId = Number(clubId);
  return runWithTenant(
    { clubId: req.clubId, isSystem: false, userId: req.user.id, role: req.user.role },
    next
  );
}

module.exports = tenantScope;
