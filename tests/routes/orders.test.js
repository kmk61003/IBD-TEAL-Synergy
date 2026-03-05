'use strict';

process.env.JWT_SECRET = 'test-secret';

jest.mock('../../server/config/db');
const db = require('../../server/config/db');

const express = require('express');
const request = require('supertest');
const session = require('express-session');
const jwt = require('jsonwebtoken');
const orderRoutes = require('../../server/routes/orderRoutes');

function buildApp() {
    const app = express();
    app.use(express.json());
    app.use(session({ secret: 'test', resave: false, saveUninitialized: true }));
    app.use('/api/orders', orderRoutes);
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

const validOrderBody = {
    bill_fname: 'Alice', bill_lname: 'Smith', bill_address1: '123 Main St',
    bill_country_code: 'US', bill_pincode: '10001', bill_phone: '5551234567',
    bill_email: 'alice@example.com',
    ship_fname: 'Alice', ship_lname: 'Smith', ship_address1: '123 Main St',
    ship_country_code: 'US', ship_pincode: '10001', ship_phone: '5551234567',
    ship_email: 'alice@example.com'
};

describe('POST /api/orders', () => {
    beforeEach(() => jest.clearAllMocks());

    it('returns 400 when billing fields are missing', async () => {
        const app = buildApp();
        const res = await request(app)
            .post('/api/orders')
            .send({ bill_fname: 'Alice' }); // missing most billing + all shipping fields
        expect(res.status).toBe(400);
        expect(res.body.error).toMatch(/billing/i);
    });

    it('returns 400 when shipping fields are missing', async () => {
        const app = buildApp();
        const res = await request(app)
            .post('/api/orders')
            .send({
                bill_fname: 'Alice', bill_lname: 'Smith', bill_address1: '123 Main St',
                bill_country_code: 'US', bill_pincode: '10001', bill_phone: '5551234567',
                bill_email: 'alice@example.com'
                // missing all ship_ fields
            });
        expect(res.status).toBe(400);
        expect(res.body.error).toMatch(/shipping/i);
    });

    it('returns 400 when cart is empty', async () => {
        db.prepare.mockReturnValue(mockStmt({ all: jest.fn().mockReturnValue([]) }));

        const app = buildApp();
        const res = await request(app).post('/api/orders').send(validOrderBody);

        expect(res.status).toBe(400);
        expect(res.body.error).toMatch(/cart is empty/i);
    });

    it('returns 400 when inventory is insufficient for a cart item', async () => {
        const cartItem = {
            cart_id: 1, lot_product_id: 10, quantity: 5, sku: 'GR-001',
            metal: 'Gold', size: '6', weight: 5, price: 100, discount_price: null,
            inventory: 2, product_name: 'Gold Ring', image_path: null
        };
        db.prepare.mockReturnValue(mockStmt({ all: jest.fn().mockReturnValue([cartItem]) }));

        const app = buildApp();
        const res = await request(app).post('/api/orders').send(validOrderBody);

        expect(res.status).toBe(400);
        expect(res.body.error).toMatch(/insufficient inventory/i);
    });

    it('creates an order and returns 201 on success', async () => {
        const cartItem = {
            cart_id: 1, lot_product_id: 10, quantity: 1, sku: 'GR-001',
            metal: 'Gold', size: '6', weight: 5, price: 100, discount_price: null,
            inventory: 10, product_name: 'Gold Ring', image_path: null
        };
        const cartStmt = mockStmt({ all: jest.fn().mockReturnValue([cartItem]) });

        // transaction mock: execute the function and return its result
        db.transaction.mockImplementation((fn) => {
            return function() {
                return fn.apply(null, arguments);
            };
        });

        // Mocks for queries inside the transaction
        const insertOrderStmt = mockStmt({ run: jest.fn().mockReturnValue({ lastInsertRowid: 5 }) });
        const insertItemStmt = mockStmt();
        const updateInvStmt = mockStmt();
        const deleteCartStmt = mockStmt();

        db.prepare
            .mockReturnValueOnce(cartStmt)           // get cart items
            .mockReturnValueOnce(insertOrderStmt)    // INSERT orders
            .mockReturnValueOnce(insertItemStmt)     // INSERT order_items
            .mockReturnValueOnce(updateInvStmt)      // UPDATE lot_product inventory
            .mockReturnValueOnce(deleteCartStmt);    // DELETE cart

        const app = buildApp();
        const res = await request(app).post('/api/orders').send(validOrderBody);

        expect(res.status).toBe(201);
        expect(res.body.message).toMatch(/order placed successfully/i);
        expect(res.body).toHaveProperty('order_number');
        expect(res.body.order_number).toMatch(/^ORD-\d{8}-\d{4}$/);
        expect(res.body).toHaveProperty('order_total');
    });
});

describe('GET /api/orders/:orderNumber', () => {
    beforeEach(() => jest.clearAllMocks());

    it('returns 404 when order is not found', async () => {
        db.prepare.mockReturnValue(mockStmt({ get: jest.fn().mockReturnValue(undefined) }));

        const app = buildApp();
        const res = await request(app).get('/api/orders/ORD-99999999-0000');

        expect(res.status).toBe(404);
        expect(res.body.error).toMatch(/not found/i);
    });

    it('returns 403 when authenticated user tries to access another user\'s order', async () => {
        const order = {
            id: 1, order_number: 'ORD-20240101-1234', customer_id: 99,
            order_total: 118, order_status: 'placed', payment_status: 'pending'
        };
        db.prepare.mockReturnValue(mockStmt({ get: jest.fn().mockReturnValue(order) }));

        const app = buildApp();
        const res = await request(app)
            .get('/api/orders/ORD-20240101-1234')
            .set('Authorization', makeAuthHeader({ id: 1, email: 'user@example.com' }));

        expect(res.status).toBe(403);
        expect(res.body.error).toMatch(/access denied/i);
    });

    it('returns order with items for a valid guest order', async () => {
        const order = {
            id: 1, order_number: 'ORD-20240101-1234', customer_id: null,
            order_total: 118, order_status: 'placed', payment_status: 'pending'
        };
        const items = [
            { id: 1, order_id: 1, product_name: 'Gold Ring', quantity: 1, unit_price: 100, total_price: 100 }
        ];

        db.prepare
            .mockReturnValueOnce(mockStmt({ get: jest.fn().mockReturnValue(order) }))
            .mockReturnValueOnce(mockStmt({ all: jest.fn().mockReturnValue(items) }));

        const app = buildApp();
        const res = await request(app).get('/api/orders/ORD-20240101-1234');

        expect(res.status).toBe(200);
        expect(res.body.order_number).toBe('ORD-20240101-1234');
        expect(res.body.items).toHaveLength(1);
    });

    it('returns order for the authenticated owner', async () => {
        const order = {
            id: 1, order_number: 'ORD-20240101-5678', customer_id: 1,
            order_total: 59, order_status: 'confirmed', payment_status: 'paid'
        };
        const items = [];

        db.prepare
            .mockReturnValueOnce(mockStmt({ get: jest.fn().mockReturnValue(order) }))
            .mockReturnValueOnce(mockStmt({ all: jest.fn().mockReturnValue(items) }));

        const app = buildApp();
        const res = await request(app)
            .get('/api/orders/ORD-20240101-5678')
            .set('Authorization', makeAuthHeader({ id: 1, email: 'user@example.com' }));

        expect(res.status).toBe(200);
        expect(res.body.customer_id).toBe(1);
    });
});
