/**
 * @module middleware/errorHandler
 * @description Global Express error handling middleware.
 */

const config = require('../config/env');
const { AppError } = require('../utils/errors');

/**
 * Global error handler – must be registered LAST via app.use().
 */
const errorHandler = (err, _req, res, _next) => {
  // If it's one of our custom errors, use its properties
  if (err instanceof AppError) {
    return res.status(err.statusCode).json({
      success: false,
      error: {
        code: err.code,
        message: err.message,
        ...(err.details ? { details: err.details } : {}),
      },
    });
  }

  // express-validator errors (array of validation results)
  if (Array.isArray(err) && err[0]?.msg) {
    return res.status(422).json({
      success: false,
      error: {
        code: 'VALIDATION_ERROR',
        message: 'Validation failed',
        details: err.map((e) => ({ field: e.path || e.param, message: e.msg })),
      },
    });
  }

  // Multer errors
  if (err.code === 'LIMIT_FILE_SIZE') {
    return res.status(400).json({
      success: false,
      error: { code: 'FILE_TOO_LARGE', message: 'File exceeds maximum size limit' },
    });
  }

  // Unexpected errors
  console.error('Unhandled error:', err);
  return res.status(500).json({
    success: false,
    error: {
      code: 'INTERNAL_ERROR',
      message: config.isDev ? err.message : 'Internal server error',
      ...(config.isDev ? { stack: err.stack } : {}),
    },
  });
};

module.exports = errorHandler;
