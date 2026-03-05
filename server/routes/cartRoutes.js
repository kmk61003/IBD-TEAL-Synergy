const express = require('express');
const router = express.Router();
const { sql, poolPromise } = require('../config/db');
const auth = require('../middleware/auth');

// Helper: get cart identifier (customer_id or session_id)
function getCartIdentifier(req) {
    if (req.user && req.user.id) {
        return { type: 'customer', value: req.user.id };
    }
    return { type: 'session', value: req.sessionID };
}

// Optional auth — attach user if token present, but don't block
function optionalAuth(req, res, next) {
    const header = req.headers.authorization;
    if (header && header.startsWith('Bearer ')) {
        try {
            const jwt = require('jsonwebtoken');
            const token = header.split(' ')[1];
            req.user = jwt.verify(token, process.env.JWT_SECRET);
        } catch (e) { /* ignore invalid token */ }
    }
    next();
}

router.use(optionalAuth);

// GET /api/cart
router.get('/', async (req, res) => {
    try {
        const pool = await poolPromise;
        const identifier = getCartIdentifier(req);
        const request = pool.request();

        let whereClause;
        if (identifier.type === 'customer') {
            request.input('customer_id', sql.Int, identifier.value);
            whereClause = 'c.customer_id = @customer_id';
        } else {
            request.input('session_id', sql.VarChar(255), identifier.value);
            whereClause = 'c.session_id = @session_id';
        }

        const result = await request.query(`
            SELECT
                c.id,
                c.lot_product_id,
                c.quantity,
                lp.sku, lp.metal, lp.size, lp.weight, lp.price, lp.discount_price, lp.inventory,
                mp.name as product_name,
                mp.id as master_product_id,
                (SELECT TOP 1 image_path FROM product_image WHERE master_product_id = mp.id AND is_primary = 1) as image_path
            FROM cart c
            JOIN lot_product lp ON lp.id = c.lot_product_id
            JOIN master_product mp ON mp.id = lp.master_product_id
            WHERE ${whereClause}
            ORDER BY c.created_at DESC
        `);

        const items = result.recordset.map(item => ({
            ...item,
            effective_price: item.discount_price || item.price,
            line_total: (item.discount_price || item.price) * item.quantity
        }));

        const cart_total = items.reduce((sum, item) => sum + item.line_total, 0);

        res.json({ items, cart_total, item_count: items.length });
    } catch (err) {
        console.error('Get cart error:', err);
        res.status(500).json({ error: 'Failed to fetch cart.' });
    }
});

// POST /api/cart
router.post('/', async (req, res) => {
    try {
        const { lot_product_id, quantity = 1 } = req.body;
        if (!lot_product_id) return res.status(400).json({ error: 'lot_product_id is required.' });

        const pool = await poolPromise;
        const identifier = getCartIdentifier(req);

        // Verify product exists and has inventory
        const productCheck = await pool.request()
            .input('lotId', sql.Int, lot_product_id)
            .query(`SELECT id, inventory, status FROM lot_product WHERE id = @lotId AND status = 'active'`);

        if (productCheck.recordset.length === 0) {
            return res.status(404).json({ error: 'Product variant not found or unavailable.' });
        }

        if (productCheck.recordset[0].inventory < quantity) {
            return res.status(400).json({ error: 'Insufficient inventory.' });
        }

        const request = pool.request();
        request.input('lot_product_id', sql.Int, lot_product_id);

        let existingQuery;
        if (identifier.type === 'customer') {
            request.input('customer_id', sql.Int, identifier.value);
            existingQuery = 'SELECT id, quantity FROM cart WHERE customer_id = @customer_id AND lot_product_id = @lot_product_id';
        } else {
            request.input('session_id', sql.VarChar(255), identifier.value);
            existingQuery = 'SELECT id, quantity FROM cart WHERE session_id = @session_id AND lot_product_id = @lot_product_id';
        }

        const existing = await request.query(existingQuery);

        if (existing.recordset.length > 0) {
            // Update quantity
            const newQty = existing.recordset[0].quantity + quantity;
            if (newQty > productCheck.recordset[0].inventory) {
                return res.status(400).json({ error: 'Insufficient inventory for requested quantity.' });
            }
            await pool.request()
                .input('id', sql.Int, existing.recordset[0].id)
                .input('quantity', sql.Int, newQty)
                .query('UPDATE cart SET quantity = @quantity WHERE id = @id');
        } else {
            // Insert new cart item
            const insertReq = pool.request();
            insertReq.input('lot_product_id', sql.Int, lot_product_id);
            insertReq.input('quantity', sql.Int, quantity);
            if (identifier.type === 'customer') {
                insertReq.input('customer_id', sql.Int, identifier.value);
                await insertReq.query('INSERT INTO cart (customer_id, lot_product_id, quantity) VALUES (@customer_id, @lot_product_id, @quantity)');
            } else {
                insertReq.input('session_id', sql.VarChar(255), identifier.value);
                await insertReq.query('INSERT INTO cart (session_id, lot_product_id, quantity) VALUES (@session_id, @lot_product_id, @quantity)');
            }
        }

        res.status(201).json({ message: 'Item added to cart.' });
    } catch (err) {
        console.error('Add to cart error:', err);
        res.status(500).json({ error: 'Failed to add item to cart.' });
    }
});

