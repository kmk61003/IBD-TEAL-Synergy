const express = require('express');
const router = express.Router();
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const { sql, poolPromise } = require('../config/db');

// POST /api/auth/register
router.post('/register', async (req, res) => {
    try {
        const { first_name, last_name, email, phone_no, password } = req.body;

        if (!first_name || !email || !password) {
            return res.status(400).json({ error: 'First name, email and password are required.' });
        }

        const pool = await poolPromise;

        // Check if email already exists
        const existing = await pool.request()
            .input('email', sql.VarChar(255), email)
            .query('SELECT id FROM customer WHERE email = @email');

        if (existing.recordset.length > 0) {
            return res.status(409).json({ error: 'Email already registered.' });
        }

        const password_hash = await bcrypt.hash(password, 10);

        const result = await pool.request()
            .input('first_name', sql.NVarChar(100), first_name)
            .input('last_name', sql.NVarChar(100), last_name || null)
            .input('email', sql.VarChar(255), email)
            .input('phone_no', sql.VarChar(20), phone_no || null)
            .input('password_hash', sql.VarChar(255), password_hash)
            .query(`INSERT INTO customer (first_name, last_name, email, phone_no, password_hash)
                    OUTPUT INSERTED.id
                    VALUES (@first_name, @last_name, @email, @phone_no, @password_hash)`);

        const customerId = result.recordset[0].id;

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

        const pool = await poolPromise;
        const result = await pool.request()
            .input('email', sql.VarChar(255), email)
            .query('SELECT id, first_name, last_name, email, password_hash FROM customer WHERE email = @email');

        if (result.recordset.length === 0) {
            return res.status(401).json({ error: 'Invalid email or password.' });
        }

        const customer = result.recordset[0];
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
