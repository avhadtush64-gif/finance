/**
 * @module middleware/validate
 * @description Express-validator middleware wrapper.
 */

const { validationResult } = require('express-validator');

/**
 * Runs express-validator checks and sends 422 if validation fails.
 * Use AFTER an array of check() / body() calls in the route definition.
 * @param {import('express').Request} req
 * @param {import('express').Response} res
 * @param {import('express').NextFunction} next
 */
const validate = (req, res, next) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return res.status(422).json({
      success: false,
      error: {
        code: 'VALIDATION_ERROR',
        message: 'Validation failed',
        details: errors.array().map((e) => ({
          field: e.path || e.param,
          message: e.msg,
          value: e.value,
        })),
      },
    });
  }
  next();
};

module.exports = { validate };
