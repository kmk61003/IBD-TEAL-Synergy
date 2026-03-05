'use strict';

process.env.JWT_SECRET = 'test-secret';

jest.mock('../../server/config/db');
const db = require('../../server/config/db');

const express = require('express');
const request = require('supertest');
const jwt = require('jsonwebtoken');
const accountRoutes = require('../../server/routes/accountRoutes');

function buildApp() {
    const app = express();
    app.use(express.json());
    app.use('/api/account', accountRoutes);
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

const AUTH = makeAuthHeader({ id: 1, email: 'user@example.com' });

describe('GET /api/account/profile', () => {
    beforeEach(() => jest.clearAllMocks());

    it('returns 401 without auth token', async () => {
        const app = buildApp();
        const res = await request(app).get('/api/account/profile');
        expect(res.status).toBe(401);
    });

    it('returns 404 when customer is not found in database', async () => {
        db.prepare.mockReturnValue(mockStmt({ get: jest.fn().mockReturnValue(undefined) }));

        const app = buildApp();
        const res = await request(app)
            .get('/api/account/profile')
            .set('Authorization', AUTH);

        expect(res.status).toBe(404);
    });

    it('returns customer profile for authenticated user', async () => {
        const customer = {
            id: 1, first_name: 'Alice', last_name: 'Smith',
            email: 'user@example.com', phone_no: null, address: null,
            created_at: '2024-01-01'
        };
        db.prepare.mockReturnValue(mockStmt({ get: jest.fn().mockReturnValue(customer) }));

        const app = buildApp();
        const res = await request(app)
            .get('/api/account/profile')
            .set('Authorization', AUTH);

        expect(res.status).toBe(200);
        expect(res.body).toMatchObject({ id: 1, email: 'user@example.com' });
    });
});

describe('PUT /api/account/profile', () => {
    beforeEach(() => jest.clearAllMocks());

    it('returns 400 when first_name is missing', async () => {
        const app = buildApp();
        const res = await request(app)
            .put('/api/account/profile')
            .set('Authorization', AUTH)
            .send({ last_name: 'Smith' });
        expect(res.status).toBe(400);
        expect(res.body.error).toMatch(/first name is required/i);
    });

    it('updates profile and returns success message', async () => {
        db.prepare.mockReturnValue(mockStmt());

        const app = buildApp();
        const res = await request(app)
            .put('/api/account/profile')
            .set('Authorization', AUTH)
            .send({ first_name: 'Alice', last_name: 'Jones', phone_no: '555-1234' });

        expect(res.status).toBe(200);
        expect(res.body.message).toMatch(/profile updated/i);
    });
});

describe('PUT /api/account/password', () => {
    const bcrypt = require('bcryptjs');

    beforeEach(() => jest.clearAllMocks());

    it('returns 400 when passwords are missing', async () => {
        const app = buildApp();
        const res = await request(app)
            .put('/api/account/password')
            .set('Authorization', AUTH)
            .send({ current_password: 'old' });
        expect(res.status).toBe(400);
        expect(res.body.error).toMatch(/required/i);
    });

    it('returns 400 when new password is too short', async () => {
        const app = buildApp();
        const res = await request(app)
            .put('/api/account/password')
            .set('Authorization', AUTH)
            .send({ current_password: 'oldpass', new_password: 'abc' });
        expect(res.status).toBe(400);
        expect(res.body.error).toMatch(/at least 6 characters/i);
    });

    it('returns 401 when current password is wrong', async () => {
        const hash = await bcrypt.hash('correct', 10);
        db.prepare.mockReturnValue(mockStmt({ get: jest.fn().mockReturnValue({ password_hash: hash }) }));

        const app = buildApp();
        const res = await request(app)
            .put('/api/account/password')
            .set('Authorization', AUTH)
            .send({ current_password: 'wrongpass', new_password: 'newpass123' });

        expect(res.status).toBe(401);
        expect(res.body.error).toMatch(/incorrect/i);
    });

    it('changes password successfully', async () => {
        const hash = await bcrypt.hash('oldpass', 10);
        const getStmt = mockStmt({ get: jest.fn().mockReturnValue({ password_hash: hash }) });
        const updateStmt = mockStmt();

        db.prepare
            .mockReturnValueOnce(getStmt)
            .mockReturnValueOnce(updateStmt);

        const app = buildApp();
        const res = await request(app)
            .put('/api/account/password')
            .set('Authorization', AUTH)
            .send({ current_password: 'oldpass', new_password: 'newpass123' });

        expect(res.status).toBe(200);
        expect(res.body.message).toMatch(/password changed/i);
    });
});

describe('GET /api/account/orders', () => {
    beforeEach(() => jest.clearAllMocks());

    it('returns list of orders with item counts', async () => {
        const orders = [
            { id: 1, order_number: 'ORD-001', order_total: 118, order_status: 'placed', payment_status: 'pending', created_at: '2024-01-01' },
            { id: 2, order_number: 'ORD-002', order_total: 59, order_status: 'confirmed', payment_status: 'paid', created_at: '2024-01-02' }
        ];
        const ordersStmt = mockStmt({ all: jest.fn().mockReturnValue(orders) });
        const countStmt = mockStmt({ get: jest.fn().mockReturnValue({ cnt: 2 }) });

        db.prepare
            .mockReturnValueOnce(ordersStmt)
            .mockReturnValue(countStmt); // called for each order

        const app = buildApp();
        const res = await request(app)
            .get('/api/account/orders')
            .set('Authorization', AUTH);

        expect(res.status).toBe(200);
        expect(res.body).toHaveLength(2);
        expect(res.body[0].item_count).toBe(2);
    });
});

describe('GET /api/account/orders/:id', () => {
    beforeEach(() => jest.clearAllMocks());

    it('returns 400 for non-numeric order ID', async () => {
        const app = buildApp();
        const res = await request(app)
            .get('/api/account/orders/abc')
            .set('Authorization', AUTH);
        expect(res.status).toBe(400);
    });

    it('returns 404 when order not found', async () => {
        db.prepare.mockReturnValue(mockStmt({ get: jest.fn().mockReturnValue(undefined) }));

        const app = buildApp();
        const res = await request(app)
            .get('/api/account/orders/999')
            .set('Authorization', AUTH);

        expect(res.status).toBe(404);
    });

    it('returns order with items', async () => {
        const order = { id: 1, order_number: 'ORD-001', customer_id: 1, order_total: 118 };
        const items = [{ id: 1, product_name: 'Gold Ring', quantity: 1, unit_price: 100 }];

        db.prepare
            .mockReturnValueOnce(mockStmt({ get: jest.fn().mockReturnValue(order) }))
            .mockReturnValueOnce(mockStmt({ all: jest.fn().mockReturnValue(items) }));

        const app = buildApp();
        const res = await request(app)
            .get('/api/account/orders/1')
            .set('Authorization', AUTH);

        expect(res.status).toBe(200);
        expect(res.body.order.order_number).toBe('ORD-001');
        expect(res.body.items).toHaveLength(1);
    });
});

describe('GET /api/account/saved', () => {
    beforeEach(() => jest.clearAllMocks());

    it('returns list of saved items', async () => {
        const saved = [
            { id: 1, master_product_id: 5, name: 'Gold Ring', min_price: 99 }
        ];
        db.prepare.mockReturnValue(mockStmt({ all: jest.fn().mockReturnValue(saved) }));

        const app = buildApp();
        const res = await request(app)
            .get('/api/account/saved')
            .set('Authorization', AUTH);

        expect(res.status).toBe(200);
        expect(res.body).toHaveLength(1);
        expect(res.body[0].name).toBe('Gold Ring');
    });
});

describe('POST /api/account/saved', () => {
    beforeEach(() => jest.clearAllMocks());

    it('returns 400 for non-numeric product ID', async () => {
        const app = buildApp();
        const res = await request(app)
            .post('/api/account/saved')
            .set('Authorization', AUTH)
            .send({ master_product_id: 'abc' });
        expect(res.status).toBe(400);
    });

    it('returns existing save if already saved', async () => {
        db.prepare.mockReturnValue(mockStmt({ get: jest.fn().mockReturnValue({ id: 3 }) }));

        const app = buildApp();
        const res = await request(app)
            .post('/api/account/saved')
            .set('Authorization', AUTH)
            .send({ master_product_id: 5 });

        expect(res.status).toBe(200);
        expect(res.body.message).toMatch(/already saved/i);
        expect(res.body.id).toBe(3);
    });

    it('saves a new item and returns 201', async () => {
        const checkStmt = mockStmt({ get: jest.fn().mockReturnValue(undefined) });
        const insertStmt = mockStmt({ run: jest.fn().mockReturnValue({ lastInsertRowid: 7 }) });

        db.prepare
            .mockReturnValueOnce(checkStmt)
            .mockReturnValueOnce(insertStmt);

        const app = buildApp();
        const res = await request(app)
            .post('/api/account/saved')
            .set('Authorization', AUTH)
            .send({ master_product_id: 5 });

        expect(res.status).toBe(201);
        expect(res.body.message).toMatch(/item saved/i);
        expect(res.body.id).toBe(7);
    });
});

describe('DELETE /api/account/saved/:productId', () => {
    beforeEach(() => jest.clearAllMocks());

    it('returns 400 for non-numeric product ID', async () => {
        const app = buildApp();
        const res = await request(app)
            .delete('/api/account/saved/abc')
            .set('Authorization', AUTH);
        expect(res.status).toBe(400);
    });

    it('removes saved item and returns success message', async () => {
        db.prepare.mockReturnValue(mockStmt());

        const app = buildApp();
        const res = await request(app)
            .delete('/api/account/saved/5')
            .set('Authorization', AUTH);

        expect(res.status).toBe(200);
        expect(res.body.message).toMatch(/removed/i);
    });
});

describe('GET /api/account/saved/check/:productId', () => {
    beforeEach(() => jest.clearAllMocks());

    it('returns saved: false when item is not saved', async () => {
        db.prepare.mockReturnValue(mockStmt({ get: jest.fn().mockReturnValue(undefined) }));

        const app = buildApp();
        const res = await request(app)
            .get('/api/account/saved/check/5')
            .set('Authorization', AUTH);

        expect(res.status).toBe(200);
        expect(res.body.saved).toBe(false);
    });

    it('returns saved: true when item is saved', async () => {
        db.prepare.mockReturnValue(mockStmt({ get: jest.fn().mockReturnValue({ id: 3 }) }));

        const app = buildApp();
        const res = await request(app)
            .get('/api/account/saved/check/5')
            .set('Authorization', AUTH);

        expect(res.status).toBe(200);
        expect(res.body.saved).toBe(true);
    });
});
