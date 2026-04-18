/**
 * @module routes/auth
 * @description Authentication routes with validation and rate limiting.
 */

const { Router } = require('express');
const { body } = require('express-validator');
const rateLimit = require('express-rate-limit');
const passport = require('passport');
const { validate } = require('../middleware/validate');
const { authenticate } = require('../middleware/auth');
const authController = require('../controllers/authController');

const router = Router();

// Rate limit: 10 requests per 15 min on auth endpoints
const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 10,
  message: { success: false, error: { code: 'RATE_LIMIT', message: 'Too many attempts, try again later' } },
});

// ── Register ───────────────────────────────────────────────
router.post(
  '/register',
  authLimiter,
  [
    body('name').trim().notEmpty().withMessage('Name is required'),
    body('email').isEmail().normalizeEmail().withMessage('Valid email required'),
    body('password').isLength({ min: 8 }).withMessage('Password must be at least 8 characters'),
  ],
  validate,
  authController.register
);

// ── Login ──────────────────────────────────────────────────
router.post(
  '/login',
  authLimiter,
  [
    body('email').isEmail().normalizeEmail().withMessage('Valid email required'),
    body('password').notEmpty().withMessage('Password required'),
  ],
  validate,
  authController.login
);

// ── Refresh ────────────────────────────────────────────────
router.post('/refresh', authController.refresh);

// ── Logout ─────────────────────────────────────────────────
router.post('/logout', authController.logout);

// ── Google OAuth ───────────────────────────────────────────
router.get('/google', passport.authenticate('google', { scope: ['profile', 'email'], session: false }));
router.get(
  '/google/callback',
  passport.authenticate('google', { failureRedirect: '/login', session: false }),
  authController.googleCallback
);

// ── Profile ────────────────────────────────────────────────
router.get('/me', authenticate, authController.getProfile);
router.patch('/me', authenticate, authController.updateProfile);
router.delete('/me', authenticate, authController.deleteAccount);

module.exports = router;
