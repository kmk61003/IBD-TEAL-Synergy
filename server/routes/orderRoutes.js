const express = require('express');
const router = express.Router();
const { sql, poolPromise } = require('../config/db');
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
    return `ORD-${date}-${rand}`;
}

// POST /api/orders
router.post('/', async (req, res) => {
    try {
        const {
            bill_fname, bill_lname, bill_address1, bill_country_code, bill_pincode, bill_phone, bill_email,
            ship_fname, ship_lname, ship_address1, ship_country_code, ship_pincode, ship_phone, ship_email,
            guest_email
        } = req.body;

        // Validate required billing/shipping fields
        if (!bill_fname || !bill_lname || !bill_address1 || !bill_country_code || !bill_pincode || !bill_phone || !bill_email) {
            return res.status(400).json({ error: 'All billing fields are required.' });
        }
        if (!ship_fname || !ship_lname || !ship_address1 || !ship_country_code || !ship_pincode || !ship_phone || !ship_email) {
            return res.status(400).json({ error: 'All shipping fields are required.' });
        }

        const pool = await poolPromise;
        const customerId = req.user ? req.user.id : null;
        const sessionId = req.sessionID;

        // Get cart items
        const cartReq = pool.request();
        let cartWhere;
        if (customerId) {
            cartReq.input('customer_id', sql.Int, customerId);
            cartWhere = 'c.customer_id = @customer_id';
        } else {
            cartReq.input('session_id', sql.VarChar(255), sessionId);
            cartWhere = 'c.session_id = @session_id';
        }

        const cartResult = await cartReq.query(`
            SELECT
                c.id as cart_id, c.lot_product_id, c.quantity,
                lp.sku, lp.metal, lp.size, lp.weight, lp.price, lp.discount_price, lp.inventory,
                mp.name as product_name,
                (SELECT TOP 1 image_path FROM product_image WHERE master_product_id = mp.id AND is_primary = 1) as image_path
            FROM cart c
            JOIN lot_product lp ON lp.id = c.lot_product_id
            JOIN master_product mp ON mp.id = lp.master_product_id
            WHERE ${cartWhere}
        `);

        if (cartResult.recordset.length === 0) {
            return res.status(400).json({ error: 'Cart is empty.' });
        }

        // Validate inventory for all items
        for (const item of cartResult.recordset) {
            if (item.inventory < item.quantity) {
                return res.status(400).json({
                    error: `Insufficient inventory for "${item.product_name}" (SKU: ${item.sku}). Available: ${item.inventory}, Requested: ${item.quantity}`
                });
            }
        }

        // Calculate totals
        const subtotal = cartResult.recordset.reduce((sum, item) => {
            const unitPrice = item.discount_price || item.price;
            return sum + (unitPrice * item.quantity);
        }, 0);
        const taxRate = 0.18; // 18% GST
        const taxes = parseFloat((subtotal * taxRate).toFixed(2));
        const orderTotal = parseFloat((subtotal + taxes).toFixed(2));
        const orderNumber = generateOrderNumber();

        // Use a transaction
        const transaction = new sql.Transaction(pool);
        await transaction.begin();

        try {
            // Insert order
            const orderReq = new sql.Request(transaction);
            const orderResult = await orderReq
                .input('customer_id', sql.Int, customerId)
                .input('guest_email', sql.VarChar(255), guest_email || bill_email)
                .input('order_number', sql.VarChar(50), orderNumber)
                .input('bill_fname', sql.NVarChar(100), bill_fname)
                .input('bill_lname', sql.NVarChar(100), bill_lname)
                .input('bill_address1', sql.NVarChar(500), bill_address1)
                .input('bill_country_code', sql.VarChar(10), bill_country_code)
                .input('bill_pincode', sql.VarChar(20), bill_pincode)
                .input('bill_phone', sql.VarChar(20), bill_phone)
                .input('bill_email', sql.VarChar(255), bill_email)
                .input('ship_fname', sql.NVarChar(100), ship_fname)
                .input('ship_lname', sql.NVarChar(100), ship_lname)
                .input('ship_address1', sql.NVarChar(500), ship_address1)
                .input('ship_country_code', sql.VarChar(10), ship_country_code)
                .input('ship_pincode', sql.VarChar(20), ship_pincode)
                .input('ship_phone', sql.VarChar(20), ship_phone)
                .input('ship_email', sql.VarChar(255), ship_email)
                .input('subtotal', sql.Decimal(12, 2), subtotal)
                .input('taxes', sql.Decimal(12, 2), taxes)
                .input('order_total', sql.Decimal(12, 2), orderTotal)
                .query(`INSERT INTO orders
                    (customer_id, guest_email, order_number, bill_fname, bill_lname, bill_address1, bill_country_code, bill_pincode, bill_phone, bill_email,
                     ship_fname, ship_lname, ship_address1, ship_country_code, ship_pincode, ship_phone, ship_email, subtotal, taxes, order_total, payment_method)
                    OUTPUT INSERTED.id
                    VALUES (@customer_id, @guest_email, @order_number, @bill_fname, @bill_lname, @bill_address1, @bill_country_code, @bill_pincode, @bill_phone, @bill_email,
                            @ship_fname, @ship_lname, @ship_address1, @ship_country_code, @ship_pincode, @ship_phone, @ship_email, @subtotal, @taxes, @order_total, 'mock_payment')`);

            const orderId = orderResult.recordset[0].id;

            // Insert order items and decrement inventory
            for (let i = 0; i < cartResult.recordset.length; i++) {
                const item = cartResult.recordset[i];
                const unitPrice = item.discount_price || item.price;
                const totalPrice = unitPrice * item.quantity;

                const itemReq = new sql.Request(transaction);
                await itemReq
                    .input('order_id', sql.Int, orderId)
                    .input('lot_product_id', sql.Int, item.lot_product_id)
                    .input('product_name', sql.NVarChar(255), item.product_name)
                    .input('sku', sql.VarChar(100), item.sku)
                    .input('metal', sql.NVarChar(100), item.metal)
                    .input('size', sql.NVarChar(50), item.size)
                    .input('weight', sql.Decimal(10, 3), item.weight)
                    .input('quantity', sql.Int, item.quantity)
                    .input('unit_price', sql.Decimal(12, 2), unitPrice)
                    .input('total_price', sql.Decimal(12, 2), totalPrice)
                    .input('image_path', sql.NVarChar(500), item.image_path)
                    .query(`INSERT INTO order_items (order_id, lot_product_id, product_name, sku, metal, size, weight, quantity, unit_price, total_price, image_path)
                            VALUES (@order_id, @lot_product_id, @product_name, @sku, @metal, @size, @weight, @quantity, @unit_price, @total_price, @image_path)`);

                // Decrement inventory
                const invReq = new sql.Request(transaction);
                await invReq
                    .input('lot_id', sql.Int, item.lot_product_id)
                    .input('qty', sql.Int, item.quantity)
                    .query('UPDATE lot_product SET inventory = inventory - @qty, updated_at = GETDATE() WHERE id = @lot_id');
            }

            // Clear cart
            const clearReq = new sql.Request(transaction);
            if (customerId) {
                await clearReq.input('customer_id', sql.Int, customerId)
                    .query('DELETE FROM cart WHERE customer_id = @customer_id');
            } else {
                await clearReq.input('session_id', sql.VarChar(255), sessionId)
                    .query('DELETE FROM cart WHERE session_id = @session_id');
            }

            await transaction.commit();

            res.status(201).json({
                message: 'Order placed successfully.',
                order_number: orderNumber,
                order_id: orderId,
                order_total: orderTotal
            });
        } catch (txErr) {
            await transaction.rollback();
            throw txErr;
        }
    } catch (err) {
        console.error('Create order error:', err);
        res.status(500).json({ error: 'Failed to place order.' });
    }
});

// GET /api/orders/:orderNumber
router.get('/:orderNumber', async (req, res) => {
    try {
        const orderNumber = req.params.orderNumber;
        const pool = await poolPromise;

        const orderResult = await pool.request()
            .input('order_number', sql.VarChar(50), orderNumber)
            .query('SELECT * FROM orders WHERE order_number = @order_number');

        if (orderResult.recordset.length === 0) {
            return res.status(404).json({ error: 'Order not found.' });
        }

        const order = orderResult.recordset[0];

        // Auth check: only owner or guest with matching email can view
        if (req.user) {
            if (order.customer_id && order.customer_id !== req.user.id) {
                return res.status(403).json({ error: 'Access denied.' });
            }
        }

        const itemsResult = await pool.request()
            .input('order_id', sql.Int, order.id)
            .query('SELECT * FROM order_items WHERE order_id = @order_id');

        res.json({ ...order, items: itemsResult.recordset });
    } catch (err) {
        console.error('Get order error:', err);
        res.status(500).json({ error: 'Failed to fetch order.' });
    }
});

module.exports = router;
