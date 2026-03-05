'use strict';

/** Middleware: require authenticated user, redirect to login otherwise */
function requireAuth(req, res, next) {
  if (req.isAuthenticated()) {return next();}
  req.flash('error', 'Please log in to continue.');
  res.redirect(`/auth/login?next=${encodeURIComponent(req.originalUrl)}`);
}

/** Middleware: require admin role */
function requireAdmin(req, res, next) {
  if (req.isAuthenticated() && req.user.role === 'admin') {return next();}
  res.status(403).render('pages/error', {
    title: 'Access Denied',
    message: 'You do not have permission to view this page.',
    status: 403,
  });
}

/** Middleware: redirect authenticated users away from auth pages */
function redirectIfAuth(req, res, next) {
  if (req.isAuthenticated()) {return res.redirect('/catalog');}
  next();
}

module.exports = { requireAuth, requireAdmin, redirectIfAuth };
