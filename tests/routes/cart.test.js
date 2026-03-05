'use strict';

process.env.JWT_SECRET = 'test-secret';

jest.mock('../../server/config/db');
const db = require('../../server/config/db');

const express = require('express');
const request = require('supertest');
const session = require('express-session');
const jwt = require('jsonwebtoken');
const cartRoutes = require('../../server/routes/cartRoutes');

function buildApp() {
    const app = express();
    app.use(express.json());
    app.use(session({ secret: 'test', resave: false, saveUninitialized: true }));
    app.use('/api/cart', cartRoutes);
    return app;
}

function mockStmt(overrides) {
    return {
        get: jest.fn().mockReturnValue(undefined),
        all: jest.fn().mockReturnValue([]),
        run: jest.fn().mockReturnValue({ lastInsertRowid: 1, changes: 1 }),
        ...overrides
    };
}

function makeAuthHeader(payload) {
    const token = jwt.sign(payload, 'test-secret', { expiresIn: '1h' });
    return `Bearer ${token}`;
}

describe('GET /api/cart', () => {
    beforeEach(() => jest.clearAllMocks());

    it('returns an empty cart for a guest session', async () => {
        db.prepare.mockReturnValue(mockStmt({ all: jest.fn().mockReturnValue([]) }));

        const app = buildApp();
        const res = await request(app).get('/api/cart');

        expect(res.status).toBe(200);
        expect(res.body.items).toEqual([]);
        expect(res.body.cart_total).toBe(0);
        expect(res.body.item_count).toBe(0);
    });

    it('returns cart items with computed line totals for authenticated user', async () => {
        const cartRow = {
            id: 1, lot_product_id: 10, quantity: 2,
            sku: 'GR-001', metal: 'Gold', size: '6', weight: 5,
            price: 100, discount_price: 80, inventory: 10,
            product_name: 'Gold Ring', master_product_id: 1, image_path: null
        };
        db.prepare.mockReturnValue(mockStmt({ all: jest.fn().mockReturnValue([cartRow]) }));

        const app = buildApp();
        const res = await request(app)
            .get('/api/cart')
            .set('Authorization', makeAuthHeader({ id: 1, email: 'user@example.com' }));

        expect(res.status).toBe(200);
        expect(res.body.items).toHaveLength(1);
        expect(res.body.items[0].effective_price).toBe(80);
        expect(res.body.items[0].line_total).toBe(160);
        expect(res.body.cart_total).toBe(160);
        expect(res.body.item_count).toBe(1);
    });
});

describe('POST /api/cart', () => {
    beforeEach(() => jest.clearAllMocks());

    it('returns 400 when lot_product_id is missing', async () => {
        const app = buildApp();
        const res = await request(app).post('/api/cart').send({ quantity: 1 });
        expect(res.status).toBe(400);
        expect(res.body.error).toMatch(/lot_product_id is required/i);
    });

    it('returns 404 when product variant does not exist', async () => {
        db.prepare.mockReturnValue(mockStmt({ get: jest.fn().mockReturnValue(undefined) }));

        const app = buildApp();
        const res = await request(app).post('/api/cart').send({ lot_product_id: 99, quantity: 1 });

        expect(res.status).toBe(404);
        expect(res.body.error).toMatch(/not found/i);
    });

    it('returns 400 when inventory is insufficient', async () => {
        db.prepare.mockReturnValue(
            mockStmt({ get: jest.fn().mockReturnValue({ id: 10, inventory: 1, status: 'active' }) })
        );

        const app = buildApp();
        const res = await request(app).post('/api/cart').send({ lot_product_id: 10, quantity: 5 });

        expect(res.status).toBe(400);
        expect(res.body.error).toMatch(/insufficient inventory/i);
    });

    it('adds a new item to cart for a guest user', async () => {
        const productStmt = mockStmt({ get: jest.fn().mockReturnValue({ id: 10, inventory: 10, status: 'active' }) });
        const existingStmt = mockStmt({ get: jest.fn().mockReturnValue(undefined) });
        const insertStmt = mockStmt();

        db.prepare
            .mockReturnValueOnce(productStmt)
            .mockReturnValueOnce(existingStmt)
            .mockReturnValueOnce(insertStmt);

        const app = buildApp();
        const res = await request(app).post('/api/cart').send({ lot_product_id: 10, quantity: 2 });

        expect(res.status).toBe(201);
        expect(res.body.message).toMatch(/added to cart/i);
    });

    it('updates quantity when item already exists in cart', async () => {
        const productStmt = mockStmt({ get: jest.fn().mockReturnValue({ id: 10, inventory: 10, status: 'active' }) });
        const existingStmt = mockStmt({ get: jest.fn().mockReturnValue({ id: 1, quantity: 2 }) });
        const updateStmt = mockStmt();

        db.prepare
            .mockReturnValueOnce(productStmt)
            .mockReturnValueOnce(existingStmt)
            .mockReturnValueOnce(updateStmt);

        const app = buildApp();
        const res = await request(app)
            .post('/api/cart')
            .set('Authorization', makeAuthHeader({ id: 1, email: 'user@example.com' }))
            .send({ lot_product_id: 10, quantity: 3 });

        expect(res.status).toBe(201);
    });
});

