const express = require('express');
const router = express.Router();
const db = require('../../config/db');
const adminAuth = require('../../middleware/adminAuth');

router.use(adminAuth);

// GET /api/admin/categories
router.get('/', (req, res) => {
    try {
        const rows = db.prepare(
            `SELECT c.*, (SELECT COUNT(*) FROM product_category_mapping WHERE category_id = c.id) as product_count
             FROM category c ORDER BY c.name`
        ).all();
        res.json(rows);
    } catch (err) {
        console.error('Admin get categories error:', err);
        res.status(500).json({ error: 'Failed to fetch categories.' });
    }
});

// POST /api/admin/categories
router.post('/', (req, res) => {
    try {
        const { name, slug } = req.body;
        if (!name || !slug) return res.status(400).json({ error: 'Name and slug are required.' });

        const result = db.prepare('INSERT INTO category (name, slug) VALUES (?, ?)').run(
            name, slug.toLowerCase().replace(/[^a-z0-9-]/g, '-')
        );

        res.status(201).json({ message: 'Category created.', id: result.lastInsertRowid });
    } catch (err) {
        console.error('Admin create category error:', err);
        res.status(500).json({ error: 'Failed to create category.' });
    }
});

// PUT /api/admin/categories/:id
router.put('/:id', (req, res) => {
    try {
        const id = parseInt(req.params.id);
        const { name, slug, status } = req.body;

        db.prepare('UPDATE category SET name = ?, slug = ?, status = ? WHERE id = ?').run(
            name, slug.toLowerCase().replace(/[^a-z0-9-]/g, '-'), status || 'active', id
        );

        res.json({ message: 'Category updated.' });
    } catch (err) {
        console.error('Admin update category error:', err);
        res.status(500).json({ error: 'Failed to update category.' });
    }
});

// DELETE /api/admin/categories/:id
router.delete('/:id', (req, res) => {
    try {
        const id = parseInt(req.params.id);
        db.prepare('DELETE FROM category WHERE id = ?').run(id);
        res.json({ message: 'Category deleted.' });
    } catch (err) {
        console.error('Admin delete category error:', err);
        res.status(500).json({ error: 'Failed to delete category.' });
    }
});

module.exports = router;
