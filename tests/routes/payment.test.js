'use strict';

jest.mock('../../server/config/db');

process.env.JWT_SECRET = 'test-jwt-secret';
process.env.SESSION_SECRET = 'test-session-secret';

const request = require('supertest');
const db = require('../../server/config/db');

let app;

beforeAll(() => {
    app = require('../../server/app');
});

beforeEach(() => {
    jest.clearAllMocks();
});

// ─── POST /api/payment/process ────────────────────────────────────────────────

describe('POST /api/payment/process', () => {
    test('200 — processes payment for a pending order (card)', async () => {
        db.prepare
            .mockReturnValueOnce({ get: jest.fn().mockReturnValue({ id: 100, payment_status: 'pending' }) }) // SELECT order
            .mockReturnValueOnce({ run: jest.fn() }); // UPDATE order

        const res = await request(app)
            .post('/api/payment/process')
            .send({ order_number: 'ORD-20240101-1234', payment_method: 'card' });

        expect(res.status).toBe(200);
        expect(res.body.success).toBe(true);
        expect(res.body).toHaveProperty('transaction_id');
        expect(res.body.transaction_id).toMatch(/^TXN-/);
        expect(res.body.order_number).toBe('ORD-20240101-1234');
    });

    test('200 — processes payment with UPI method', async () => {
        db.prepare
            .mockReturnValueOnce({ get: jest.fn().mockReturnValue({ id: 100, payment_status: 'pending' }) })
            .mockReturnValueOnce({ run: jest.fn() });

        const res = await request(app)
            .post('/api/payment/process')
            .send({ order_number: 'ORD-20240101-1234', payment_method: 'upi' });

        expect(res.status).toBe(200);
        expect(res.body.transaction_id).toMatch(/^UPI-/);
    });

    test('200 — processes payment with net banking method', async () => {
        db.prepare
            .mockReturnValueOnce({ get: jest.fn().mockReturnValue({ id: 100, payment_status: 'pending' }) })
            .mockReturnValueOnce({ run: jest.fn() });

        const res = await request(app)
            .post('/api/payment/process')
            .send({ order_number: 'ORD-20240101-1234', payment_method: 'netbanking' });

        expect(res.status).toBe(200);
        expect(res.body.transaction_id).toMatch(/^NB-/);
    });

    test('400 — missing order_number', async () => {
        const res = await request(app)
            .post('/api/payment/process')
            .send({ payment_method: 'card' });

        expect(res.status).toBe(400);
        expect(res.body).toHaveProperty('error');
    });

    test('404 — order not found', async () => {
        db.prepare.mockReturnValueOnce({ get: jest.fn().mockReturnValue(null) });

        const res = await request(app)
            .post('/api/payment/process')
            .send({ order_number: 'ORD-INVALID' });

        expect(res.status).toBe(404);
        expect(res.body).toHaveProperty('error');
    });

    test('400 — order already paid', async () => {
        db.prepare.mockReturnValueOnce({ get: jest.fn().mockReturnValue({ id: 100, payment_status: 'paid' }) });

        const res = await request(app)
            .post('/api/payment/process')
            .send({ order_number: 'ORD-20240101-1234' });

        expect(res.status).toBe(400);
        expect(res.body.error).toMatch(/already paid/i);
    });
});
