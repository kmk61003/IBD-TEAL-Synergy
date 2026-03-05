const express = require('express');
const router = express.Router();
const { sql, poolPromise } = require('../../config/db');
const adminAuth = require('../../middleware/adminAuth');
const multer = require('multer');
const path = require('path');

// Multer config for product images
const storage = multer.diskStorage({
    destination: (req, file, cb) => {
        cb(null, path.join(__dirname, '..', '..', 'uploads', 'products'));
    },
    filename: (req, file, cb) => {
        const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
        cb(null, uniqueSuffix + path.extname(file.originalname));
    }
});
const upload = multer({
    storage,
    fileFilter: (req, file, cb) => {
        const allowed = ['.jpg', '.jpeg', '.png', '.gif', '.webp'];
        const ext = path.extname(file.originalname).toLowerCase();
        if (allowed.includes(ext)) {
            cb(null, true);
        } else {
            cb(new Error('Only image files are allowed.'));
        }
    },
    limits: { fileSize: 5 * 1024 * 1024 } // 5MB
});

router.use(adminAuth);

// GET /api/admin/products — list all products
router.get('/', async (req, res) => {
    try {
        const pool = await poolPromise;
        const page = Math.max(1, parseInt(req.query.page) || 1);
        const limit = Math.min(100, Math.max(1, parseInt(req.query.limit) || 20));
        const offset = (page - 1) * limit;

        const countResult = await pool.request()
            .query(`SELECT COUNT(*) as total FROM master_product WHERE status != 'deleted'`);
        const total = countResult.recordset[0].total;

        const result = await pool.request()
            .input('offset', sql.Int, offset)
            .input('limit', sql.Int, limit)
            .query(`
                SELECT
                    mp.*,
                    (SELECT TOP 1 image_path FROM product_image WHERE master_product_id = mp.id AND is_primary = 1) as primary_image,
                    (SELECT COUNT(*) FROM lot_product WHERE master_product_id = mp.id) as variant_count
                FROM master_product mp
                WHERE mp.status != 'deleted'
                ORDER BY mp.created_at DESC
                OFFSET @offset ROWS FETCH NEXT @limit ROWS ONLY
            `);

        res.json({ products: result.recordset, pagination: { page, limit, total, totalPages: Math.ceil(total / limit) } });
    } catch (err) {
        console.error('Admin get products error:', err);
        res.status(500).json({ error: 'Failed to fetch products.' });
    }
});

// GET /api/admin/products/:id
router.get('/:id', async (req, res) => {
    try {
        const id = parseInt(req.params.id);
        if (isNaN(id)) return res.status(400).json({ error: 'Invalid ID.' });

        const pool = await poolPromise;
        const product = await pool.request().input('id', sql.Int, id)
            .query(`SELECT * FROM master_product WHERE id = @id AND status != 'deleted'`);

        if (product.recordset.length === 0) return res.status(404).json({ error: 'Product not found.' });

        const variants = await pool.request().input('id', sql.Int, id)
            .query('SELECT * FROM lot_product WHERE master_product_id = @id ORDER BY price');

        const images = await pool.request().input('id', sql.Int, id)
            .query('SELECT * FROM product_image WHERE master_product_id = @id ORDER BY sort_order');

        const categories = await pool.request().input('id', sql.Int, id)
            .query(`SELECT c.id, c.name, c.slug FROM category c
                    JOIN product_category_mapping pcm ON c.id = pcm.category_id
                    WHERE pcm.master_product_id = @id`);

        res.json({ ...product.recordset[0], variants: variants.recordset, images: images.recordset, categories: categories.recordset });
    } catch (err) {
        console.error('Admin get product error:', err);
        res.status(500).json({ error: 'Failed to fetch product.' });
    }
});

// POST /api/admin/products — create master product
router.post('/', upload.array('images', 10), async (req, res) => {
    try {
        const { name, description, short_description, category_ids } = req.body;

        if (!name) return res.status(400).json({ error: 'Product name is required.' });

        const pool = await poolPromise;
        const result = await pool.request()
            .input('name', sql.NVarChar(255), name)
            .input('description', sql.NVarChar(sql.MAX), description || null)
            .input('short_description', sql.NVarChar(500), short_description || null)
            .query(`INSERT INTO master_product (name, description, short_description)
                    OUTPUT INSERTED.id VALUES (@name, @description, @short_description)`);

        const productId = result.recordset[0].id;

        // Save images
        if (req.files && req.files.length > 0) {
            for (let i = 0; i < req.files.length; i++) {
                await pool.request()
                    .input('master_product_id', sql.Int, productId)
                    .input('image_path', sql.NVarChar(500), '/uploads/products/' + req.files[i].filename)
                    .input('sort_order', sql.Int, i)
                    .input('is_primary', sql.Bit, i === 0 ? 1 : 0)
                    .query('INSERT INTO product_image (master_product_id, image_path, sort_order, is_primary) VALUES (@master_product_id, @image_path, @sort_order, @is_primary)');
            }
        }

        // Category mappings
        if (category_ids) {
            const ids = Array.isArray(category_ids) ? category_ids : [category_ids];
            for (const catId of ids) {
                await pool.request()
                    .input('category_id', sql.Int, parseInt(catId))
                    .input('master_product_id', sql.Int, productId)
                    .query('INSERT INTO product_category_mapping (category_id, master_product_id) VALUES (@category_id, @master_product_id)');
            }
        }

        res.status(201).json({ message: 'Product created.', id: productId });
    } catch (err) {
        console.error('Admin create product error:', err);
        res.status(500).json({ error: 'Failed to create product.' });
    }
});

