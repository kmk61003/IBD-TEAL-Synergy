const express = require('express');
const router = express.Router();
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const db = require('../config/db');

// POST /api/auth/register
router.post('/register', async (req, res) => {
    try {
        const { first_name, last_name, email, phone_no, password } = req.body;

        if (!first_name || !email || !password) {
            return res.status(400).json({ error: 'First name, email and password are required.' });
        }

        const existing = db.prepare('SELECT id FROM customer WHERE email = ?').get(email);
        if (existing) {
            return res.status(409).json({ error: 'Email already registered.' });
        }

        const password_hash = await bcrypt.hash(password, 10);

        const result = db.prepare(
            'INSERT INTO customer (first_name, last_name, email, phone_no, password_hash) VALUES (?, ?, ?, ?, ?)'
        ).run(first_name, last_name || null, email, phone_no || null, password_hash);

        const customerId = result.lastInsertRowid;

        const token = jwt.sign(
            { id: customerId, email },
            process.env.JWT_SECRET,
            { expiresIn: process.env.JWT_EXPIRES_IN }
        );

        res.status(201).json({ token, customer: { id: customerId, first_name, email } });
    } catch (err) {
        console.error('Register error:', err);
        res.status(500).json({ error: 'Registration failed.' });
    }
});

// POST /api/auth/login
router.post('/login', async (req, res) => {
    try {
        const { email, password } = req.body;

        if (!email || !password) {
            return res.status(400).json({ error: 'Email and password are required.' });
        }

        const customer = db.prepare(
            'SELECT id, first_name, last_name, email, password_hash FROM customer WHERE email = ?'
        ).get(email);

        if (!customer) {
            return res.status(401).json({ error: 'Invalid email or password.' });
        }

        const valid = await bcrypt.compare(password, customer.password_hash);

        if (!valid) {
            return res.status(401).json({ error: 'Invalid email or password.' });
        }

        const token = jwt.sign(
            { id: customer.id, email: customer.email },
            process.env.JWT_SECRET,
            { expiresIn: process.env.JWT_EXPIRES_IN }
        );

        res.json({
            token,
            customer: {
                id: customer.id,
                first_name: customer.first_name,
                last_name: customer.last_name,
                email: customer.email
            }
        });
    } catch (err) {
        console.error('Login error:', err);
        res.status(500).json({ error: 'Login failed.' });
    }
});

module.exports = router;
