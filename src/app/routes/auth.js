'use strict';

const express = require('express');
const passport = require('passport');
const {
  showRegister, handleRegister, showLogin, handleLogout, verifyEmail,
  registerRules, loginRules,
} = require('../controllers/authController');
const { redirectIfAuth } = require('../../middlewares/guards');
const { doubleCsrfProtection, csrfMiddleware, authLimiter } = require('../../middlewares/security');

const router = express.Router();

// All auth routes share the CSRF middleware and rate limiter
router.use(csrfMiddleware);
router.use(authLimiter);

router.get('/register', redirectIfAuth, showRegister);
router.post('/register', redirectIfAuth, doubleCsrfProtection, registerRules, handleRegister);

router.get('/login', redirectIfAuth, showLogin);
router.post('/login', redirectIfAuth, doubleCsrfProtection, loginRules,
  passport.authenticate('local', {
    failureRedirect: '/auth/login',
    failureFlash: true,
  }),
  (req, res) => {
    // Session rotation
    const sessionData = req.session;
    req.session.regenerate((err) => {
      if (err) { return res.redirect('/auth/login'); }
      Object.assign(req.session, sessionData);
      req.session.user = req.user;
      const next = req.query.next || '/catalog';
      const safeNext = next.startsWith('/') ? next : '/catalog';
      res.redirect(safeNext);
    });
  }
);

router.get('/logout', handleLogout);
router.get('/verify-email', verifyEmail);

module.exports = router;
