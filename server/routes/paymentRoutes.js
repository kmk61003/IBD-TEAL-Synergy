const express = require('express');
const router = express.Router();
const { sql, poolPromise } = require('../config/db');

// POST /api/payment/process
router.post('/process', async (req, res) => {
    try {
        const { order_number } = req.body;

        if (!order_number) {
            return res.status(400).json({ error: 'order_number is required.' });
        }

        const pool = await poolPromise;

        const orderResult = await pool.request()
            .input('order_number', sql.VarChar(50), order_number)
            .query(`SELECT id, payment_status FROM orders WHERE order_number = @order_number`);

        if (orderResult.recordset.length === 0) {
            return res.status(404).json({ error: 'Order not found.' });
        }

        const order = orderResult.recordset[0];

        if (order.payment_status === 'paid') {
            return res.status(400).json({ error: 'Order already paid.' });
        }

        // Mock payment — always succeeds
        const transactionId = 'MOCK-' + Date.now() + '-' + Math.floor(Math.random() * 10000);

        await pool.request()
            .input('id', sql.Int, order.id)
            .query(`UPDATE orders SET payment_status = 'paid', order_status = 'confirmed', payment_method = 'mock_payment', updated_at = GETDATE() WHERE id = @id`);

        res.json({
            success: true,
            message: 'Payment processed successfully.',
            transaction_id: transactionId,
            order_number: order_number
        });
    } catch (err) {
        console.error('Payment process error:', err);
        res.status(500).json({ error: 'Payment processing failed.' });
    }
});

module.exports = router;
