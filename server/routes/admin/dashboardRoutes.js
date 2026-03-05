const express = require('express');
const router = express.Router();
const { sql, poolPromise } = require('../../config/db');
const adminAuth = require('../../middleware/adminAuth');

router.use(adminAuth);

// GET /api/admin/dashboard
router.get('/', async (req, res) => {
    try {
        const pool = await poolPromise;

        const stats = await pool.request().query(`
            SELECT
                (SELECT COUNT(*) FROM orders) as total_orders,
                (SELECT COUNT(*) FROM orders WHERE order_status = 'placed') as pending_orders,
                (SELECT ISNULL(SUM(order_total), 0) FROM orders WHERE payment_status = 'paid') as total_revenue,
                (SELECT COUNT(*) FROM master_product WHERE status = 'active') as active_products,
                (SELECT COUNT(*) FROM customer) as total_customers,
                (SELECT COUNT(*) FROM category WHERE status = 'active') as active_categories
        `);

        const recentOrders = await pool.request().query(`
            SELECT TOP 5 o.id, o.order_number, o.order_total, o.order_status, o.payment_status, o.created_at,
                   c.first_name, c.last_name
            FROM orders o
            LEFT JOIN customer c ON c.id = o.customer_id
            ORDER BY o.created_at DESC
        `);

        res.json({ stats: stats.recordset[0], recent_orders: recentOrders.recordset });
    } catch (err) {
        console.error('Admin dashboard error:', err);
        res.status(500).json({ error: 'Failed to fetch dashboard data.' });
    }
});

module.exports = router;
