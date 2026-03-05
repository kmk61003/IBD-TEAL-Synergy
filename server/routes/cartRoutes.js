const express = require('express');
const router = express.Router();
const db = require('../config/db');

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
router.get('/', (req, res) => {
    try {
        const identifier = getCartIdentifier(req);

        let whereClause, paramValue;
        if (identifier.type === 'customer') {
            whereClause = 'c.customer_id = ?';
            paramValue = identifier.value;
        } else {
            whereClause = 'c.session_id = ?';
            paramValue = identifier.value;
        }

        const rows = db.prepare(`
            SELECT
                c.id,
                c.lot_product_id,
                c.quantity,
                lp.sku, lp.metal, lp.size, lp.weight, lp.price, lp.discount_price, lp.inventory,
                mp.name as product_name,
                mp.id as master_product_id,
                (SELECT image_path FROM product_image WHERE master_product_id = mp.id AND is_primary = 1 LIMIT 1) as image_path
            FROM cart c
            JOIN lot_product lp ON lp.id = c.lot_product_id
            JOIN master_product mp ON mp.id = lp.master_product_id
            WHERE ${whereClause}
            ORDER BY c.created_at DESC
        `).all(paramValue);

        const items = rows.map(item => ({
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
router.post('/', (req, res) => {
    try {
        const { lot_product_id, quantity = 1 } = req.body;
        if (!lot_product_id) return res.status(400).json({ error: 'lot_product_id is required.' });

        const identifier = getCartIdentifier(req);

        const product = db.prepare("SELECT id, inventory, status FROM lot_product WHERE id = ? AND status = 'active'").get(lot_product_id);

        if (!product) {
            return res.status(404).json({ error: 'Product variant not found or unavailable.' });
        }

        if (product.inventory < quantity) {
            return res.status(400).json({ error: 'Insufficient inventory.' });
        }

        let existing;
        if (identifier.type === 'customer') {
            existing = db.prepare('SELECT id, quantity FROM cart WHERE customer_id = ? AND lot_product_id = ?').get(identifier.value, lot_product_id);
        } else {
            existing = db.prepare('SELECT id, quantity FROM cart WHERE session_id = ? AND lot_product_id = ?').get(identifier.value, lot_product_id);
        }

        if (existing) {
            const newQty = existing.quantity + quantity;
            if (newQty > product.inventory) {
                return res.status(400).json({ error: 'Insufficient inventory for requested quantity.' });
            }
            db.prepare('UPDATE cart SET quantity = ? WHERE id = ?').run(newQty, existing.id);
        } else {
            if (identifier.type === 'customer') {
                db.prepare('INSERT INTO cart (customer_id, lot_product_id, quantity) VALUES (?, ?, ?)').run(identifier.value, lot_product_id, quantity);
            } else {
                db.prepare('INSERT INTO cart (session_id, lot_product_id, quantity) VALUES (?, ?, ?)').run(identifier.value, lot_product_id, quantity);
            }
        }

        res.status(201).json({ message: 'Item added to cart.' });
    } catch (err) {
        console.error('Add to cart error:', err);
        res.status(500).json({ error: 'Failed to add item to cart.' });
    }
});

// PUT /api/cart/:id
router.put('/:id', (req, res) => {
    try {
        const cartItemId = parseInt(req.params.id);
        const { quantity } = req.body;

        if (isNaN(cartItemId) || !quantity || quantity < 1) {
            return res.status(400).json({ error: 'Valid cart item ID and quantity are required.' });
        }

        const identifier = getCartIdentifier(req);

        let cartItem;
        if (identifier.type === 'customer') {
            cartItem = db.prepare('SELECT id, lot_product_id FROM cart WHERE id = ? AND customer_id = ?').get(cartItemId, identifier.value);
        } else {
            cartItem = db.prepare('SELECT id, lot_product_id FROM cart WHERE id = ? AND session_id = ?').get(cartItemId, identifier.value);
        }

        if (!cartItem) {
            return res.status(404).json({ error: 'Cart item not found.' });
        }

        const inv = db.prepare('SELECT inventory FROM lot_product WHERE id = ?').get(cartItem.lot_product_id);
        if (inv.inventory < quantity) {
            return res.status(400).json({ error: 'Insufficient inventory.' });
        }

        db.prepare('UPDATE cart SET quantity = ? WHERE id = ?').run(quantity, cartItemId);

        res.json({ message: 'Cart updated.' });
    } catch (err) {
        console.error('Update cart error:', err);
        res.status(500).json({ error: 'Failed to update cart.' });
    }
});

// DELETE /api/cart/:id
router.delete('/:id', (req, res) => {
    try {
        const cartItemId = parseInt(req.params.id);
        if (isNaN(cartItemId)) return res.status(400).json({ error: 'Invalid cart item ID.' });

        const identifier = getCartIdentifier(req);

        if (identifier.type === 'customer') {
            db.prepare('DELETE FROM cart WHERE id = ? AND customer_id = ?').run(cartItemId, identifier.value);
        } else {
            db.prepare('DELETE FROM cart WHERE id = ? AND session_id = ?').run(cartItemId, identifier.value);
        }

        res.json({ message: 'Item removed from cart.' });
    } catch (err) {
        console.error('Delete cart item error:', err);
        res.status(500).json({ error: 'Failed to remove item from cart.' });
    }
});

module.exports = router;
