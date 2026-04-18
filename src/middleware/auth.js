/**
 * @module middleware/auth
 * @description JWT authentication middleware.
 */

const jwt = require('jsonwebtoken');
const config = require('../config/env');
const { AuthError } = require('../utils/errors');

/**
 * Verifies the JWT access token from the Authorization header.
 * Attaches the decoded user payload to req.user.
 */
const authenticate = (req, _res, next) => {
  const header = req.headers.authorization;
  if (!header || !header.startsWith('Bearer ')) {
    return next(new AuthError('Access token required'));
  }

  const token = header.split(' ')[1];
  try {
    const decoded = jwt.verify(token, config.jwtSecret);
    req.user = decoded; // { id, email }
    next();
  } catch (err) {
    if (err.name === 'TokenExpiredError') {
      return next(new AuthError('Access token expired'));
    }
    return next(new AuthError('Invalid access token'));
  }
};

module.exports = { authenticate };
