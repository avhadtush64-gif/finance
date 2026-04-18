/**
 * @module utils/helpers
 * @description General-purpose helper utilities.
 */

/**
 * Wraps an async Express route handler to forward errors to next().
 * @param {Function} fn – async (req, res, next) => …
 * @returns {Function}
 */
const asyncHandler = (fn) => (req, res, next) => {
  Promise.resolve(fn(req, res, next)).catch(next);
};

/**
 * Build a success JSON response.
 * @param {object} res – Express response
 * @param {any} data
 * @param {number} [statusCode=200]
 */
const successResponse = (res, data, statusCode = 200) => {
  return res.status(statusCode).json({ success: true, data });
};

/**
 * Parse pagination params from query string.
 * @param {object} query – req.query
 * @returns {{ page: number, limit: number, offset: number }}
 */
const parsePagination = (query) => {
  const page = Math.max(1, parseInt(query.page, 10) || 1);
  const limit = Math.min(100, Math.max(1, parseInt(query.limit, 10) || 20));
  return { page, limit, offset: (page - 1) * limit };
};

/**
 * Round a number to 2 decimal places.
 */
const round2 = (n) => Math.round((n + Number.EPSILON) * 100) / 100;

module.exports = { asyncHandler, successResponse, parsePagination, round2 };
