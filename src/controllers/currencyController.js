/**
 * @module controllers/currencyController
 * @description Currency endpoints: supported list + rate lookup.
 */

const { asyncHandler, successResponse } = require('../utils/helpers');
const currencyService = require('../services/currencyService');

// ── GET /api/currencies/supported ──────────────────────────
const supported = asyncHandler(async (_req, res) => {
  successResponse(res, { currencies: currencyService.getSupportedCurrencies() });
});

// ── GET /api/currencies/rate?from=USD&to=INR ───────────────
const rate = asyncHandler(async (req, res) => {
  const { from, to } = req.query;
  if (!from || !to) {
    return res.status(400).json({
      success: false,
      error: { code: 'MISSING_PARAMS', message: 'from and to query params required' },
    });
  }
  const exchangeRate = await currencyService.getRate(from.toUpperCase(), to.toUpperCase());
  successResponse(res, { from: from.toUpperCase(), to: to.toUpperCase(), rate: exchangeRate });
});

module.exports = { supported, rate };
