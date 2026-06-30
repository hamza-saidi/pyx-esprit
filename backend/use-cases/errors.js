// isOperational marks errors whose .message was deliberately written to be
// shown to the end user (no internal details, no stack info) - errorHandler
// trusts these even in production, unlike generic/unexpected exceptions
// which always get masked behind a generic message there.
class NotFoundError extends Error {
  constructor(message = 'Ressource non trouvée') {
    super(message);
    this.name = 'NotFoundError';
    this.statusCode = 404;
    this.isOperational = true;
  }
}

class ConflictError extends Error {
  constructor(message = 'Conflit de données') {
    super(message);
    this.name = 'ConflictError';
    this.statusCode = 409;
    this.isOperational = true;
  }
}

class ForbiddenError extends Error {
  constructor(message = 'Accès refusé') {
    super(message);
    this.name = 'ForbiddenError';
    this.statusCode = 403;
    this.isOperational = true;
  }
}

class BadRequestError extends Error {
  constructor(message = 'Requête invalide', details) {
    super(message);
    this.name = 'BadRequestError';
    this.statusCode = 400;
    this.isOperational = true;
    if (details) this.details = details;
  }
}

module.exports = { NotFoundError, ConflictError, ForbiddenError, BadRequestError };
