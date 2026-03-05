const express = require('express');
const router = express.Router();
const db = require('../config/db');

// POST /api/payment/process
router.post('/process', (req, res) => {
    try {
        const { order_number, payment_method } = req.body;

        if (!order_number) {
            return res.status(400).json({ error: 'order_number is required.' });
        }

        const order = db.prepare('SELECT id, payment_status FROM orders WHERE order_number = ?').get(order_number);

        if (!order) {
            return res.status(404).json({ error: 'Order not found.' });
        }

        if (order.payment_status === 'paid') {
            return res.status(400).json({ error: 'Order already paid.' });
        }

        // Simulated payment gateway processing
        var method = payment_method || 'card';
        var prefix = method === 'upi' ? 'UPI' : method === 'netbanking' ? 'NB' : 'TXN';
        var transactionId = prefix + '-' + Date.now() + '-' + Math.floor(Math.random() * 10000);

        db.prepare(
            "UPDATE orders SET payment_status = 'paid', order_status = 'confirmed', payment_method = ?, updated_at = datetime('now') WHERE id = ?"
        ).run(method, order.id);

        res.json({
            success: true,
            message: 'Payment processed successfully.',
            transaction_id: transactionId,
            payment_method: method,
            order_number: order_number
        });
    } catch (err) {
        console.error('Payment process error:', err);
        res.status(500).json({ error: 'Payment processing failed.' });
    }
});

module.exports = router;
