const express = require('express');
const router = express.Router();
const { sql, poolPromise } = require('../../config/db');
const adminAuth = require('../../middleware/adminAuth');

router.use(adminAuth);

// GET /api/admin/orders?status=placed&page=1
router.get('/', async (req, res) => {
    try {
        const pool = await poolPromise;
        const page = Math.max(1, parseInt(req.query.page) || 1);
        const limit = Math.min(100, Math.max(1, parseInt(req.query.limit) || 20));
        const offset = (page - 1) * limit;
        const status = req.query.status || null;

        let whereClause = 'WHERE 1=1';
        const request = pool.request();

        if (status) {
            whereClause += ' AND o.order_status = @status';
            request.input('status', sql.VarChar(20), status);
        }

        const countResult = await pool.request()
            .query(`SELECT COUNT(*) as total FROM orders o ${status ? `WHERE o.order_status = '${status}'` : ''}`);

        // Use separate request for count with proper parameterization
        const countReq = pool.request();
        let countWhere = '';
        if (status) {
            countWhere = ' WHERE order_status = @status';
            countReq.input('status', sql.VarChar(20), status);
        }
        const total = (await countReq.query(`SELECT COUNT(*) as total FROM orders${countWhere}`)).recordset[0].total;

        request.input('offset', sql.Int, offset);
        request.input('limit', sql.Int, limit);

        const result = await request.query(`
            SELECT
                o.*,
                c.first_name as customer_first_name,
                c.last_name as customer_last_name,
                c.email as customer_email,
                (SELECT COUNT(*) FROM order_items WHERE order_id = o.id) as item_count
            FROM orders o
            LEFT JOIN customer c ON c.id = o.customer_id
            ${whereClause}
            ORDER BY o.created_at DESC
            OFFSET @offset ROWS FETCH NEXT @limit ROWS ONLY
        `);

        res.json({ orders: result.recordset, pagination: { page, limit, total, totalPages: Math.ceil(total / limit) } });
    } catch (err) {
        console.error('Admin get orders error:', err);
        res.status(500).json({ error: 'Failed to fetch orders.' });
    }
});

// GET /api/admin/orders/:id
router.get('/:id', async (req, res) => {
    try {
        const id = parseInt(req.params.id);
        const pool = await poolPromise;

        const order = await pool.request().input('id', sql.Int, id)
            .query(`SELECT o.*, c.first_name as customer_first_name, c.last_name as customer_last_name, c.email as customer_email
                    FROM orders o LEFT JOIN customer c ON c.id = o.customer_id WHERE o.id = @id`);

        if (order.recordset.length === 0) return res.status(404).json({ error: 'Order not found.' });

        const items = await pool.request().input('order_id', sql.Int, id)
            .query('SELECT * FROM order_items WHERE order_id = @order_id');

        res.json({ ...order.recordset[0], items: items.recordset });
    } catch (err) {
        console.error('Admin get order error:', err);
        res.status(500).json({ error: 'Failed to fetch order.' });
    }
});

// PUT /api/admin/orders/:id — update status
router.put('/:id', async (req, res) => {
    try {
        const id = parseInt(req.params.id);
        const { order_status, payment_status } = req.body;

        const pool = await poolPromise;
        const request = pool.request().input('id', sql.Int, id);

        let updates = ['updated_at = GETDATE()'];
        if (order_status) {
            request.input('order_status', sql.VarChar(20), order_status);
            updates.push('order_status = @order_status');
        }
        if (payment_status) {
            request.input('payment_status', sql.VarChar(20), payment_status);
            updates.push('payment_status = @payment_status');
        }

        await request.query(`UPDATE orders SET ${updates.join(', ')} WHERE id = @id`);

        res.json({ message: 'Order updated.' });
    } catch (err) {
        console.error('Admin update order error:', err);
        res.status(500).json({ error: 'Failed to update order.' });
    }
});

module.exports = router;