describe('PUT /api/cart/:id', () => {
    beforeEach(() => jest.clearAllMocks());

    it('returns 400 for invalid cart item ID or quantity', async () => {
        const app = buildApp();
        const res = await request(app).put('/api/cart/abc').send({ quantity: 2 });
        expect(res.status).toBe(400);
    });

    it('returns 404 when cart item not found', async () => {
        db.prepare.mockReturnValue(mockStmt({ get: jest.fn().mockReturnValue(undefined) }));

        const app = buildApp();
        const res = await request(app)
            .put('/api/cart/1')
            .set('Authorization', makeAuthHeader({ id: 1, email: 'user@example.com' }))
            .send({ quantity: 2 });

        expect(res.status).toBe(404);
    });

    it('returns 400 when inventory is insufficient for updated quantity', async () => {
        const cartItemStmt = mockStmt({ get: jest.fn().mockReturnValue({ id: 1, lot_product_id: 10 }) });
        const invStmt = mockStmt({ get: jest.fn().mockReturnValue({ inventory: 1 }) });

        db.prepare
            .mockReturnValueOnce(cartItemStmt)
            .mockReturnValueOnce(invStmt);

        const app = buildApp();
        const res = await request(app)
            .put('/api/cart/1')
            .set('Authorization', makeAuthHeader({ id: 1, email: 'user@example.com' }))
            .send({ quantity: 5 });

        expect(res.status).toBe(400);
        expect(res.body.error).toMatch(/insufficient inventory/i);
    });

    it('updates cart item quantity successfully', async () => {
        const cartItemStmt = mockStmt({ get: jest.fn().mockReturnValue({ id: 1, lot_product_id: 10 }) });
        const invStmt = mockStmt({ get: jest.fn().mockReturnValue({ inventory: 10 }) });
        const updateStmt = mockStmt();

        db.prepare
            .mockReturnValueOnce(cartItemStmt)
            .mockReturnValueOnce(invStmt)
            .mockReturnValueOnce(updateStmt);

        const app = buildApp();
        const res = await request(app)
            .put('/api/cart/1')
            .set('Authorization', makeAuthHeader({ id: 1, email: 'user@example.com' }))
            .send({ quantity: 3 });

        expect(res.status).toBe(200);
        expect(res.body.message).toMatch(/cart updated/i);
    });
});

describe('DELETE /api/cart/:id', () => {
    beforeEach(() => jest.clearAllMocks());

    it('returns 400 for non-numeric cart item ID', async () => {
        const app = buildApp();
        const res = await request(app).delete('/api/cart/abc');
        expect(res.status).toBe(400);
        expect(res.body.error).toMatch(/invalid cart item id/i);
    });

    it('removes a cart item successfully', async () => {
        db.prepare.mockReturnValue(mockStmt());

        const app = buildApp();
        const res = await request(app)
            .delete('/api/cart/1')
            .set('Authorization', makeAuthHeader({ id: 1, email: 'user@example.com' }));

        expect(res.status).toBe(200);
        expect(res.body.message).toMatch(/removed/i);
    });
});