// PUT /api/cart/:id
router.put('/:id', async (req, res) => {
    try {
        const cartItemId = parseInt(req.params.id);
        const { quantity } = req.body;

        if (isNaN(cartItemId) || !quantity || quantity < 1) {
            return res.status(400).json({ error: 'Valid cart item ID and quantity are required.' });
        }

        const pool = await poolPromise;
        const identifier = getCartIdentifier(req);

        // Verify ownership
        const request = pool.request();
        request.input('id', sql.Int, cartItemId);
        let ownerCheck;
        if (identifier.type === 'customer') {
            request.input('customer_id', sql.Int, identifier.value);
            ownerCheck = 'SELECT c.id, c.lot_product_id FROM cart c WHERE c.id = @id AND c.customer_id = @customer_id';
        } else {
            request.input('session_id', sql.VarChar(255), identifier.value);
            ownerCheck = 'SELECT c.id, c.lot_product_id FROM cart c WHERE c.id = @id AND c.session_id = @session_id';
        }

        const cartItem = await request.query(ownerCheck);
        if (cartItem.recordset.length === 0) {
            return res.status(404).json({ error: 'Cart item not found.' });
        }

        // Check inventory
        const invCheck = await pool.request()
            .input('lotId', sql.Int, cartItem.recordset[0].lot_product_id)
            .query('SELECT inventory FROM lot_product WHERE id = @lotId');

        if (invCheck.recordset[0].inventory < quantity) {
            return res.status(400).json({ error: 'Insufficient inventory.' });
        }

        await pool.request()
            .input('id', sql.Int, cartItemId)
            .input('quantity', sql.Int, quantity)
            .query('UPDATE cart SET quantity = @quantity WHERE id = @id');

        res.json({ message: 'Cart updated.' });
    } catch (err) {
        console.error('Update cart error:', err);
        res.status(500).json({ error: 'Failed to update cart.' });
    }
});

// DELETE /api/cart/:id
router.delete('/:id', async (req, res) => {
    try {
        const cartItemId = parseInt(req.params.id);
        if (isNaN(cartItemId)) return res.status(400).json({ error: 'Invalid cart item ID.' });

        const pool = await poolPromise;
        const identifier = getCartIdentifier(req);

        const request = pool.request();
        request.input('id', sql.Int, cartItemId);

        if (identifier.type === 'customer') {
            request.input('customer_id', sql.Int, identifier.value);
            await request.query('DELETE FROM cart WHERE id = @id AND customer_id = @customer_id');
        } else {
            request.input('session_id', sql.VarChar(255), identifier.value);
            await request.query('DELETE FROM cart WHERE id = @id AND session_id = @session_id');
        }

        res.json({ message: 'Item removed from cart.' });
    } catch (err) {
        console.error('Delete cart item error:', err);
        res.status(500).json({ error: 'Failed to remove item from cart.' });
    }
});

module.exports = router;
