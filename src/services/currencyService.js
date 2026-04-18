/**
 * @module services/currencyService
 * @description Exchange-rate fetching with 1-hour in-memory cache.
 */

const config = require('../config/env');
const { SUPPORTED_CURRENCIES } = require('../utils/constants');
const { AppError } = require('../utils/errors');

/** In-memory cache: { base: { target: rate, … }, __ts: Date.now() } */
const cache = new Map();
const CACHE_TTL = 60 * 60 * 1000; // 1 hour

/**
 * Fetch rates for a base currency from the API (or use fallback).
 * @param {string} base – e.g. 'USD'
 * @returns {Promise<Record<string, number>>}
 */
async function fetchRates(base) {
  const apiKey = config.exchangeRateApiKey;

  // If no API key, return 1:1 for same currency, rough placeholder for others
  if (!apiKey) {
    console.warn('⚠️  No EXCHANGE_RATE_API_KEY — using 1:1 fallback rates');
    const rates = {};
    SUPPORTED_CURRENCIES.forEach((c) => { rates[c] = 1; });
    rates[base] = 1;
    return rates;
  }

  const url = `https://v6.exchangerate-api.com/v6/${apiKey}/latest/${base}`;
  const resp = await fetch(url);
  if (!resp.ok) {
    throw new AppError(`Exchange rate API error: ${resp.status}`, 502, 'FX_API_ERROR');
  }
  const data = await resp.json();
  if (data.result !== 'success') {
    throw new AppError('Exchange rate API returned failure', 502, 'FX_API_ERROR');
  }
  return data.conversion_rates;
}

/**
 * Get exchange rate from one currency to another (cached).
 * @param {string} from
 * @param {string} to
 * @returns {Promise<number>}
 */
async function getRate(from, to) {
  if (from === to) return 1;

  if (!SUPPORTED_CURRENCIES.includes(from)) {
    throw new AppError(`Unsupported currency: ${from}`, 400, 'UNSUPPORTED_CURRENCY', {
      supported: SUPPORTED_CURRENCIES,
    });
  }
  if (!SUPPORTED_CURRENCIES.includes(to)) {
    throw new AppError(`Unsupported currency: ${to}`, 400, 'UNSUPPORTED_CURRENCY', {
      supported: SUPPORTED_CURRENCIES,
    });
  }

  let entry = cache.get(from);
  if (!entry || Date.now() - entry.__ts > CACHE_TTL) {
    const rates = await fetchRates(from);
    entry = { ...rates, __ts: Date.now() };
    cache.set(from, entry);
  }

  const rate = entry[to];
  if (!rate) {
    throw new AppError(`No rate available for ${from} → ${to}`, 502, 'FX_RATE_UNAVAILABLE');
  }
  return rate;
}

/**
 * Convert an amount from one currency to another.
 * @param {number} amount
 * @param {string} from
 * @param {string} to
 * @returns {Promise<{ converted: number, rate: number }>}
 */
async function convert(amount, from, to) {
  const rate = await getRate(from, to);
  return { converted: Math.round(amount * rate * 100) / 100, rate };
}

/**
 * Get supported currencies list.
 */
function getSupportedCurrencies() {
  return SUPPORTED_CURRENCIES;
}

module.exports = { getRate, convert, getSupportedCurrencies };
