const express = require('express');
const router = express.Router();
const { sql, poolPromise } = require('../config/db');

// GET /api/products?category=slug&page=1&limit=12&search=keyword
router.get('/', async (req, res) => {
    try {
        const pool = await poolPromise;
        const page = Math.max(1, parseInt(req.query.page) || 1);
        const limit = Math.min(50, Math.max(1, parseInt(req.query.limit) || 12));
        const offset = (page - 1) * limit;
        const category = req.query.category || null;
        const search = req.query.search || null;

        let whereClause = "WHERE mp.status = 'active'";
        const request = pool.request();

        if (category) {
            whereClause += ` AND EXISTS (
                SELECT 1 FROM product_category_mapping pcm
                JOIN category c ON c.id = pcm.category_id
                WHERE pcm.master_product_id = mp.id AND c.slug = @category AND c.status = 'active'
            )`;
            request.input('category', sql.VarChar(255), category);
        }

        if (search) {
            whereClause += ` AND (mp.name LIKE @search OR mp.short_description LIKE @search)`;
            request.input('search', sql.NVarChar(255), `%${search}%`);
        }

        // Count total
        const countResult = await request.query(
            `SELECT COUNT(*) as total FROM master_product mp ${whereClause}`
        );
        const total = countResult.recordset[0].total;

        // Fetch products with primary image and price range
        const request2 = pool.request();
        if (category) request2.input('category', sql.VarChar(255), category);
        if (search) request2.input('search', sql.NVarChar(255), `%${search}%`);
        request2.input('offset', sql.Int, offset);
        request2.input('limit', sql.Int, limit);

        const result = await request2.query(`
            SELECT
                mp.id,
                mp.name,
                mp.short_description,
                mp.status,
                (SELECT TOP 1 image_path FROM product_image WHERE master_product_id = mp.id AND is_primary = 1) as primary_image,
                (SELECT MIN(COALESCE(lp.discount_price, lp.price)) FROM lot_product lp WHERE lp.master_product_id = mp.id AND lp.status = 'active') as min_price,
                (SELECT MAX(lp.price) FROM lot_product lp WHERE lp.master_product_id = mp.id AND lp.status = 'active') as max_price,
                (SELECT STRING_AGG(c.name, ', ') FROM category c JOIN product_category_mapping pcm ON c.id = pcm.category_id WHERE pcm.master_product_id = mp.id) as categories
            FROM master_product mp
            ${whereClause}
            ORDER BY mp.created_at DESC
            OFFSET @offset ROWS FETCH NEXT @limit ROWS ONLY
        `);

        res.json({
            products: result.recordset,
            pagination: { page, limit, total, totalPages: Math.ceil(total / limit) }
        });
    } catch (err) {
        console.error('Get products error:', err);
        res.status(500).json({ error: 'Failed to fetch products.' });
    }
});

// GET /api/products/:id
router.get('/:id', async (req, res) => {
    try {
        const productId = parseInt(req.params.id);
        if (isNaN(productId)) return res.status(400).json({ error: 'Invalid product ID.' });

        const pool = await poolPromise;

        // Master product
        const productResult = await pool.request()
            .input('id', sql.Int, productId)
            .query(`SELECT * FROM master_product WHERE id = @id AND status != 'deleted'`);

        if (productResult.recordset.length === 0) {
            return res.status(404).json({ error: 'Product not found.' });
        }

        const product = productResult.recordset[0];

        // Lot products (variants)
        const variantsResult = await pool.request()
            .input('masterProductId', sql.Int, productId)
            .query(`SELECT * FROM lot_product WHERE master_product_id = @masterProductId AND status = 'active' ORDER BY price ASC`);

        // Images
        const imagesResult = await pool.request()
            .input('masterProductId', sql.Int, productId)
            .query(`SELECT * FROM product_image WHERE master_product_id = @masterProductId ORDER BY sort_order ASC`);

        // Categories
        const categoriesResult = await pool.request()
            .input('masterProductId', sql.Int, productId)
            .query(`SELECT c.id, c.name, c.slug FROM category c
                    JOIN product_category_mapping pcm ON c.id = pcm.category_id
                    WHERE pcm.master_product_id = @masterProductId AND c.status = 'active'`);

        res.json({
            ...product,
            variants: variantsResult.recordset,
            images: imagesResult.recordset,
            categories: categoriesResult.recordset
        });
    } catch (err) {
        console.error('Get product detail error:', err);
        res.status(500).json({ error: 'Failed to fetch product details.' });
    }
});

module.exports = router;
