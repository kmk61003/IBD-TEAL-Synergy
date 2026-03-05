const express = require('express');
const router = express.Router();
const db = require('../../config/db');
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
router.get('/', (req, res) => {
    try {
        const page = Math.max(1, parseInt(req.query.page) || 1);
        const limit = Math.min(100, Math.max(1, parseInt(req.query.limit) || 20));
        const offset = (page - 1) * limit;

        const total = db.prepare("SELECT COUNT(*) as total FROM master_product WHERE status != 'deleted'").get().total;

        const products = db.prepare(`
            SELECT
                mp.*,
                (SELECT image_path FROM product_image WHERE master_product_id = mp.id AND is_primary = 1 LIMIT 1) as primary_image,
                (SELECT COUNT(*) FROM lot_product WHERE master_product_id = mp.id) as variant_count
            FROM master_product mp
            WHERE mp.status != 'deleted'
            ORDER BY mp.created_at DESC
            LIMIT ? OFFSET ?
        `).all(limit, offset);

        res.json({ products, pagination: { page, limit, total, totalPages: Math.ceil(total / limit) } });
    } catch (err) {
        console.error('Admin get products error:', err);
        res.status(500).json({ error: 'Failed to fetch products.' });
    }
});

// GET /api/admin/products/:id
router.get('/:id', (req, res) => {
    try {
        const id = parseInt(req.params.id);
        if (isNaN(id)) return res.status(400).json({ error: 'Invalid ID.' });

        const product = db.prepare("SELECT * FROM master_product WHERE id = ? AND status != 'deleted'").get(id);
        if (!product) return res.status(404).json({ error: 'Product not found.' });

        const variants = db.prepare('SELECT * FROM lot_product WHERE master_product_id = ? ORDER BY price').all(id);
        const images = db.prepare('SELECT * FROM product_image WHERE master_product_id = ? ORDER BY sort_order').all(id);
        const categories = db.prepare(
            `SELECT c.id, c.name, c.slug FROM category c
             JOIN product_category_mapping pcm ON c.id = pcm.category_id
             WHERE pcm.master_product_id = ?`
        ).all(id);

        res.json({ ...product, variants, images, categories });
    } catch (err) {
        console.error('Admin get product error:', err);
        res.status(500).json({ error: 'Failed to fetch product.' });
    }
});

// POST /api/admin/products — create master product
router.post('/', upload.array('images', 10), (req, res) => {
    try {
        const { name, description, short_description, category_ids } = req.body;

        if (!name) return res.status(400).json({ error: 'Product name is required.' });

        const result = db.prepare(
            'INSERT INTO master_product (name, description, short_description) VALUES (?, ?, ?)'
        ).run(name, description || null, short_description || null);

        const productId = result.lastInsertRowid;

        // Save images
        if (req.files && req.files.length > 0) {
            var insertImg = db.prepare('INSERT INTO product_image (master_product_id, image_path, sort_order, is_primary) VALUES (?, ?, ?, ?)');
            for (var i = 0; i < req.files.length; i++) {
                insertImg.run(productId, '/uploads/products/' + req.files[i].filename, i, i === 0 ? 1 : 0);
            }
        }

        // Category mappings
        if (category_ids) {
            var ids = Array.isArray(category_ids) ? category_ids : [category_ids];
            var insertCat = db.prepare('INSERT INTO product_category_mapping (category_id, master_product_id) VALUES (?, ?)');
            for (var j = 0; j < ids.length; j++) {
                insertCat.run(parseInt(ids[j]), productId);
            }
        }

        res.status(201).json({ message: 'Product created.', id: productId });
    } catch (err) {
        console.error('Admin create product error:', err);
        res.status(500).json({ error: 'Failed to create product.' });
    }
});

