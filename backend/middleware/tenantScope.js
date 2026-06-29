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

function tenantScope(req, res, next) {
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

  req.clubId = Number(clubId);
  return runWithTenant(
    { clubId: req.clubId, isSystem: false, userId: req.user.id, role: req.user.role },
    next
  );
}

module.exports = tenantScope;
