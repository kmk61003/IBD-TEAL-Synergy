'use strict';

jest.mock('../../server/config/db');

process.env.JWT_SECRET = 'test-jwt-secret';
process.env.SESSION_SECRET = 'test-session-secret';

const request = require('supertest');
const jwt = require('jsonwebtoken');
const db = require('../../server/config/db');

let app;

beforeAll(() => {
    app = require('../../server/app');
});

beforeEach(() => {
    jest.clearAllMocks();
});

const customerToken = jwt.sign({ id: 1, email: 'user@example.com' }, 'test-jwt-secret');

const cartItem = {
    id: 1,
    lot_product_id: 10,
    quantity: 2,
    sku: 'GR-001',
    metal: 'Gold',
    size: '7',
    weight: 5.0,
    price: 5000,
    discount_price: null,
    inventory: 10,
    product_name: 'Gold Ring',
    master_product_id: 1,
    image_path: '/uploads/products/ring.jpg',
    effective_price: 5000,
    line_total: 10000
};

// ─── GET /api/cart ────────────────────────────────────────────────────────────

describe('GET /api/cart', () => {
    test('200 — returns cart items for authenticated customer', async () => {
        db.prepare.mockReturnValueOnce({ all: jest.fn().mockReturnValue([cartItem]) });

        const res = await request(app)
            .get('/api/cart')
            .set('Authorization', `Bearer ${customerToken}`);

        expect(res.status).toBe(200);
        expect(res.body).toHaveProperty('items');
        expect(res.body).toHaveProperty('cart_total');
        expect(res.body).toHaveProperty('item_count', 1);
    });

    test('200 — returns empty cart for guest session', async () => {
        db.prepare.mockReturnValueOnce({ all: jest.fn().mockReturnValue([]) });

        const res = await request(app).get('/api/cart');

        expect(res.status).toBe(200);
        expect(res.body.items).toEqual([]);
        expect(res.body.item_count).toBe(0);
    });
});

// ─── POST /api/cart ───────────────────────────────────────────────────────────

describe('POST /api/cart', () => {
    test('201 — adds a new item to cart for authenticated customer', async () => {
        db.prepare
            .mockReturnValueOnce({ get: jest.fn().mockReturnValue({ id: 10, inventory: 10, status: 'active' }) }) // product check
            .mockReturnValueOnce({ get: jest.fn().mockReturnValue(null) })                                          // existing cart check
            .mockReturnValueOnce({ run: jest.fn().mockReturnValue({ lastInsertRowid: 1 }) });                       // INSERT

        const res = await request(app)
            .post('/api/cart')
            .set('Authorization', `Bearer ${customerToken}`)
            .send({ lot_product_id: 10, quantity: 1 });

        expect(res.status).toBe(201);
        expect(res.body).toHaveProperty('message');
    });

    test('201 — increments quantity when item already in cart', async () => {
        db.prepare
            .mockReturnValueOnce({ get: jest.fn().mockReturnValue({ id: 10, inventory: 10, status: 'active' }) })
            .mockReturnValueOnce({ get: jest.fn().mockReturnValue({ id: 1, quantity: 1 }) }) // existing
            .mockReturnValueOnce({ run: jest.fn() });                                          // UPDATE

        const res = await request(app)
            .post('/api/cart')
            .set('Authorization', `Bearer ${customerToken}`)
            .send({ lot_product_id: 10, quantity: 1 });

        expect(res.status).toBe(201);
    });

    test('400 — missing lot_product_id', async () => {
        const res = await request(app)
            .post('/api/cart')
            .send({ quantity: 1 });

        expect(res.status).toBe(400);
        expect(res.body).toHaveProperty('error');
    });

    test('404 — product variant not found or inactive', async () => {
        db.prepare.mockReturnValueOnce({ get: jest.fn().mockReturnValue(null) });

        const res = await request(app)
            .post('/api/cart')
            .send({ lot_product_id: 999, quantity: 1 });

        expect(res.status).toBe(404);
        expect(res.body).toHaveProperty('error');
    });

    test('400 — insufficient inventory', async () => {
        db.prepare.mockReturnValueOnce({ get: jest.fn().mockReturnValue({ id: 10, inventory: 1, status: 'active' }) });

        const res = await request(app)
            .post('/api/cart')
            .send({ lot_product_id: 10, quantity: 5 });

        expect(res.status).toBe(400);
        expect(res.body.error).toMatch(/inventory/i);
    });
});

// ─── PUT /api/cart/:id ────────────────────────────────────────────────────────

describe('PUT /api/cart/:id', () => {
    test('200 — updates cart item quantity', async () => {
        db.prepare
            .mockReturnValueOnce({ get: jest.fn().mockReturnValue({ id: 1, lot_product_id: 10 }) }) // cart item
            .mockReturnValueOnce({ get: jest.fn().mockReturnValue({ inventory: 10 }) })               // inventory check
            .mockReturnValueOnce({ run: jest.fn() });                                                  // UPDATE

        const res = await request(app)
            .put('/api/cart/1')
            .set('Authorization', `Bearer ${customerToken}`)
            .send({ quantity: 3 });

        expect(res.status).toBe(200);
        expect(res.body).toHaveProperty('message');
    });

    test('400 — invalid quantity (zero)', async () => {
        const res = await request(app)
            .put('/api/cart/1')
            .send({ quantity: 0 });

        expect(res.status).toBe(400);
        expect(res.body).toHaveProperty('error');
    });

    test('404 — cart item not found for this user', async () => {
        db.prepare.mockReturnValueOnce({ get: jest.fn().mockReturnValue(null) });

        const res = await request(app)
            .put('/api/cart/999')
            .set('Authorization', `Bearer ${customerToken}`)
            .send({ quantity: 1 });

        expect(res.status).toBe(404);
        expect(res.body).toHaveProperty('error');
    });
});

// ─── DELETE /api/cart/:id ─────────────────────────────────────────────────────

describe('DELETE /api/cart/:id', () => {
    test('200 — removes item from cart', async () => {
        db.prepare.mockReturnValueOnce({ run: jest.fn() });

        const res = await request(app)
            .delete('/api/cart/1')
            .set('Authorization', `Bearer ${customerToken}`);

        expect(res.status).toBe(200);
        expect(res.body).toHaveProperty('message');
    });

    test('400 — invalid cart item ID', async () => {
        const res = await request(app)
            .delete('/api/cart/abc')
            .set('Authorization', `Bearer ${customerToken}`);

        expect(res.status).toBe(400);
        expect(res.body).toHaveProperty('error');
    });
});
