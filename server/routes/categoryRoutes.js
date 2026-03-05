const express = require('express');
const router = express.Router();
const { sql, poolPromise } = require('../config/db');

// GET /api/categories
router.get('/', async (req, res) => {
    try {
        const pool = await poolPromise;
        const result = await pool.request()
            .query(`SELECT id, name, slug, status FROM category WHERE status = 'active' ORDER BY name`);
        res.json(result.recordset);
    } catch (err) {
        console.error('Get categories error:', err);
        res.status(500).json({ error: 'Failed to fetch categories.' });
    }
});

module.exports = router;