// PUT /api/admin/products/:id — update master product
router.put('/:id', upload.array('images', 10), async (req, res) => {
    try {
        const id = parseInt(req.params.id);
        if (isNaN(id)) return res.status(400).json({ error: 'Invalid ID.' });

        const { name, description, short_description, status, category_ids } = req.body;
        const pool = await poolPromise;

        await pool.request()
            .input('id', sql.Int, id)
            .input('name', sql.NVarChar(255), name)
            .input('description', sql.NVarChar(sql.MAX), description || null)
            .input('short_description', sql.NVarChar(500), short_description || null)
            .input('status', sql.VarChar(20), status || 'active')
            .query(`UPDATE master_product SET name = @name, description = @description, short_description = @short_description, status = @status, updated_at = GETDATE() WHERE id = @id`);

        // Save new images if uploaded
        if (req.files && req.files.length > 0) {
            const maxSort = await pool.request().input('id', sql.Int, id)
                .query('SELECT ISNULL(MAX(sort_order), -1) as max_sort FROM product_image WHERE master_product_id = @id');
            let sortOrder = maxSort.recordset[0].max_sort + 1;

            for (const file of req.files) {
                await pool.request()
                    .input('master_product_id', sql.Int, id)
                    .input('image_path', sql.NVarChar(500), '/uploads/products/' + file.filename)
                    .input('sort_order', sql.Int, sortOrder++)
                    .input('is_primary', sql.Bit, 0)
                    .query('INSERT INTO product_image (master_product_id, image_path, sort_order, is_primary) VALUES (@master_product_id, @image_path, @sort_order, @is_primary)');
            }
        }

        // Update category mappings
        if (category_ids !== undefined) {
            await pool.request().input('id', sql.Int, id)
                .query('DELETE FROM product_category_mapping WHERE master_product_id = @id');

            const ids = Array.isArray(category_ids) ? category_ids : category_ids ? [category_ids] : [];
            for (const catId of ids) {
                await pool.request()
                    .input('category_id', sql.Int, parseInt(catId))
                    .input('master_product_id', sql.Int, id)
                    .query('INSERT INTO product_category_mapping (category_id, master_product_id) VALUES (@category_id, @master_product_id)');
            }
        }

        res.json({ message: 'Product updated.' });
    } catch (err) {
        console.error('Admin update product error:', err);
        res.status(500).json({ error: 'Failed to update product.' });
    }
});

// DELETE /api/admin/products/:id — soft delete
router.delete('/:id', async (req, res) => {
    try {
        const id = parseInt(req.params.id);
        if (isNaN(id)) return res.status(400).json({ error: 'Invalid ID.' });

        const pool = await poolPromise;
        await pool.request().input('id', sql.Int, id)
            .query(`UPDATE master_product SET status = 'deleted', updated_at = GETDATE() WHERE id = @id`);

        res.json({ message: 'Product deleted.' });
    } catch (err) {
        console.error('Admin delete product error:', err);
        res.status(500).json({ error: 'Failed to delete product.' });
    }
});

// POST /api/admin/products/:id/variants — add variant
router.post('/:id/variants', async (req, res) => {
    try {
        const masterId = parseInt(req.params.id);
        const { sku, metal, size, weight, price, discount_price, inventory } = req.body;

        if (!sku || !price) return res.status(400).json({ error: 'SKU and price are required.' });

        const pool = await poolPromise;
        const result = await pool.request()
            .input('master_product_id', sql.Int, masterId)
            .input('sku', sql.VarChar(100), sku)
            .input('metal', sql.NVarChar(100), metal || null)
            .input('size', sql.NVarChar(50), size || null)
            .input('weight', sql.Decimal(10, 3), weight || null)
            .input('price', sql.Decimal(12, 2), price)
            .input('discount_price', sql.Decimal(12, 2), discount_price || null)
            .input('inventory', sql.Int, inventory || 0)
            .query(`INSERT INTO lot_product (master_product_id, sku, metal, size, weight, price, discount_price, inventory)
                    OUTPUT INSERTED.id VALUES (@master_product_id, @sku, @metal, @size, @weight, @price, @discount_price, @inventory)`);

        res.status(201).json({ message: 'Variant created.', id: result.recordset[0].id });
    } catch (err) {
        console.error('Admin create variant error:', err);
        res.status(500).json({ error: 'Failed to create variant.' });
    }
});

// PUT /api/admin/products/variants/:variantId — update variant
router.put('/variants/:variantId', async (req, res) => {
    try {
        const variantId = parseInt(req.params.variantId);
        const { sku, metal, size, weight, price, discount_price, inventory, status } = req.body;

        const pool = await poolPromise;
        await pool.request()
            .input('id', sql.Int, variantId)
            .input('sku', sql.VarChar(100), sku)
            .input('metal', sql.NVarChar(100), metal || null)
            .input('size', sql.NVarChar(50), size || null)
            .input('weight', sql.Decimal(10, 3), weight || null)
            .input('price', sql.Decimal(12, 2), price)
            .input('discount_price', sql.Decimal(12, 2), discount_price || null)
            .input('inventory', sql.Int, inventory || 0)
            .input('status', sql.VarChar(20), status || 'active')
            .query(`UPDATE lot_product SET sku = @sku, metal = @metal, size = @size, weight = @weight, price = @price,
                    discount_price = @discount_price, inventory = @inventory, status = @status, updated_at = GETDATE() WHERE id = @id`);

        res.json({ message: 'Variant updated.' });
    } catch (err) {
        console.error('Admin update variant error:', err);
        res.status(500).json({ error: 'Failed to update variant.' });
    }
});

module.exports = router;
