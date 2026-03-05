'use strict';

jest.mock('../../../server/config/db');

process.env.JWT_SECRET = 'test-jwt-secret';
process.env.SESSION_SECRET = 'test-session-secret';

const request = require('supertest');
const jwt = require('jsonwebtoken');
const db = require('../../../server/config/db');

let app;

beforeAll(() => {
    app = require('../../../server/app');
});

beforeEach(() => {
    jest.clearAllMocks();
});

const adminToken = jwt.sign(
    { id: 1, username: 'admin', role: 'admin', isAdmin: true },
    'test-jwt-secret'
);
const authHeader = { Authorization: `Bearer ${adminToken}` };

const mockOrder = {
    id: 100,
    order_number: 'ORD-20240101-1234',
    order_total: 11800,
    order_status: 'placed',
    payment_status: 'pending',
    created_at: '2024-01-01 10:00:00',
    customer_first_name: 'Alice',
    customer_last_name: 'Smith',
    customer_email: 'alice@example.com',
    item_count: 2
};

// ─── GET /api/admin/orders ────────────────────────────────────────────────────

describe('GET /api/admin/orders', () => {
    test('200 — returns all orders with pagination', async () => {
        db.prepare
            .mockReturnValueOnce({ get: jest.fn().mockReturnValue({ total: 1 }) })
            .mockReturnValueOnce({ all: jest.fn().mockReturnValue([mockOrder]) });

        const res = await request(app).get('/api/admin/orders').set(authHeader);

        expect(res.status).toBe(200);
        expect(res.body).toHaveProperty('orders');
        expect(res.body).toHaveProperty('pagination');
        expect(res.body.orders).toHaveLength(1);
    });

    test('200 — filters orders by status', async () => {
        db.prepare
            .mockReturnValueOnce({ get: jest.fn().mockReturnValue({ total: 1 }) })
            .mockReturnValueOnce({ all: jest.fn().mockReturnValue([mockOrder]) });

        const res = await request(app)
            .get('/api/admin/orders?status=placed')
            .set(authHeader);

        expect(res.status).toBe(200);
        expect(res.body.orders).toHaveLength(1);
    });

    test('401 — unauthenticated', async () => {
        const res = await request(app).get('/api/admin/orders');

        expect(res.status).toBe(401);
    });
});

// ─── GET /api/admin/orders/:id ────────────────────────────────────────────────

describe('GET /api/admin/orders/:id', () => {
    test('200 — returns order detail with items', async () => {
        db.prepare
            .mockReturnValueOnce({ get: jest.fn().mockReturnValue(mockOrder) })
            .mockReturnValueOnce({ all: jest.fn().mockReturnValue([{ id: 1, product_name: 'Gold Ring', quantity: 2 }]) });

        const res = await request(app).get('/api/admin/orders/100').set(authHeader);

        expect(res.status).toBe(200);
        expect(res.body).toMatchObject({ order_number: 'ORD-20240101-1234' });
        expect(res.body.items).toHaveLength(1);
    });

    test('404 — order not found', async () => {
        db.prepare.mockReturnValueOnce({ get: jest.fn().mockReturnValue(null) });

        const res = await request(app).get('/api/admin/orders/999').set(authHeader);

        expect(res.status).toBe(404);
    });
});

// ─── PUT /api/admin/orders/:id ────────────────────────────────────────────────

describe('PUT /api/admin/orders/:id', () => {
    test('200 — updates order_status', async () => {
        db.prepare.mockReturnValueOnce({ run: jest.fn() });

        const res = await request(app)
            .put('/api/admin/orders/100')
            .set(authHeader)
            .send({ order_status: 'shipped' });

        expect(res.status).toBe(200);
        expect(res.body).toHaveProperty('message');
    });

    test('200 — updates payment_status', async () => {
        db.prepare.mockReturnValueOnce({ run: jest.fn() });

        const res = await request(app)
            .put('/api/admin/orders/100')
            .set(authHeader)
            .send({ payment_status: 'paid' });

        expect(res.status).toBe(200);
        expect(res.body).toHaveProperty('message');
    });
});
