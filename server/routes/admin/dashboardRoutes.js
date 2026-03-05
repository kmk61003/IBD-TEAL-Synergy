const express = require('express');
const router = express.Router();
const db = require('../../config/db');
const adminAuth = require('../../middleware/adminAuth');

router.use(adminAuth);

// GET /api/admin/dashboard
router.get('/', (req, res) => {
    try {
        const stats = db.prepare(`
            SELECT
                (SELECT COUNT(*) FROM orders) as total_orders,
                (SELECT COUNT(*) FROM orders WHERE order_status = 'placed') as pending_orders,
                (SELECT IFNULL(SUM(order_total), 0) FROM orders WHERE payment_status = 'paid') as total_revenue,
                (SELECT COUNT(*) FROM master_product WHERE status = 'active') as active_products,
                (SELECT COUNT(*) FROM customer) as total_customers,
                (SELECT COUNT(*) FROM category WHERE status = 'active') as active_categories
        `).get();

        const recent_orders = db.prepare(`
            SELECT o.id, o.order_number, o.order_total, o.order_status, o.payment_status, o.created_at,
                   c.first_name, c.last_name
            FROM orders o
            LEFT JOIN customer c ON c.id = o.customer_id
            ORDER BY o.created_at DESC
            LIMIT 5
        `).all();

        res.json({ stats, recent_orders });
    } catch (err) {
        console.error('Admin dashboard error:', err);
        res.status(500).json({ error: 'Failed to fetch dashboard data.' });
    }
});

module.exports = router;
