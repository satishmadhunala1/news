const logger = require('../utils/logger');

function notFound(req, res, next) {
  res.status(404).json({
    success: false,
    error: `Route not found: ${req.method} ${req.originalUrl}`,
  });
}

function errorHandler(err, req, res, next) {
  logger.error('API error', { message: err.message, path: req.originalUrl });

  const status = err.status || err.statusCode || 500;
  res.status(status).json({
    success: false,
    error: err.message || 'Internal server error',
    details: process.env.NODE_ENV === 'development' ? err.details || undefined : undefined,
  });
}

module.exports = {
  notFound,
  errorHandler,
};
