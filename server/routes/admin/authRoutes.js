const express = require('express');
const router = express.Router();
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const { sql, poolPromise } = require('../../config/db');

// POST /api/admin/auth/login
router.post('/login', async (req, res) => {
    try {
        const { username, password } = req.body;

        if (!username || !password) {
            return res.status(400).json({ error: 'Username and password are required.' });
        }

        const pool = await poolPromise;
        const result = await pool.request()
            .input('username', sql.VarChar(100), username)
            .query('SELECT id, username, password_hash, role FROM admin_user WHERE username = @username');

        if (result.recordset.length === 0) {
            return res.status(401).json({ error: 'Invalid credentials.' });
        }

        const admin = result.recordset[0];
        const valid = await bcrypt.compare(password, admin.password_hash);

        if (!valid) {
            return res.status(401).json({ error: 'Invalid credentials.' });
        }

        const token = jwt.sign(
            { id: admin.id, username: admin.username, role: admin.role, isAdmin: true },
            process.env.JWT_SECRET,
            { expiresIn: '12h' }
        );

        res.json({ token, admin: { id: admin.id, username: admin.username, role: admin.role } });
    } catch (err) {
        console.error('Admin login error:', err);
        res.status(500).json({ error: 'Login failed.' });
    }
});

module.exports = router;
