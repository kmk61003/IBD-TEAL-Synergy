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

        // Record a product view
        db.prepare('INSERT INTO product_view (master_product_id) VALUES (?)').run(productId);

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

// GET /api/products/:id/recommendations/bestsellers
// Best sellers from the same categories, based on order_items sold in last 30 days
router.get('/:id/recommendations/bestsellers', (req, res) => {
    try {
        var productId = parseInt(req.params.id);
        if (isNaN(productId)) return res.status(400).json({ error: 'Invalid product ID.' });
        var limit = Math.min(20, Math.max(1, parseInt(req.query.limit) || 10));

        // Get categories of current product
        var catIds = db.prepare(
            'SELECT category_id FROM product_category_mapping WHERE master_product_id = ?'
        ).all(productId).map(function(r) { return r.category_id; });

        if (catIds.length === 0) {
            return res.json([]);
        }

        var placeholders = catIds.map(function() { return '?'; }).join(',');

        // Find best-selling products in same categories from last 30 days
        var bestsellers = db.prepare(
            "SELECT mp.id, mp.name, mp.short_description, \
             (SELECT image_path FROM product_image WHERE master_product_id = mp.id AND is_primary = 1 LIMIT 1) as primary_image, \
             (SELECT MIN(COALESCE(lp2.discount_price, lp2.price)) FROM lot_product lp2 WHERE lp2.master_product_id = mp.id AND lp2.status = 'active') as min_price, \
             (SELECT MAX(lp2.price) FROM lot_product lp2 WHERE lp2.master_product_id = mp.id AND lp2.status = 'active') as max_price, \
             SUM(oi.quantity) as total_sold \
             FROM order_items oi \
             JOIN lot_product lp ON lp.id = oi.lot_product_id \
             JOIN master_product mp ON mp.id = lp.master_product_id \
             JOIN orders o ON o.id = oi.order_id \
             WHERE mp.status = 'active' \
             AND mp.id != ? \
             AND o.created_at >= datetime('now', '-30 days') \
             AND o.payment_status = 'paid' \
             AND EXISTS (SELECT 1 FROM product_category_mapping pcm WHERE pcm.master_product_id = mp.id AND pcm.category_id IN (" + placeholders + ")) \
             GROUP BY mp.id \
             ORDER BY total_sold DESC \
             LIMIT ?"
        ).all.apply(null, [productId].concat(catIds, [limit]));

        res.json(bestsellers);
    } catch (err) {
        console.error('Bestsellers recommendation error:', err);
        res.status(500).json({ error: 'Failed to fetch bestseller recommendations.' });
    }
});

// GET /api/products/:id/recommendations/similar
// Similar products from same categories with highest views in last 30 days
router.get('/:id/recommendations/similar', (req, res) => {
    try {
        var productId = parseInt(req.params.id);
        if (isNaN(productId)) return res.status(400).json({ error: 'Invalid product ID.' });
        var limit = Math.min(20, Math.max(1, parseInt(req.query.limit) || 10));

        // Get categories of current product
        var catIds = db.prepare(
            'SELECT category_id FROM product_category_mapping WHERE master_product_id = ?'
        ).all(productId).map(function(r) { return r.category_id; });

        if (catIds.length === 0) {
            return res.json([]);
        }

        var placeholders = catIds.map(function() { return '?'; }).join(',');

        // Find similar products from same categories with most views in last 30 days
        var similar = db.prepare(
            "SELECT mp.id, mp.name, mp.short_description, \
             (SELECT image_path FROM product_image WHERE master_product_id = mp.id AND is_primary = 1 LIMIT 1) as primary_image, \
             (SELECT MIN(COALESCE(lp.discount_price, lp.price)) FROM lot_product lp WHERE lp.master_product_id = mp.id AND lp.status = 'active') as min_price, \
             (SELECT MAX(lp.price) FROM lot_product lp WHERE lp.master_product_id = mp.id AND lp.status = 'active') as max_price, \
             IFNULL(pv.view_count, 0) as view_count \
             FROM master_product mp \
             LEFT JOIN (SELECT master_product_id, COUNT(*) as view_count FROM product_view WHERE viewed_at >= datetime('now', '-30 days') GROUP BY master_product_id) pv \
               ON pv.master_product_id = mp.id \
             WHERE mp.status = 'active' \
             AND mp.id != ? \
             AND EXISTS (SELECT 1 FROM product_category_mapping pcm WHERE pcm.master_product_id = mp.id AND pcm.category_id IN (" + placeholders + ")) \
             ORDER BY view_count DESC, mp.created_at DESC \
             LIMIT ?"
        ).all.apply(null, [productId].concat(catIds, [limit]));

        res.json(similar);
    } catch (err) {
        console.error('Similar products recommendation error:', err);
        res.status(500).json({ error: 'Failed to fetch similar product recommendations.' });
    }
});

module.exports = router;
