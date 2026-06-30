/**
 * Global Error Handler Middleware
 * Captures all unhandled exceptions and returns a sanitized JSON response.
 * In production: NEVER exposes raw error messages, stack traces, or DB schema info.
 * In development: full details returned for debugging.
 */
const logger = require('../utils/logger');

// Safe error messages for production (no DB internals exposed)
const SAFE_MESSAGES = {
  400: 'Requête invalide.',
  401: 'Non autorisé.',
  403: 'Accès refusé.',
  404: 'Ressource non trouvée.',
  409: 'Conflit de données.',
  422: 'Données de validation incorrectes.',
  429: 'Trop de requêtes. Veuillez réessayer plus tard.',
  500: 'Une erreur interne est survenue.',
  503: 'Service temporairement indisponible.',
};

function errorHandler(err, req, res, next) {
  const isProduction = process.env.NODE_ENV === 'production';
  let statusCode = err.statusCode || err.status || 500;
  let userMessage;
  let fieldErrors;

  // Log full error server-side (always, regardless of environment)
  logger.error(`[${req.method}] ${req.url} — ${err.name || 'Error'}: ${err.message}`, {
    statusCode,
    ip: req.ip,
    userId: req.user?.id || null,
    stack: err.stack,
  });

  // ── Sequelize-specific errors ─────────────────────────────────────────────
  if (err.name === 'SequelizeConnectionError' || err.name === 'SequelizeConnectionRefusedError') {
    statusCode = 503;
    userMessage = 'Base de données temporairement indisponible. Veuillez réessayer.';
  } else if (err.name === 'SequelizeUniqueConstraintError') {
    statusCode = 409;
    userMessage = 'Une ressource avec ces données existe déjà.';
  } else if (err.name === 'SequelizeValidationError') {
    statusCode = 422;
    userMessage = isProduction ? 'Données invalides.' : err.errors.map((e) => e.message).join(', ');
  } else if (err.name === 'ZodError') {
    statusCode = 400;
    userMessage = 'Données de validation incorrectes.';
    fieldErrors = err.errors.map((e) => ({ field: e.path.join('.'), message: e.message }));
  } else if (err.name === 'JsonWebTokenError' || err.name === 'TokenExpiredError') {
    statusCode = 401;
    userMessage = 'Session invalide ou expirée.';
  } else if (err.message && err.message.includes('Not allowed by CORS')) {
    statusCode = 403;
    userMessage = 'Origine non autorisée.';
  } else if (err.isOperational) {
    // Deliberately user-facing message (NotFoundError/ConflictError/...) -
    // safe to show as-is even in production, unlike generic exceptions.
    userMessage = err.message;
  }

  // ── Final response ────────────────────────────────────────────────────────
  const response = {
    message:
      userMessage || (isProduction ? SAFE_MESSAGES[statusCode] || SAFE_MESSAGES[500] : err.message),
  };

  if (fieldErrors) {
    response.errors = fieldErrors;
  }

  if (err.details) {
    Object.assign(response, err.details);
  }

  // Only add debug info in development
  if (!isProduction) {
    response.debug = {
      name: err.name,
      stack: err.stack,
    };
  }

  res.status(statusCode).json(response);
}

module.exports = errorHandler;
