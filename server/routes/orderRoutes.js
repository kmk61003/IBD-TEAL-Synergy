const express = require('express');
const router = express.Router();
const db = require('../config/db');
const jwt = require('jsonwebtoken');

// Optional auth
function optionalAuth(req, res, next) {
    const header = req.headers.authorization;
    if (header && header.startsWith('Bearer ')) {
        try {
            const token = header.split(' ')[1];
            req.user = jwt.verify(token, process.env.JWT_SECRET);
        } catch (e) { /* ignore */ }
    }
    next();
}

router.use(optionalAuth);

// Helper: generate order number
function generateOrderNumber() {
    const now = new Date();
    const date = now.toISOString().slice(0, 10).replace(/-/g, '');
    const rand = Math.floor(1000 + Math.random() * 9000);
    return 'ORD-' + date + '-' + rand;
}

// POST /api/orders
router.post('/', (req, res) => {
    try {
        const {
            bill_fname, bill_lname, bill_address1, bill_country_code, bill_pincode, bill_phone, bill_email,
            ship_fname, ship_lname, ship_address1, ship_country_code, ship_pincode, ship_phone, ship_email,
            guest_email
        } = req.body;

        if (!bill_fname || !bill_lname || !bill_address1 || !bill_country_code || !bill_pincode || !bill_phone || !bill_email) {
            return res.status(400).json({ error: 'All billing fields are required.' });
        }
        if (!ship_fname || !ship_lname || !ship_address1 || !ship_country_code || !ship_pincode || !ship_phone || !ship_email) {
            return res.status(400).json({ error: 'All shipping fields are required.' });
        }

        const customerId = req.user ? req.user.id : null;
        const sessionId = req.sessionID;

        // Get cart items
        let cartWhere, cartParam;
        if (customerId) {
            cartWhere = 'c.customer_id = ?';
            cartParam = customerId;
        } else {
            cartWhere = 'c.session_id = ?';
            cartParam = sessionId;
        }

        const cartItems = db.prepare(`
            SELECT
                c.id as cart_id, c.lot_product_id, c.quantity,
                lp.sku, lp.metal, lp.size, lp.weight, lp.price, lp.discount_price, lp.inventory,
                mp.name as product_name,
                (SELECT image_path FROM product_image WHERE master_product_id = mp.id AND is_primary = 1 LIMIT 1) as image_path
            FROM cart c
            JOIN lot_product lp ON lp.id = c.lot_product_id
            JOIN master_product mp ON mp.id = lp.master_product_id
            WHERE ${cartWhere}
        `).all(cartParam);

        if (cartItems.length === 0) {
            return res.status(400).json({ error: 'Cart is empty.' });
        }

        // Validate inventory
        for (const item of cartItems) {
            if (item.inventory < item.quantity) {
                return res.status(400).json({
                    error: 'Insufficient inventory for "' + item.product_name + '" (SKU: ' + item.sku + '). Available: ' + item.inventory + ', Requested: ' + item.quantity
                });
            }
        }

        // Calculate totals
        const subtotal = cartItems.reduce(function (sum, item) {
            var unitPrice = item.discount_price || item.price;
            return sum + (unitPrice * item.quantity);
        }, 0);
        const taxRate = 0.18;
        const taxes = parseFloat((subtotal * taxRate).toFixed(2));
        const orderTotal = parseFloat((subtotal + taxes).toFixed(2));
        const orderNumber = generateOrderNumber();

        // Transaction
        const placeOrder = db.transaction(function () {
            var orderResult = db.prepare(
                "INSERT INTO orders (customer_id, guest_email, order_number, bill_fname, bill_lname, bill_address1, bill_country_code, bill_pincode, bill_phone, bill_email, ship_fname, ship_lname, ship_address1, ship_country_code, ship_pincode, ship_phone, ship_email, subtotal, taxes, order_total, payment_method) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 'mock_payment')"
            ).run(
                customerId, guest_email || bill_email, orderNumber,
                bill_fname, bill_lname, bill_address1, bill_country_code, bill_pincode, bill_phone, bill_email,
                ship_fname, ship_lname, ship_address1, ship_country_code, ship_pincode, ship_phone, ship_email,
                subtotal, taxes, orderTotal
            );

            var orderId = orderResult.lastInsertRowid;

            var insertItem = db.prepare(
                'INSERT INTO order_items (order_id, lot_product_id, product_name, sku, metal, size, weight, quantity, unit_price, total_price, image_path) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)'
            );
            var updateInv = db.prepare("UPDATE lot_product SET inventory = inventory - ?, updated_at = datetime('now') WHERE id = ?");

            for (var i = 0; i < cartItems.length; i++) {
                var item = cartItems[i];
                var unitPrice = item.discount_price || item.price;
                var totalPrice = unitPrice * item.quantity;
                insertItem.run(orderId, item.lot_product_id, item.product_name, item.sku, item.metal, item.size, item.weight, item.quantity, unitPrice, totalPrice, item.image_path);
                updateInv.run(item.quantity, item.lot_product_id);
            }

            // Clear cart
            if (customerId) {
                db.prepare('DELETE FROM cart WHERE customer_id = ?').run(customerId);
            } else {
                db.prepare('DELETE FROM cart WHERE session_id = ?').run(sessionId);
            }

            return { orderId: orderId };
        });

        var txResult = placeOrder();

        res.status(201).json({
            message: 'Order placed successfully.',
            order_number: orderNumber,
            order_id: txResult.orderId,
            order_total: orderTotal
        });
    } catch (err) {
        console.error('Create order error:', err);
        res.status(500).json({ error: 'Failed to place order.' });
    }
});

// GET /api/orders/:orderNumber
router.get('/:orderNumber', (req, res) => {
    try {
        const orderNumber = req.params.orderNumber;

        const order = db.prepare('SELECT * FROM orders WHERE order_number = ?').get(orderNumber);

        if (!order) {
            return res.status(404).json({ error: 'Order not found.' });
        }

        // Auth check
        if (req.user) {
            if (order.customer_id && order.customer_id !== req.user.id) {
                return res.status(403).json({ error: 'Access denied.' });
            }
        }

        const items = db.prepare('SELECT * FROM order_items WHERE order_id = ?').all(order.id);

        res.json({ ...order, items: items });
    } catch (err) {
        console.error('Get order error:', err);
        res.status(500).json({ error: 'Failed to fetch order.' });
    }
});

module.exports = router;
