'use strict';

jest.mock('../../server/config/db');

process.env.JWT_SECRET = 'test-jwt-secret';
process.env.SESSION_SECRET = 'test-session-secret';

const request = require('supertest');
const jwt = require('jsonwebtoken');
const db = require('../../server/config/db');
const { validOrderBody } = require('../helpers/dbMock');

let app;

beforeAll(() => {
    app = require('../../server/app');
});

beforeEach(() => {
    jest.clearAllMocks();
});

const customerToken = jwt.sign({ id: 1, email: 'user@example.com' }, 'test-jwt-secret');

const cartItems = [
    {
        cart_id: 1,
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
        image_path: '/uploads/products/ring.jpg'
    }
];

// ─── POST /api/orders ─────────────────────────────────────────────────────────

describe('POST /api/orders', () => {
    test('201 — places order from cart and clears cart', async () => {
        // Stub db.prepare chain:
        // 1. Fetch cart items
        db.prepare.mockReturnValueOnce({ all: jest.fn().mockReturnValue(cartItems) });

        // 2. transaction() wraps the DB writes
        db.transaction.mockImplementation(fn => () => {
            return fn();
        });

        // Inside the transaction: INSERT orders, INSERT order_items, UPDATE lot_product, DELETE cart
        db.prepare
            .mockReturnValueOnce({ run: jest.fn().mockReturnValue({ lastInsertRowid: 100 }) }) // INSERT orders
            .mockReturnValueOnce({ run: jest.fn() })  // INSERT order_items (prepared statement)
            .mockReturnValueOnce({ run: jest.fn() })  // UPDATE lot_product (prepared statement)
            .mockReturnValueOnce({ run: jest.fn() }); // DELETE cart

        const res = await request(app)
            .post('/api/orders')
            .set('Authorization', `Bearer ${customerToken}`)
            .send(validOrderBody);

        expect(res.status).toBe(201);
        expect(res.body).toHaveProperty('order_number');
        expect(res.body).toHaveProperty('order_id');
        expect(res.body).toHaveProperty('order_total');
    });

    test('400 — cart is empty', async () => {
        db.prepare.mockReturnValueOnce({ all: jest.fn().mockReturnValue([]) });

        const res = await request(app)
            .post('/api/orders')
            .send(validOrderBody);

        expect(res.status).toBe(400);
        expect(res.body.error).toMatch(/cart is empty/i);
    });

    test('400 — missing required billing fields', async () => {
        const res = await request(app)
            .post('/api/orders')
            .send({ bill_fname: 'John' }); // incomplete body

        expect(res.status).toBe(400);
        expect(res.body).toHaveProperty('error');
    });

    test('400 — missing required shipping fields', async () => {
        const incompleteBody = {
            ...validOrderBody,
            ship_fname: undefined
        };

        const res = await request(app)
            .post('/api/orders')
            .send(incompleteBody);

        expect(res.status).toBe(400);
        expect(res.body).toHaveProperty('error');
    });

    test('400 — insufficient inventory for a cart item', async () => {
        const lowInventoryItems = [{ ...cartItems[0], inventory: 1, quantity: 5 }];
        db.prepare.mockReturnValueOnce({ all: jest.fn().mockReturnValue(lowInventoryItems) });

        const res = await request(app)
            .post('/api/orders')
            .send(validOrderBody);

        expect(res.status).toBe(400);
        expect(res.body.error).toMatch(/inventory/i);
    });
});

// ─── GET /api/orders/:orderNumber ─────────────────────────────────────────────

describe('GET /api/orders/:orderNumber', () => {
    const mockOrder = {
        id: 100,
        order_number: 'ORD-20240101-1234',
        customer_id: 1,
        order_total: 11800,
        order_status: 'confirmed',
        payment_status: 'paid'
    };

    test('200 — returns order detail for a valid order number', async () => {
        db.prepare
            .mockReturnValueOnce({ get: jest.fn().mockReturnValue(mockOrder) })
            .mockReturnValueOnce({ all: jest.fn().mockReturnValue([{ id: 1, product_name: 'Gold Ring', quantity: 2 }]) });

        const res = await request(app)
            .get('/api/orders/ORD-20240101-1234')
            .set('Authorization', `Bearer ${customerToken}`);

        expect(res.status).toBe(200);
        expect(res.body).toMatchObject({ order_number: 'ORD-20240101-1234' });
        expect(res.body.items).toHaveLength(1);
    });

    test('404 — order not found', async () => {
        db.prepare.mockReturnValueOnce({ get: jest.fn().mockReturnValue(null) });

        const res = await request(app).get('/api/orders/ORD-INVALID');

        expect(res.status).toBe(404);
        expect(res.body).toHaveProperty('error');
    });

    test('403 — authenticated customer cannot access another customer\'s order', async () => {
        const otherCustomerOrder = { ...mockOrder, customer_id: 99 }; // different customer
        db.prepare.mockReturnValueOnce({ get: jest.fn().mockReturnValue(otherCustomerOrder) });

        const res = await request(app)
            .get('/api/orders/ORD-20240101-1234')
            .set('Authorization', `Bearer ${customerToken}`);

        expect(res.status).toBe(403);
        expect(res.body).toHaveProperty('error');
    });
});
