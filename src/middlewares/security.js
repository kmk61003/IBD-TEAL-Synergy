'use strict';

const helmet = require('helmet');
const rateLimit = require('express-rate-limit');
const { doubleCsrf } = require('csrf-csrf');

// ─── Nonce injection ──────────────────────────────────────────────────────────
const crypto = require('crypto');

function generateNonce(req, res, next) {
  res.locals.nonce = crypto.randomBytes(16).toString('base64');
  next();
}

// ─── Helmet with strict CSP ──────────────────────────────────────────────────
function buildHelmet() {
  return [
    generateNonce,
    helmet({
      contentSecurityPolicy: {
        directives: {
          defaultSrc: ["'self'"],
          scriptSrc: [
            "'self'",
            (req, res) => `'nonce-${res.locals.nonce}'`,
            'https://checkout.razorpay.com',
            'https://js.stripe.com',
            'https://cdn.jsdelivr.net', // Bootstrap JS
          ],
          styleSrc: [
            "'self'",
            (req, res) => `'nonce-${res.locals.nonce}'`,
            'https://cdn.jsdelivr.net', // Bootstrap CSS
          ],
          fontSrc: ["'self'", 'https://cdn.jsdelivr.net'],
          imgSrc: ["'self'", 'data:', 'https:'],
          connectSrc: ["'self'", 'https://api.razorpay.com', 'https://api.stripe.com'],
          frameSrc: ['https://api.razorpay.com', 'https://js.stripe.com'],
          objectSrc: ["'none'"],
          baseUri: ["'self'"],
          formAction: ["'self'"],
          upgradeInsecureRequests: process.env.NODE_ENV === 'production' ? [] : null,
        },
      },
      hsts: process.env.NODE_ENV === 'production'
        ? { maxAge: 31536000, includeSubDomains: true, preload: true }
        : false,
      referrerPolicy: { policy: 'strict-origin-when-cross-origin' },
      permittedCrossDomainPolicies: false,
      crossOriginEmbedderPolicy: false, // Needed for Razorpay iframe
    }),
  ];
}

// ─── CSRF (double-submit cookie) ─────────────────────────────────────────────
const { generateToken, doubleCsrfProtection } = doubleCsrf({
  getSecret: () => process.env.CSRF_SECRET || 'csrf-dev-secret-change-me',
  cookieName: '__Host-csrf',
  cookieOptions: {
    httpOnly: true,
    sameSite: 'lax',
    secure: process.env.NODE_ENV === 'production',
    path: '/',
  },
  size: 64,
  ignoredMethods: ['GET', 'HEAD', 'OPTIONS'],
});

function csrfMiddleware(req, res, next) {
  res.locals.csrfToken = generateToken(req, res);
  next();
}

// ─── Rate limiters ────────────────────────────────────────────────────────────
const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 20,
  message: 'Too many requests from this IP, please try again after 15 minutes.',
  standardHeaders: true,
  legacyHeaders: false,
  skipSuccessfulRequests: false,
});

const checkoutLimiter = rateLimit({
  windowMs: 60 * 1000, // 1 minute
  max: 10,
  message: 'Too many checkout requests, please slow down.',
  standardHeaders: true,
  legacyHeaders: false,
});

const apiLimiter = rateLimit({
  windowMs: 60 * 1000,
  max: 60,
  standardHeaders: true,
  legacyHeaders: false,
});

module.exports = {
  buildHelmet,
  doubleCsrfProtection,
  csrfMiddleware,
  authLimiter,
  checkoutLimiter,
  apiLimiter,
};
