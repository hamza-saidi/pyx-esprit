const config = require('../config-temp');

/**
 * Retrieves the JWT secret safely.
 * Throws a critical error if running in production with default or missing keys.
 *
 * @param {'access'|'refresh'} type - Type of JWT token
 * @returns {string}
 */
function getJwtSecret(type = 'access') {
  const isProduction = process.env.NODE_ENV === 'production';
  let secret = '';

  if (type === 'refresh') {
    secret = process.env.JWT_REFRESH_SECRET || (config && config.jwt && config.jwt.refreshSecret);
  }

  if (!secret) {
    secret = process.env.JWT_SECRET || (config && config.jwt && config.jwt.secret);
  }

  // SECURITY: Fail-secure check to prevent default fallback key in production
  if (isProduction) {
    if (!secret || secret === 'your-super-secret-jwt-key-here-12345') {
      throw new Error(
        'CRITICAL SECURITY ERROR: Strong custom JWT_SECRET is required in production environment.'
      );
    }
  }

  return secret;
}

module.exports = { getJwtSecret };
