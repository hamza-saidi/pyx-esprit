/**
 * Global Error Handler Middleware
 * Captures all unhandled exceptions and returns a clean JSON response
 * while logging details for debugging.
 */
const logger = require('../utils/logger');

function errorHandler(err, req, res, next) {
  const statusCode = err.statusCode || 500;
  const isProduction = process.env.NODE_ENV === 'production';

  // Log error to file/console
  logger.error(`${req.method} ${req.url} - ${err.message}`, {
    stack: isProduction ? null : err.stack,
    ip: req.ip
  });

  // Handle specific Sequelize errors
  if (err.name === 'SequelizeConnectionError') {
    return res.status(503).json({
      message: 'Base de données temporairement indisponible. Veuillez réessayer.',
      error: isProduction ? null : err.message
    });
  }

  if (err.name === 'SequelizeUniqueConstraintError') {
    return res.status(400).json({
      message: 'Une ressource avec ces données existe déjà.',
      error: isProduction ? null : err.errors
    });
  }

  // Final JSON Response
  res.status(statusCode).json({
    message: err.message || 'Une erreur interne est survenue',
    error: isProduction ? null : err.stack
  });
}

module.exports = errorHandler;
