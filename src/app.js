/**
 * @module app
 * @description Express application setup with all middleware.
 */

const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const morgan = require('morgan');
const cookieParser = require('cookie-parser');
const path = require('path');
const config = require('./config/env');
const passport = require('./config/passport');
const errorHandler = require('./middleware/errorHandler');
const routes = require('./routes');

const app = express();

// ── Security headers ───────────────────────────────────────
app.use(helmet({
  contentSecurityPolicy: false, // Allow inline scripts in demo frontend
  crossOriginEmbedderPolicy: false,
}));

// ── CORS ───────────────────────────────────────────────────
app.use(cors({
  origin: config.frontendUrl,
  credentials: true,
}));

// ── Logging ────────────────────────────────────────────────
if (config.isDev) {
  app.use(morgan('dev'));
}

// ── Body parsing ───────────────────────────────────────────
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true }));
app.use(cookieParser());

// ── Passport ───────────────────────────────────────────────
app.use(passport.initialize());

// ── Uploads (open in dev for simplicity) ───────────────────
app.use('/uploads', express.static(path.resolve(config.uploadDir)));

// ── API Routes ─────────────────────────────────────────────
app.use('/api', routes);

// ── Global error handler (must be last) ────────────────────
app.use(errorHandler);

module.exports = app;
