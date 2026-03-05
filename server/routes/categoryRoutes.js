const express = require('express');
const router = express.Router();
const db = require('../config/db');

// GET /api/categories
router.get('/', (req, res) => {
    try {
        const rows = db.prepare("SELECT id, name, slug, status FROM category WHERE status = 'active' ORDER BY name").all();
        res.json(rows);
    } catch (err) {
        console.error('Get categories error:', err);
        res.status(500).json({ error: 'Failed to fetch categories.' });
    }
});

module.exports = router;
