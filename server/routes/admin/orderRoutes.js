const express = require('express');
const router = express.Router();
const db = require('../../config/db');
const adminAuth = require('../../middleware/adminAuth');

router.use(adminAuth);

// GET /api/admin/orders?status=placed&page=1
router.get('/', (req, res) => {
    try {
        const page = Math.max(1, parseInt(req.query.page) || 1);
        const limit = Math.min(100, Math.max(1, parseInt(req.query.limit) || 20));
        const offset = (page - 1) * limit;
        const status = req.query.status || null;

        let countWhere = '';
        let where = 'WHERE 1=1';
        const countParams = [];
        const params = [];

        if (status) {
            countWhere = ' WHERE order_status = ?';
            where += ' AND o.order_status = ?';
            countParams.push(status);
            params.push(status);
        }

        const total = db.prepare('SELECT COUNT(*) as total FROM orders' + countWhere).get(...countParams).total;

        const orders = db.prepare(`
            SELECT
                o.*,
                c.first_name as customer_first_name,
                c.last_name as customer_last_name,
                c.email as customer_email,
                (SELECT COUNT(*) FROM order_items WHERE order_id = o.id) as item_count
            FROM orders o
            LEFT JOIN customer c ON c.id = o.customer_id
            ${where}
            ORDER BY o.created_at DESC
            LIMIT ? OFFSET ?
        `).all(...params, limit, offset);

        res.json({ orders, pagination: { page, limit, total, totalPages: Math.ceil(total / limit) } });
    } catch (err) {
        console.error('Admin get orders error:', err);
        res.status(500).json({ error: 'Failed to fetch orders.' });
    }
});

// GET /api/admin/orders/:id
router.get('/:id', (req, res) => {
    try {
        const id = parseInt(req.params.id);

        const order = db.prepare(
            `SELECT o.*, c.first_name as customer_first_name, c.last_name as customer_last_name, c.email as customer_email
             FROM orders o LEFT JOIN customer c ON c.id = o.customer_id WHERE o.id = ?`
        ).get(id);

        if (!order) return res.status(404).json({ error: 'Order not found.' });

        const items = db.prepare('SELECT * FROM order_items WHERE order_id = ?').all(id);

        res.json({ ...order, items });
    } catch (err) {
        console.error('Admin get order error:', err);
        res.status(500).json({ error: 'Failed to fetch order.' });
    }
});

// PUT /api/admin/orders/:id — update status
router.put('/:id', (req, res) => {
    try {
        const id = parseInt(req.params.id);
        const { order_status, payment_status } = req.body;

        var updates = ["updated_at = datetime('now')"];
        var params = [];
        if (order_status) {
            updates.push('order_status = ?');
            params.push(order_status);
        }
        if (payment_status) {
            updates.push('payment_status = ?');
            params.push(payment_status);
        }
        params.push(id);

        db.prepare('UPDATE orders SET ' + updates.join(', ') + ' WHERE id = ?').run(...params);

        res.json({ message: 'Order updated.' });
    } catch (err) {
        console.error('Admin update order error:', err);
        res.status(500).json({ error: 'Failed to update order.' });
    }
});

module.exports = router;