// PUT /api/admin/products/:id — update master product
router.put('/:id', upload.array('images', 10), (req, res) => {
    try {
        const id = parseInt(req.params.id);
        if (isNaN(id)) return res.status(400).json({ error: 'Invalid ID.' });

        const { name, description, short_description, status, category_ids } = req.body;

        db.prepare("UPDATE master_product SET name = ?, description = ?, short_description = ?, status = ?, updated_at = datetime('now') WHERE id = ?")
            .run(name, description || null, short_description || null, status || 'active', id);

        // Save new images if uploaded
        if (req.files && req.files.length > 0) {
            var maxSortRow = db.prepare('SELECT IFNULL(MAX(sort_order), -1) as max_sort FROM product_image WHERE master_product_id = ?').get(id);
            var sortOrder = maxSortRow.max_sort + 1;

            var insertImg = db.prepare('INSERT INTO product_image (master_product_id, image_path, sort_order, is_primary) VALUES (?, ?, ?, 0)');
            for (var k = 0; k < req.files.length; k++) {
                insertImg.run(id, '/uploads/products/' + req.files[k].filename, sortOrder++);
            }
        }

        // Update category mappings
        if (category_ids !== undefined) {
            db.prepare('DELETE FROM product_category_mapping WHERE master_product_id = ?').run(id);

            var ids = Array.isArray(category_ids) ? category_ids : category_ids ? [category_ids] : [];
            var insertCat = db.prepare('INSERT INTO product_category_mapping (category_id, master_product_id) VALUES (?, ?)');
            for (var m = 0; m < ids.length; m++) {
                insertCat.run(parseInt(ids[m]), id);
            }
        }

        res.json({ message: 'Product updated.' });
    } catch (err) {
        console.error('Admin update product error:', err);
        res.status(500).json({ error: 'Failed to update product.' });
    }
});

// DELETE /api/admin/products/:id — soft delete
router.delete('/:id', (req, res) => {
    try {
        const id = parseInt(req.params.id);
        if (isNaN(id)) return res.status(400).json({ error: 'Invalid ID.' });

        db.prepare("UPDATE master_product SET status = 'deleted', updated_at = datetime('now') WHERE id = ?").run(id);

        res.json({ message: 'Product deleted.' });
    } catch (err) {
        console.error('Admin delete product error:', err);
        res.status(500).json({ error: 'Failed to delete product.' });
    }
});

// POST /api/admin/products/:id/variants — add variant
router.post('/:id/variants', (req, res) => {
    try {
        const masterId = parseInt(req.params.id);
        const { sku, metal, size, weight, price, discount_price, inventory } = req.body;

        if (!sku || !price) return res.status(400).json({ error: 'SKU and price are required.' });

        const result = db.prepare(
            'INSERT INTO lot_product (master_product_id, sku, metal, size, weight, price, discount_price, inventory) VALUES (?, ?, ?, ?, ?, ?, ?, ?)'
        ).run(masterId, sku, metal || null, size || null, weight || null, price, discount_price || null, inventory || 0);

        res.status(201).json({ message: 'Variant created.', id: result.lastInsertRowid });
    } catch (err) {
        console.error('Admin create variant error:', err);
        res.status(500).json({ error: 'Failed to create variant.' });
    }
});

// PUT /api/admin/products/variants/:variantId — update variant
router.put('/variants/:variantId', (req, res) => {
    try {
        const variantId = parseInt(req.params.variantId);
        const { sku, metal, size, weight, price, discount_price, inventory, status } = req.body;

        db.prepare(
            "UPDATE lot_product SET sku = ?, metal = ?, size = ?, weight = ?, price = ?, discount_price = ?, inventory = ?, status = ?, updated_at = datetime('now') WHERE id = ?"
        ).run(sku, metal || null, size || null, weight || null, price, discount_price || null, inventory || 0, status || 'active', variantId);

        res.json({ message: 'Variant updated.' });
    } catch (err) {
        console.error('Admin update variant error:', err);
        res.status(500).json({ error: 'Failed to update variant.' });
    }
});

module.exports = router;
