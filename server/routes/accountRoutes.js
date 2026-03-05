const express = require('express');
const router = express.Router();
const bcrypt = require('bcryptjs');
const db = require('../config/db');
const auth = require('../middleware/auth');

router.use(auth);

// GET /api/account/profile
router.get('/profile', (req, res) => {
    try {
        var customer = db.prepare(
            'SELECT id, first_name, last_name, email, phone_no, address, created_at FROM customer WHERE id = ?'
        ).get(req.user.id);

        if (!customer) return res.status(404).json({ error: 'Customer not found.' });

        res.json(customer);
    } catch (err) {
        console.error('Get profile error:', err);
        res.status(500).json({ error: 'Failed to fetch profile.' });
    }
});

// PUT /api/account/profile
router.put('/profile', (req, res) => {
    try {
        var { first_name, last_name, phone_no, address } = req.body;

        if (!first_name) return res.status(400).json({ error: 'First name is required.' });

        db.prepare(
            "UPDATE customer SET first_name = ?, last_name = ?, phone_no = ?, address = ?, updated_at = datetime('now') WHERE id = ?"
        ).run(first_name, last_name || null, phone_no || null, address || null, req.user.id);

        res.json({ message: 'Profile updated.' });
    } catch (err) {
        console.error('Update profile error:', err);
        res.status(500).json({ error: 'Failed to update profile.' });
    }
});

// PUT /api/account/password
router.put('/password', async (req, res) => {
    try {
        var { current_password, new_password } = req.body;

        if (!current_password || !new_password) {
            return res.status(400).json({ error: 'Current and new passwords are required.' });
        }
        if (new_password.length < 6) {
            return res.status(400).json({ error: 'New password must be at least 6 characters.' });
        }

        var customer = db.prepare('SELECT password_hash FROM customer WHERE id = ?').get(req.user.id);
        if (!customer) return res.status(404).json({ error: 'Customer not found.' });

        var valid = await bcrypt.compare(current_password, customer.password_hash);
        if (!valid) return res.status(401).json({ error: 'Current password is incorrect.' });

        var newHash = await bcrypt.hash(new_password, 10);
        db.prepare("UPDATE customer SET password_hash = ?, updated_at = datetime('now') WHERE id = ?").run(newHash, req.user.id);

        res.json({ message: 'Password changed successfully.' });
    } catch (err) {
        console.error('Change password error:', err);
        res.status(500).json({ error: 'Failed to change password.' });
    }
});

// GET /api/account/orders
router.get('/orders', (req, res) => {
    try {
        var orders = db.prepare(
            'SELECT id, order_number, order_total, order_status, payment_status, created_at FROM orders WHERE customer_id = ? ORDER BY created_at DESC'
        ).all(req.user.id);

        // Attach item count per order
        for (var i = 0; i < orders.length; i++) {
            var count = db.prepare('SELECT COUNT(*) as cnt FROM order_items WHERE order_id = ?').get(orders[i].id);
            orders[i].item_count = count ? count.cnt : 0;
        }

        res.json(orders);
    } catch (err) {
        console.error('Get orders error:', err);
        res.status(500).json({ error: 'Failed to fetch orders.' });
    }
});

// GET /api/account/orders/:id
router.get('/orders/:id', (req, res) => {
    try {
        var orderId = parseInt(req.params.id);
        if (isNaN(orderId)) return res.status(400).json({ error: 'Invalid order ID.' });

        var order = db.prepare('SELECT * FROM orders WHERE id = ? AND customer_id = ?').get(orderId, req.user.id);
        if (!order) return res.status(404).json({ error: 'Order not found.' });

        var items = db.prepare('SELECT * FROM order_items WHERE order_id = ?').all(orderId);

        res.json({ order: order, items: items });
    } catch (err) {
        console.error('Get order detail error:', err);
        res.status(500).json({ error: 'Failed to fetch order details.' });
    }
});

// GET /api/account/saved
router.get('/saved', (req, res) => {
    try {
        var items = db.prepare(
            "SELECT si.id, si.master_product_id, si.created_at, mp.name, mp.short_description, mp.status, \
             (SELECT image_path FROM product_image WHERE master_product_id = mp.id AND is_primary = 1 LIMIT 1) as primary_image, \
             (SELECT MIN(COALESCE(lp.discount_price, lp.price)) FROM lot_product lp WHERE lp.master_product_id = mp.id AND lp.status = 'active') as min_price \
             FROM saved_item si JOIN master_product mp ON mp.id = si.master_product_id \
             WHERE si.customer_id = ? ORDER BY si.created_at DESC"
        ).all(req.user.id);

        res.json(items);
    } catch (err) {
        console.error('Get saved items error:', err);
        res.status(500).json({ error: 'Failed to fetch saved items.' });
    }
});

// POST /api/account/saved
router.post('/saved', (req, res) => {
    try {
        var productId = parseInt(req.body.master_product_id);
        if (isNaN(productId)) return res.status(400).json({ error: 'Invalid product ID.' });

        var existing = db.prepare('SELECT id FROM saved_item WHERE customer_id = ? AND master_product_id = ?').get(req.user.id, productId);
        if (existing) return res.json({ message: 'Already saved.', id: existing.id });

        var result = db.prepare('INSERT INTO saved_item (customer_id, master_product_id) VALUES (?, ?)').run(req.user.id, productId);

        res.status(201).json({ message: 'Item saved.', id: result.lastInsertRowid });
    } catch (err) {
        console.error('Save item error:', err);
        res.status(500).json({ error: 'Failed to save item.' });
    }
});

// DELETE /api/account/saved/:productId
router.delete('/saved/:productId', (req, res) => {
    try {
        var productId = parseInt(req.params.productId);
        if (isNaN(productId)) return res.status(400).json({ error: 'Invalid product ID.' });

        db.prepare('DELETE FROM saved_item WHERE customer_id = ? AND master_product_id = ?').run(req.user.id, productId);

        res.json({ message: 'Item removed.' });
    } catch (err) {
        console.error('Remove saved item error:', err);
        res.status(500).json({ error: 'Failed to remove item.' });
    }
});

// GET /api/account/saved/check/:productId
router.get('/saved/check/:productId', (req, res) => {
    try {
        var productId = parseInt(req.params.productId);
        if (isNaN(productId)) return res.status(400).json({ error: 'Invalid product ID.' });

        var existing = db.prepare('SELECT id FROM saved_item WHERE customer_id = ? AND master_product_id = ?').get(req.user.id, productId);

        res.json({ saved: !!existing });
    } catch (err) {
        console.error('Check saved error:', err);
        res.status(500).json({ error: 'Failed to check saved status.' });
    }
});

module.exports = router;
