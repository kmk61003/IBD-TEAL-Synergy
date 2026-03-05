const express = require('express');
const router = express.Router();
const { sql, poolPromise } = require('../../config/db');
const adminAuth = require('../../middleware/adminAuth');

router.use(adminAuth);

// GET /api/admin/categories
router.get('/', async (req, res) => {
    try {
        const pool = await poolPromise;
        const result = await pool.request()
            .query(`SELECT c.*, (SELECT COUNT(*) FROM product_category_mapping WHERE category_id = c.id) as product_count
                    FROM category c ORDER BY c.name`);
        res.json(result.recordset);
    } catch (err) {
        console.error('Admin get categories error:', err);
        res.status(500).json({ error: 'Failed to fetch categories.' });
    }
});

// POST /api/admin/categories
router.post('/', async (req, res) => {
    try {
        const { name, slug } = req.body;
        if (!name || !slug) return res.status(400).json({ error: 'Name and slug are required.' });

        const pool = await poolPromise;
        const result = await pool.request()
            .input('name', sql.NVarChar(255), name)
            .input('slug', sql.VarChar(255), slug.toLowerCase().replace(/[^a-z0-9-]/g, '-'))
            .query('INSERT INTO category (name, slug) OUTPUT INSERTED.id VALUES (@name, @slug)');

        res.status(201).json({ message: 'Category created.', id: result.recordset[0].id });
    } catch (err) {
        console.error('Admin create category error:', err);
        res.status(500).json({ error: 'Failed to create category.' });
    }
});

// PUT /api/admin/categories/:id
router.put('/:id', async (req, res) => {
    try {
        const id = parseInt(req.params.id);
        const { name, slug, status } = req.body;

        const pool = await poolPromise;
        await pool.request()
            .input('id', sql.Int, id)
            .input('name', sql.NVarChar(255), name)
            .input('slug', sql.VarChar(255), slug.toLowerCase().replace(/[^a-z0-9-]/g, '-'))
            .input('status', sql.VarChar(20), status || 'active')
            .query('UPDATE category SET name = @name, slug = @slug, status = @status WHERE id = @id');

        res.json({ message: 'Category updated.' });
    } catch (err) {
        console.error('Admin update category error:', err);
        res.status(500).json({ error: 'Failed to update category.' });
    }
});

// DELETE /api/admin/categories/:id
router.delete('/:id', async (req, res) => {
    try {
        const id = parseInt(req.params.id);
        const pool = await poolPromise;
        await pool.request().input('id', sql.Int, id)
            .query('DELETE FROM category WHERE id = @id');

        res.json({ message: 'Category deleted.' });
    } catch (err) {
        console.error('Admin delete category error:', err);
        res.status(500).json({ error: 'Failed to delete category.' });
    }
});

module.exports = router;
