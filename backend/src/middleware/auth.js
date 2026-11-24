const config = require('../config');

/**
 * Protect sensitive operations with an internal API secret header.
 * Header: x-api-secret
 */
function requireInternalSecret(req, res, next) {
  const provided = req.header('x-api-secret') || req.header('X-API-Secret');
  if (!config.internalApiSecret) {
    return res.status(500).json({
      success: false,
      error: 'INTERNAL_API_SECRET is not configured on the server',
    });
  }
  if (!provided || provided !== config.internalApiSecret) {
    return res.status(401).json({
      success: false,
      error: 'Unauthorized: invalid or missing x-api-secret',
    });
  }
  return next();
}

module.exports = {
  requireInternalSecret,
};
