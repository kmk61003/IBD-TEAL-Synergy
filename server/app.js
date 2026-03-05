require('dotenv').config();
const express = require('express');
const cors = require('cors');
const session = require('express-session');
const path = require('path');

const app = express();

// Middleware
app.use(cors());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(session({
    secret: process.env.SESSION_SECRET || 'test-secret',
    resave: false,
    saveUninitialized: true,
    cookie: {
        maxAge: 24 * 60 * 60 * 1000, // 24 hours
        secure: process.env.NODE_ENV === 'production',
        httpOnly: true
    }
}));

// Static files
app.use(express.static(path.join(__dirname, '..', 'public')));
app.use('/uploads', express.static(path.join(__dirname, 'uploads')));

// API Routes
app.use('/api/auth', require('./routes/authRoutes'));
app.use('/api/products', require('./routes/productRoutes'));
app.use('/api/categories', require('./routes/categoryRoutes'));
app.use('/api/cart', require('./routes/cartRoutes'));
app.use('/api/orders', require('./routes/orderRoutes'));
app.use('/api/payment', require('./routes/paymentRoutes'));
app.use('/api/account', require('./routes/accountRoutes'));
app.use('/api/chat', require('./routes/chatRoutes'));

// Admin Routes
app.use('/api/admin/auth', require('./routes/admin/authRoutes'));
app.use('/api/admin/products', require('./routes/admin/productRoutes'));
app.use('/api/admin/categories', require('./routes/admin/categoryRoutes'));
app.use('/api/admin/orders', require('./routes/admin/orderRoutes'));
app.use('/api/admin/dashboard', require('./routes/admin/dashboardRoutes'));

// SPA fallback — serve homepage for non-API, non-static routes
app.get('*', function (req, res) {
    if (!req.path.startsWith('/api/')) {
        res.sendFile(path.join(__dirname, '..', 'public', 'index.html'));
    }
});

// Error handling middleware
app.use(function (err, req, res, next) {
    console.error(err.stack);
    res.status(500).json({ error: 'Something went wrong' });
});

module.exports = app;
