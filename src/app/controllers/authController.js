'use strict';

const argon2 = require('argon2');
const { v4: uuidv4 } = require('uuid');
const crypto = require('crypto');
const { body, validationResult } = require('express-validator');
const { getDb } = require('../../lib/db');
const { sendVerificationEmail } = require('../../lib/mailer');
const logger = require('../../lib/logger');

const BASE_URL = () => process.env.BASE_URL || 'http://localhost:3000';

// ─── Validation rules ─────────────────────────────────────────────────────────
const registerRules = [
  body('name').trim().notEmpty().withMessage('Name is required').isLength({ max: 100 }),
  body('email').normalizeEmail().isEmail().withMessage('Valid email required'),
  body('password')
    .isLength({ min: 8 }).withMessage('Password must be at least 8 characters')
    .matches(/[A-Z]/).withMessage('Must contain an uppercase letter')
    .matches(/[0-9]/).withMessage('Must contain a number'),
];

const loginRules = [
  body('email').normalizeEmail().isEmail().withMessage('Valid email required'),
  body('password').notEmpty().withMessage('Password required'),
];

// ─── Handlers ─────────────────────────────────────────────────────────────────
async function showRegister(req, res) {
  res.render('pages/auth/register', { title: 'Create Account', errors: [], old: {} });
}

async function handleRegister(req, res) {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return res.status(422).render('pages/auth/register', {
      title: 'Create Account',
      errors: errors.array(),
      old: req.body,
    });
  }

  const { name, email, password } = req.body;
  const db = getDb();

  try {
    const existing = await db.user.findUnique({ where: { email } });
    if (existing) {
      return res.status(422).render('pages/auth/register', {
        title: 'Create Account',
        errors: [{ path: 'email', msg: 'This email is already registered.' }],
        old: req.body,
      });
    }

    const hashedPassword = await argon2.hash(password, { timeCost: 3, memoryCost: 65536 });
    const token = crypto.randomBytes(32).toString('hex');
    const expires = new Date(Date.now() + 60 * 60 * 1000); // 1 hour

    await db.user.create({
      data: {
        id: uuidv4(),
        name: name.trim(),
        email,
        hashedPassword,
        emailVerificationToken: token,
        emailVerificationExpires: expires,
      },
    });

    await sendVerificationEmail({ to: email, name: name.trim(), token, baseUrl: BASE_URL() });

    req.flash('success', 'Account created! Check your email to verify your account.');
    res.redirect('/auth/login');
  } catch (err) {
    logger.error({ err }, 'Registration error');
    res.status(500).render('pages/error', { title: 'Error', message: 'Registration failed. Please try again.', status: 500 });
  }
}

async function showLogin(req, res) {
  res.render('pages/auth/login', { title: 'Sign In', errors: [], old: {} });
}

async function handleLogout(req, res, next) {
  req.logout((err) => {
    if (err) {return next(err);}
    req.session.destroy(() => {
      res.clearCookie('connect.sid');
      res.redirect('/');
    });
  });
}

async function verifyEmail(req, res) {
  const { token } = req.query;
  if (!token) {return res.redirect('/auth/login');}

  const db = getDb();
  try {
    const user = await db.user.findFirst({
      where: {
        emailVerificationToken: token,
        emailVerificationExpires: { gt: new Date() },
      },
    });

    if (!user) {
      req.flash('error', 'Verification link is invalid or has expired.');
      return res.redirect('/auth/login');
    }

    await db.user.update({
      where: { id: user.id },
      data: {
        emailVerifiedAt: new Date(),
        emailVerificationToken: null,
        emailVerificationExpires: null,
      },
    });

    req.flash('success', 'Email verified! You can now log in.');
    res.redirect('/auth/login');
  } catch (err) {
    logger.error({ err }, 'Email verification error');
    res.redirect('/auth/login');
  }
}

module.exports = {
  showRegister,
  handleRegister,
  showLogin,
  handleLogout,
  verifyEmail,
  registerRules,
  loginRules,
};
