'use strict';

require('dotenv').config();

const express = require('express');
const path = require('path');
const session = require('express-session');
const passport = require('passport');
const connectFlash = require('connect-flash');
const pinoHttp = require('pino-http');
const methodOverride = require('method-override');

const logger = require('./lib/logger');
const { configurePassport } = require('./middlewares/auth');
const { buildHelmet } = require('./middlewares/security');

// Routes
const authRoutes = require('./app/routes/auth');
const catalogRoutes = require('./app/routes/catalog');
const cartRoutes = require('./app/routes/cart');
const checkoutRoutes = require('./app/routes/checkout');
const orderRoutes = require('./app/routes/orders');
const adminRoutes = require('./app/routes/admin');

function createApp() {
  const app = express();

  // ── Trust proxy (Azure App Service / reverse proxy) ──────────────────────
  if (process.env.NODE_ENV === 'production') {
    app.set('trust proxy', 1);
  }

  // ── View engine ───────────────────────────────────────────────────────────
  const expressLayouts = require('express-ejs-layouts');
  app.set('view engine', 'ejs');
  app.set('views', path.join(__dirname, 'views'));
  app.use(expressLayouts);
  app.set('layout', 'layouts/main');
  app.set('layout extractScripts', true);
  app.set('layout extractStyles', true);

  // ── Security middleware (helmet + CSP nonce) ──────────────────────────────
  app.use(buildHelmet());

  // ── Request logging ───────────────────────────────────────────────────────
  if (process.env.NODE_ENV !== 'test') {
    app.use(pinoHttp({
      logger,
      genReqId: () => require('uuid').v4(),
      customLogLevel: (req, res, err) => {
        if (err || res.statusCode >= 500) {return 'error';}
        if (res.statusCode >= 400) {return 'warn';}
        return 'info';
      },
    }));
  }

  // ── Body parsers ──────────────────────────────────────────────────────────
  app.use(express.urlencoded({ extended: true, limit: '1mb' }));
  app.use(express.json({ limit: '1mb' }));
  app.use(require('cookie-parser')(process.env.CSRF_SECRET || 'dev-csrf-secret-change-me'));
  app.use(methodOverride('_method'));

  // ── Static files ──────────────────────────────────────────────────────────
  app.use(express.static(path.join(__dirname, 'public'), {
    maxAge: process.env.NODE_ENV === 'production' ? '7d' : 0,
    etag: true,
  }));

  // ── Sessions ──────────────────────────────────────────────────────────────
  const sessionSecret = process.env.SESSION_SECRET;
  if (!sessionSecret && process.env.NODE_ENV === 'production') {
    throw new Error('SESSION_SECRET env var is required in production');
  }

  app.use(session({
    secret: sessionSecret || 'dev-secret-change-in-production',
    name: 'teal.sid',
    resave: false,
    saveUninitialized: false,
    rolling: true, // Reset idle timer on each request
    cookie: {
      httpOnly: true,
      sameSite: 'lax',
      secure: process.env.NODE_ENV === 'production',
      maxAge: 24 * 60 * 60 * 1000, // 24h absolute timeout
    },
  }));

  // ── Passport ──────────────────────────────────────────────────────────────
  configurePassport();
  app.use(passport.initialize());
  app.use(passport.session());

  // ── Flash messages ────────────────────────────────────────────────────────
  app.use(connectFlash());

  // ── Template locals ───────────────────────────────────────────────────────
  app.use((req, res, next) => {
    res.locals.user = req.user || null;
    res.locals.flash = {
      success: req.flash('success'),
      error: req.flash('error'),
      info: req.flash('info'),
    };
    res.locals.currentPath = req.path;
    next();
  });

  // ── Health check ──────────────────────────────────────────────────────────
  app.get('/healthz', (req, res) => {
    res.json({ status: 'ok', uptime: process.uptime(), timestamp: new Date().toISOString() });
  });

  // ── Home route ────────────────────────────────────────────────────────────
  app.get('/', async (req, res) => {
    try {
      const { getDb } = require('./lib/db');
      const db = getDb();
      const featured = await db.product.findMany({
        where: { featured: true },
        take: 6,
        orderBy: { createdAt: 'desc' },
      });
      const { parseProduct } = require('./app/controllers/catalogController');
      res.render('pages/home', { title: 'TEAL Jewellery', featured: featured.map(parseProduct) });
    } catch {
      res.render('pages/home', { title: 'TEAL Jewellery', featured: [] });
    }
  });

  // ── Routes ────────────────────────────────────────────────────────────────
  app.use('/auth', authRoutes);
  app.use('/catalog', catalogRoutes);
  app.use('/cart', cartRoutes);
  app.use('/checkout', checkoutRoutes);
  app.use('/orders', orderRoutes);
  app.use('/admin', adminRoutes);

  // ── 404 handler ───────────────────────────────────────────────────────────
  app.use((req, res) => {
    res.status(404).render('pages/error', {
      title: 'Page Not Found',
      message: 'The page you are looking for does not exist.',
      status: 404,
    });
  });

  // ── Global error handler ──────────────────────────────────────────────────
  app.use((err, req, res, next) => {
    logger.error({ err, reqId: req.id }, 'Unhandled error');

    // CSRF token errors
    if (err.code === 'EBADCSRFTOKEN' || err.message === 'invalid csrf token') {
      return res.status(403).render('pages/error', {
        title: 'Security Error',
        message: 'Form session expired. Please go back and try again.',
        status: 403,
      });
    }

    const status = err.status || err.statusCode || 500;
    const message = process.env.NODE_ENV === 'production'
      ? 'An unexpected error occurred. Please try again.'
      : err.message;

    res.status(status).render('pages/error', { title: 'Error', message, status });
  });

  return app;
}

module.exports = { createApp };
