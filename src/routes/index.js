/**
 * @module routes/index
 * @description Main route aggregator — mounts all sub-routers.
 */

const { Router } = require('express');
const { successResponse } = require('../utils/helpers');
const currencyCtrl = require('../controllers/currencyController');
const dashboardCtrl = require('../controllers/dashboardController');
const { authenticate } = require('../middleware/auth');

const router = Router();

// ── Health check ───────────────────────────────────────────
router.get('/health', (_req, res) => {
  successResponse(res, { status: 'ok', timestamp: new Date().toISOString() });
});

// ── Mount sub-routers ──────────────────────────────────────
router.use('/auth', require('./auth'));
router.use('/transactions', require('./transactions'));
router.use('/categories', require('./categories'));
router.use('/budgets', require('./budgets'));
router.use('/reports', require('./reports'));

// ── Dashboard ──────────────────────────────────────────────
router.get('/dashboard', authenticate, dashboardCtrl.getDashboard);

// ── Currencies ─────────────────────────────────────────────
router.get('/currencies/supported', currencyCtrl.supported);
router.get('/currencies/rate', currencyCtrl.rate);

module.exports = router;
