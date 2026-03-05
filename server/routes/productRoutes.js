const express = require('express');
const router = express.Router();
const db = require('../config/db');

// GET /api/products?category=slug&page=1&limit=12&search=keyword
router.get('/', (req, res) => {
    try {
        const page = Math.max(1, parseInt(req.query.page) || 1);
        const limit = Math.min(50, Math.max(1, parseInt(req.query.limit) || 12));
        const offset = (page - 1) * limit;
        const category = req.query.category || null;
        const search = req.query.search || null;

        let whereClause = "WHERE mp.status = 'active'";
        const params = [];

        if (category) {
            whereClause += ` AND EXISTS (
                SELECT 1 FROM product_category_mapping pcm
                JOIN category c ON c.id = pcm.category_id
                WHERE pcm.master_product_id = mp.id AND c.slug = ? AND c.status = 'active'
            )`;
            params.push(category);
        }

        if (search) {
            whereClause += ` AND (mp.name LIKE ? OR mp.short_description LIKE ?)`;
            params.push('%' + search + '%', '%' + search + '%');
        }

        const total = db.prepare(
            `SELECT COUNT(*) as total FROM master_product mp ${whereClause}`
        ).get(...params).total;

        const products = db.prepare(`
            SELECT
                mp.id,
                mp.name,
                mp.short_description,
                mp.status,
                (SELECT image_path FROM product_image WHERE master_product_id = mp.id AND is_primary = 1 LIMIT 1) as primary_image,
                (SELECT MIN(COALESCE(lp.discount_price, lp.price)) FROM lot_product lp WHERE lp.master_product_id = mp.id AND lp.status = 'active') as min_price,
                (SELECT MAX(lp.price) FROM lot_product lp WHERE lp.master_product_id = mp.id AND lp.status = 'active') as max_price,
                (SELECT GROUP_CONCAT(c.name, ', ') FROM category c JOIN product_category_mapping pcm ON c.id = pcm.category_id WHERE pcm.master_product_id = mp.id) as categories
            FROM master_product mp
            ${whereClause}
            ORDER BY mp.created_at DESC
            LIMIT ? OFFSET ?
        `).all(...params, limit, offset);

        res.json({
            products,
            pagination: { page, limit, total, totalPages: Math.ceil(total / limit) }
        });
    } catch (err) {
        console.error('Get products error:', err);
        res.status(500).json({ error: 'Failed to fetch products.' });
    }
});

// GET /api/products/:id
router.get('/:id', (req, res) => {
    try {
        const productId = parseInt(req.params.id);
        if (isNaN(productId)) return res.status(400).json({ error: 'Invalid product ID.' });

        const product = db.prepare("SELECT * FROM master_product WHERE id = ? AND status != 'deleted'").get(productId);

        if (!product) {
            return res.status(404).json({ error: 'Product not found.' });
        }

        const variants = db.prepare("SELECT * FROM lot_product WHERE master_product_id = ? AND status = 'active' ORDER BY price ASC").all(productId);
        const images = db.prepare('SELECT * FROM product_image WHERE master_product_id = ? ORDER BY sort_order ASC').all(productId);
        const categories = db.prepare(
            `SELECT c.id, c.name, c.slug FROM category c
             JOIN product_category_mapping pcm ON c.id = pcm.category_id
             WHERE pcm.master_product_id = ? AND c.status = 'active'`
        ).all(productId);

        res.json({
            ...product,
            variants,
            images,
            categories
        });
    } catch (err) {
        console.error('Get product detail error:', err);
        res.status(500).json({ error: 'Failed to fetch product details.' });
    }
});

module.exports = router;
