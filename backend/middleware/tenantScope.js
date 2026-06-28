/**
 * middleware/tenantScope.js
 *
 * SaaS Multi-Tenancy Scoping Middleware.
 * Extracts the tenant identifier ('club_id') from the authenticated user's JWT payload.
 * Ensures all database mutations and queries are isolated to the tenant.
 */

const logger = require('../utils/logger');

function tenantScope(req, res, next) {
  // Public routes (like login, public unsubscribe, etc.) might not have user auth context yet
  if (!req.user) {
    return next();
  }

  // Extract club_id from authenticated user context (injected by JWT middleware)
  const clubId = req.user.club_id || req.headers['x-club-id'];

  if (!clubId && req.user.role !== 'global_admin') {
    logger.warn(`Tenant context missing for user ${req.user.id}.`);
    return res.status(400).json({
      message: 'Contexte de club manquant. Veuillez vous reconnecter.',
    });
  }

  // Inbound request scoping
  req.clubId = clubId ? Number(clubId) : null;

  logger.info(`[TENANT] Request scoped to Club ID: ${req.clubId} for user: ${req.user.email}`);
  next();
}

module.exports = tenantScope;
