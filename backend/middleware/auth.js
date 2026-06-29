const jwt = require('jsonwebtoken');
const config = require('../config-temp');

function authenticateToken(req, res, next) {
  const authHeader = req.headers['authorization'];
  const token = authHeader && authHeader.split(' ')[1];
  if (!token) return res.status(401).json({ message: 'Token manquant' });

  const { getJwtSecret } = require('../utils/jwt');
  const secret = getJwtSecret('access');

  jwt.verify(token, secret, (err, user) => {
    if (err) {
      if (err.name === 'TokenExpiredError') {
        return res.status(401).json({ message: 'Token expiré' });
      }
      return res.status(401).json({ message: 'Token invalide' });
    }
    req.user = user;
    next();
  });
}

function authorizeRoles(...roles) {
  return (req, res, next) => {
    if (!roles.includes(req.user.role)) {
      return res.status(403).json({ message: 'Accès refusé' });
    }
    next();
  };
}

// Single point to wire into routes that need both JWT auth and multi-tenant
// scoping, so a route can never end up authenticated but un-scoped by
// forgetting to chain tenantScope separately.
const tenantScope = require('./tenantScope');
const requireAuthAndTenant = [authenticateToken, tenantScope];

module.exports = { authenticateToken, authorizeRoles, requireAuthAndTenant };
