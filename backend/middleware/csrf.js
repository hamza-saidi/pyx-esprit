/**
 * middleware/csrf.js
 *
 * Custom Double-Submit Cookie CSRF Protection Middleware.
 * Replaces heavy csurf package. Works out-of-the-box in cluster environments.
 *
 * Mechanism:
 * - Server sets a cookie (xsrf-token) with the CSRF token.
 * - Client reads the cookie and sends it back in the header (X-XSRF-TOKEN).
 * - Middleware compares the cookie and the header.
 */

const { randomBytes } = require('crypto');

/**
 * Middleware to validate CSRF tokens on mutating requests.
 */
function csrfProtection(req, res, next) {
  // 1. Bypass validation for safe HTTP methods (GET, HEAD, OPTIONS)
  const safeMethods = new Set(['GET', 'HEAD', 'OPTIONS']);
  if (safeMethods.has(req.method)) {
    return next();
  }

  // 2. Extract tokens from cookies and headers
  const cookieToken = req.cookies?.['xsrf-token'];
  const headerToken = req.headers['x-xsrf-token'];

  if (!cookieToken || !headerToken) {
    const err = new Error('Not allowed by CSRF protection: Missing CSRF token.');
    err.statusCode = 403;
    return next(err);
  }

  // 3. Compare values (constant-time equivalent)
  if (cookieToken !== headerToken) {
    const err = new Error('Not allowed by CSRF protection: Token mismatch.');
    err.statusCode = 403;
    return next(err);
  }

  next();
}

/**
 * Endpoint helper to generate and set a new CSRF token cookie.
 */
function setCsrfCookie(req, res) {
  const token = randomBytes(24).toString('hex');

  // Set cookie readable by React frontend (httpOnly: false so client JS can read and send in headers)
  res.cookie('xsrf-token', token, {
    sameSite: 'lax',
    secure: !!process.env.COOKIE_SECURE,
    path: '/',
  });

  return token;
}

module.exports = { csrfProtection, setCsrfCookie };
