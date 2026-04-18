/**
 * @module controllers/authController
 * @description Authentication: register, login, refresh, logout, profile management.
 */

const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const { v4: uuidv4 } = require('uuid');
const db = require('../config/db');
const config = require('../config/env');
const { asyncHandler, successResponse } = require('../utils/helpers');
const { AuthError, NotFoundError, AppError, ValidationError } = require('../utils/errors');

const SALT_ROUNDS = 12;

/**
 * Generate access + refresh tokens for a user.
 * @param {{ id: string, email: string }} user
 */
function generateTokens(user) {
  const payload = { id: user.id, email: user.email };
  const accessToken = jwt.sign(payload, config.jwtSecret, { expiresIn: config.jwtAccessExpiry });
  const refreshToken = jwt.sign(payload, config.jwtRefreshSecret, { expiresIn: config.jwtRefreshExpiry });
  return { accessToken, refreshToken };
}

/**
 * Set refresh token as httpOnly cookie.
 */
function setRefreshCookie(res, token) {
  res.cookie('refreshToken', token, {
    httpOnly: true,
    secure: !config.isDev,
    sameSite: 'lax',
    maxAge: 7 * 24 * 60 * 60 * 1000, // 7 days
    path: '/',
  });
}

/**
 * Strip sensitive fields from user row.
 */
function sanitizeUser(user) {
  const { password_hash, ...safe } = user;
  return safe;
}

// ── POST /api/auth/register ────────────────────────────────
const register = asyncHandler(async (req, res) => {
  const { name, email, password } = req.body;

  // Check duplicate
  const existing = await db.query('SELECT id FROM users WHERE email = $1', [email]);
  if (existing.rows.length > 0) {
    throw new AppError('Email already registered', 409, 'EMAIL_EXISTS');
  }

  const passwordHash = await bcrypt.hash(password, SALT_ROUNDS);
  const id = uuidv4();

  const { rows } = await db.query(
    `INSERT INTO users (id, name, email, password_hash, preferred_currency)
     VALUES ($1, $2, $3, $4, 'USD') RETURNING *`,
    [id, name, email, passwordHash]
  );

  const user = rows[0];
  const { accessToken, refreshToken } = generateTokens(user);
  setRefreshCookie(res, refreshToken);

  successResponse(res, { user: sanitizeUser(user), accessToken }, 201);
});

// ── POST /api/auth/login ───────────────────────────────────
const login = asyncHandler(async (req, res) => {
  const { email, password } = req.body;

  const { rows } = await db.query('SELECT * FROM users WHERE email = $1', [email]);
  const user = rows[0];
  if (!user) throw new AuthError('Invalid email or password');
  if (!user.password_hash) throw new AuthError('This account uses Google sign-in');

  const valid = await bcrypt.compare(password, user.password_hash);
  if (!valid) throw new AuthError('Invalid email or password');

  const { accessToken, refreshToken } = generateTokens(user);
  setRefreshCookie(res, refreshToken);

  successResponse(res, { user: sanitizeUser(user), accessToken });
});

// ── POST /api/auth/refresh ─────────────────────────────────
const refresh = asyncHandler(async (req, res) => {
  const token = req.cookies?.refreshToken;
  if (!token) throw new AuthError('Refresh token required');

  let decoded;
  try {
    decoded = jwt.verify(token, config.jwtRefreshSecret);
  } catch {
    throw new AuthError('Invalid or expired refresh token');
  }

  // Verify user still exists
  const { rows } = await db.query('SELECT * FROM users WHERE id = $1', [decoded.id]);
  if (rows.length === 0) throw new AuthError('User no longer exists');

  const user = rows[0];
  const { accessToken, refreshToken: newRefresh } = generateTokens(user);
  setRefreshCookie(res, newRefresh);

  successResponse(res, { user: sanitizeUser(user), accessToken });
});

// ── POST /api/auth/logout ──────────────────────────────────
const logout = asyncHandler(async (_req, res) => {
  res.clearCookie('refreshToken', { httpOnly: true, path: '/' });
  successResponse(res, { message: 'Logged out' });
});

// ── Google OAuth callback handler ──────────────────────────
const googleCallback = asyncHandler(async (req, res) => {
  const user = req.user;
  const { accessToken, refreshToken } = generateTokens(user);
  setRefreshCookie(res, refreshToken);

  // Redirect to frontend with access token in URL fragment
  res.redirect(`${config.frontendUrl}/#token=${accessToken}`);
});

// ── GET /api/auth/me ───────────────────────────────────────
const getProfile = asyncHandler(async (req, res) => {
  const { rows } = await db.query('SELECT * FROM users WHERE id = $1', [req.user.id]);
  if (rows.length === 0) throw new NotFoundError('User');
  successResponse(res, { user: sanitizeUser(rows[0]) });
});

// ── PATCH /api/auth/me ─────────────────────────────────────
const updateProfile = asyncHandler(async (req, res) => {
  const { name, preferred_currency, avatar_url } = req.body;
  const fields = [];
  const values = [];
  let idx = 1;

  if (name !== undefined) { fields.push(`name = $${idx++}`); values.push(name); }
  if (preferred_currency !== undefined) { fields.push(`preferred_currency = $${idx++}`); values.push(preferred_currency); }
  if (avatar_url !== undefined) { fields.push(`avatar_url = $${idx++}`); values.push(avatar_url); }

  if (fields.length === 0) throw new ValidationError('No fields to update');

  fields.push(`updated_at = NOW()`);
  values.push(req.user.id);

  const { rows } = await db.query(
    `UPDATE users SET ${fields.join(', ')} WHERE id = $${idx} RETURNING *`,
    values
  );

  successResponse(res, { user: sanitizeUser(rows[0]) });
});

// ── DELETE /api/auth/me ────────────────────────────────────
const deleteAccount = asyncHandler(async (req, res) => {
  await db.query('DELETE FROM users WHERE id = $1', [req.user.id]);
  res.clearCookie('refreshToken', { httpOnly: true, path: '/' });
  successResponse(res, { message: 'Account deleted' });
});

module.exports = {
  register, login, refresh, logout,
  googleCallback, getProfile, updateProfile, deleteAccount,
};
