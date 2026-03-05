'use strict';

jest.mock('../../server/config/db');
jest.mock('bcryptjs');

process.env.JWT_SECRET = 'test-jwt-secret';
process.env.SESSION_SECRET = 'test-session-secret';

const request = require('supertest');
const jwt = require('jsonwebtoken');
const bcrypt = require('bcryptjs');
const db = require('../../server/config/db');

let app;

beforeAll(() => {
    app = require('../../server/app');
});

beforeEach(() => {
    jest.clearAllMocks();
});

const customerToken = jwt.sign({ id: 1, email: 'user@example.com' }, 'test-jwt-secret');
const authHeader = { Authorization: `Bearer ${customerToken}` };

const mockProfile = {
    id: 1,
    first_name: 'Alice',
    last_name: 'Smith',
    email: 'alice@example.com',
    phone_no: '9999999999',
    address: '123 Main St',
    created_at: '2024-01-01 00:00:00'
};

// ─── GET /api/account/profile ─────────────────────────────────────────────────

describe('GET /api/account/profile', () => {
    test('200 — returns customer profile', async () => {
        db.prepare.mockReturnValueOnce({ get: jest.fn().mockReturnValue(mockProfile) });

        const res = await request(app).get('/api/account/profile').set(authHeader);

        expect(res.status).toBe(200);
        expect(res.body).toMatchObject({ email: 'alice@example.com' });
    });

    test('401 — rejects unauthenticated request', async () => {
        const res = await request(app).get('/api/account/profile');

        expect(res.status).toBe(401);
    });

    test('404 — customer not found in DB', async () => {
        db.prepare.mockReturnValueOnce({ get: jest.fn().mockReturnValue(null) });

        const res = await request(app).get('/api/account/profile').set(authHeader);

        expect(res.status).toBe(404);
    });
});

// ─── PUT /api/account/profile ─────────────────────────────────────────────────

describe('PUT /api/account/profile', () => {
    test('200 — updates customer profile', async () => {
        db.prepare.mockReturnValueOnce({ run: jest.fn() });

        const res = await request(app)
            .put('/api/account/profile')
            .set(authHeader)
            .send({ first_name: 'Alice', last_name: 'Johnson', phone_no: '8888888888', address: '456 Oak Ave' });

        expect(res.status).toBe(200);
        expect(res.body).toHaveProperty('message');
    });

    test('400 — missing first_name', async () => {
        const res = await request(app)
            .put('/api/account/profile')
            .set(authHeader)
            .send({ last_name: 'Johnson' });

        expect(res.status).toBe(400);
        expect(res.body).toHaveProperty('error');
    });

    test('401 — unauthenticated', async () => {
        const res = await request(app)
            .put('/api/account/profile')
            .send({ first_name: 'Alice' });

        expect(res.status).toBe(401);
    });
});

// ─── PUT /api/account/password ────────────────────────────────────────────────

describe('PUT /api/account/password', () => {
    test('200 — changes password with correct current password', async () => {
        bcrypt.compare.mockResolvedValue(true);
        bcrypt.hash.mockResolvedValue('new_hashed_pw');

        db.prepare
            .mockReturnValueOnce({ get: jest.fn().mockReturnValue({ password_hash: 'old_hash' }) })
            .mockReturnValueOnce({ run: jest.fn() });

        const res = await request(app)
            .put('/api/account/password')
            .set(authHeader)
            .send({ current_password: 'old_pw', new_password: 'newpassword' });

        expect(res.status).toBe(200);
        expect(res.body).toHaveProperty('message');
    });

    test('400 — missing current or new password', async () => {
        const res = await request(app)
            .put('/api/account/password')
            .set(authHeader)
            .send({ current_password: 'old_pw' });

        expect(res.status).toBe(400);
        expect(res.body).toHaveProperty('error');
    });

    test('400 — new password too short (< 6 chars)', async () => {
        const res = await request(app)
            .put('/api/account/password')
            .set(authHeader)
            .send({ current_password: 'old_pw', new_password: 'abc' });

        expect(res.status).toBe(400);
        expect(res.body).toHaveProperty('error');
    });

    test('401 — wrong current password', async () => {
        bcrypt.compare.mockResolvedValue(false);
        db.prepare.mockReturnValueOnce({ get: jest.fn().mockReturnValue({ password_hash: 'old_hash' }) });

        const res = await request(app)
            .put('/api/account/password')
            .set(authHeader)
            .send({ current_password: 'wrong_pw', new_password: 'newpassword' });

        expect(res.status).toBe(401);
        expect(res.body).toHaveProperty('error');
    });
});

// ─── GET /api/account/orders ──────────────────────────────────────────────────

