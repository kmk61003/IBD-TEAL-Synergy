'use strict';

const passport = require('passport');
const LocalStrategy = require('passport-local').Strategy;
const argon2 = require('argon2');
const { getDb } = require('../lib/db');

const MAX_LOGIN_ATTEMPTS = 5;
const LOCK_TIME_MS = 15 * 60 * 1000; // 15 minutes

function configurePassport() {
  const db = getDb();

  passport.use(
    new LocalStrategy(
      { usernameField: 'email', passwordField: 'password', passReqToCallback: true },
      async (req, email, password, done) => {
        try {
          const user = await db.user.findUnique({ where: { email: email.toLowerCase() } });

          // No such user
          if (!user || !user.hashedPassword) {
            // Add small delay to prevent timing attacks
            await argon2.hash('dummy', { timeCost: 1, memoryCost: 1024 });
            return done(null, false, { message: 'Invalid email or password.' });
          }

          // Check account lock
          if (user.lockUntil && user.lockUntil > new Date()) {
            const minutes = Math.ceil((user.lockUntil - Date.now()) / 60000);
            return done(null, false, {
              message: `Account temporarily locked. Try again in ${minutes} minute(s).`,
            });
          }

          // Verify password
          const valid = await argon2.verify(user.hashedPassword, password);

          if (!valid) {
            const attempts = (user.loginAttempts || 0) + 1;
            const updateData = { loginAttempts: attempts };
            if (attempts >= MAX_LOGIN_ATTEMPTS) {
              updateData.lockUntil = new Date(Date.now() + LOCK_TIME_MS);
              updateData.loginAttempts = 0;
            }
            await db.user.update({ where: { id: user.id }, data: updateData });
            return done(null, false, { message: 'Invalid email or password.' });
          }

          // Successful login – reset counters
          await db.user.update({
            where: { id: user.id },
            data: { loginAttempts: 0, lockUntil: null },
          });

          // Check email verification (skip in dev if DEV_SKIP_EMAIL_VERIFY=true)
          if (!user.emailVerifiedAt && process.env.DEV_SKIP_EMAIL_VERIFY !== 'true') {
            return done(null, false, {
              message: 'Please verify your email address before logging in.',
            });
          }

          return done(null, user);
        } catch (err) {
          return done(err);
        }
      }
    )
  );

  passport.serializeUser((user, done) => done(null, user.id));

  passport.deserializeUser(async (id, done) => {
    try {
      const db = getDb();
      const user = await db.user.findUnique({ where: { id } });
      done(null, user || false);
    } catch (err) {
      done(err);
    }
  });
}

module.exports = { configurePassport };