describe('GET /api/account/orders', () => {
    test('200 — returns list of customer orders with item counts', async () => {
        const mockOrders = [
            { id: 100, order_number: 'ORD-001', order_total: 5900, order_status: 'confirmed', payment_status: 'paid', created_at: '2024-01-01' }
        ];
        db.prepare
            .mockReturnValueOnce({ all: jest.fn().mockReturnValue(mockOrders) })
            .mockReturnValueOnce({ get: jest.fn().mockReturnValue({ cnt: 2 }) }); // item count for order

        const res = await request(app).get('/api/account/orders').set(authHeader);

        expect(res.status).toBe(200);
        expect(res.body).toHaveLength(1);
        expect(res.body[0]).toHaveProperty('item_count', 2);
    });

    test('401 — unauthenticated', async () => {
        const res = await request(app).get('/api/account/orders');

        expect(res.status).toBe(401);
    });
});

// ─── GET /api/account/orders/:id ─────────────────────────────────────────────

describe('GET /api/account/orders/:id', () => {
    test('200 — returns specific order detail', async () => {
        const mockOrder = { id: 100, order_number: 'ORD-001', customer_id: 1, order_total: 5900 };
        db.prepare
            .mockReturnValueOnce({ get: jest.fn().mockReturnValue(mockOrder) })
            .mockReturnValueOnce({ all: jest.fn().mockReturnValue([{ id: 1, product_name: 'Ring' }]) });

        const res = await request(app).get('/api/account/orders/100').set(authHeader);

        expect(res.status).toBe(200);
        expect(res.body.order).toMatchObject({ order_number: 'ORD-001' });
        expect(res.body.items).toHaveLength(1);
    });

    test('404 — order not found for this customer', async () => {
        db.prepare.mockReturnValueOnce({ get: jest.fn().mockReturnValue(null) });

        const res = await request(app).get('/api/account/orders/999').set(authHeader);

        expect(res.status).toBe(404);
    });
});

// ─── GET /api/account/saved ───────────────────────────────────────────────────

describe('GET /api/account/saved', () => {
    test('200 — returns saved/wishlisted items', async () => {
        const mockSaved = [
            { id: 1, master_product_id: 5, name: 'Gold Necklace', min_price: 8000 }
        ];
        db.prepare.mockReturnValueOnce({ all: jest.fn().mockReturnValue(mockSaved) });

        const res = await request(app).get('/api/account/saved').set(authHeader);

        expect(res.status).toBe(200);
        expect(res.body).toHaveLength(1);
        expect(res.body[0]).toHaveProperty('name', 'Gold Necklace');
    });
});

// ─── POST /api/account/saved ──────────────────────────────────────────────────

describe('POST /api/account/saved', () => {
    test('201 — saves a new item to wishlist', async () => {
        db.prepare
            .mockReturnValueOnce({ get: jest.fn().mockReturnValue(null) })                           // not already saved
            .mockReturnValueOnce({ run: jest.fn().mockReturnValue({ lastInsertRowid: 10 }) });       // INSERT

        const res = await request(app)
            .post('/api/account/saved')
            .set(authHeader)
            .send({ master_product_id: 5 });

        expect(res.status).toBe(201);
        expect(res.body).toHaveProperty('id', 10);
    });

    test('200 — returns existing saved item when already saved', async () => {
        db.prepare.mockReturnValueOnce({ get: jest.fn().mockReturnValue({ id: 7 }) }); // already exists

        const res = await request(app)
            .post('/api/account/saved')
            .set(authHeader)
            .send({ master_product_id: 5 });

        expect(res.status).toBe(200);
        expect(res.body).toHaveProperty('id', 7);
    });
});

// ─── DELETE /api/account/saved/:productId ─────────────────────────────────────

describe('DELETE /api/account/saved/:productId', () => {
    test('200 — removes item from wishlist', async () => {
        db.prepare.mockReturnValueOnce({ run: jest.fn() });

        const res = await request(app)
            .delete('/api/account/saved/5')
            .set(authHeader);

        expect(res.status).toBe(200);
        expect(res.body).toHaveProperty('message');
    });

    test('400 — invalid product ID', async () => {
        const res = await request(app)
            .delete('/api/account/saved/abc')
            .set(authHeader);

        expect(res.status).toBe(400);
    });
});

// ─── GET /api/account/saved/check/:productId ──────────────────────────────────

describe('GET /api/account/saved/check/:productId', () => {
    test('200 — returns saved: true when item is in wishlist', async () => {
        db.prepare.mockReturnValueOnce({ get: jest.fn().mockReturnValue({ id: 7 }) });

        const res = await request(app)
            .get('/api/account/saved/check/5')
            .set(authHeader);

        expect(res.status).toBe(200);
        expect(res.body).toEqual({ saved: true });
    });

    test('200 — returns saved: false when item is not in wishlist', async () => {
        db.prepare.mockReturnValueOnce({ get: jest.fn().mockReturnValue(null) });

        const res = await request(app)
            .get('/api/account/saved/check/5')
            .set(authHeader);

        expect(res.status).toBe(200);
        expect(res.body).toEqual({ saved: false });
    });
});
