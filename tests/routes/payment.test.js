'use strict';

jest.mock('../../server/config/db');
const db = require('../../server/config/db');

const express = require('express');
const request = require('supertest');
const paymentRoutes = require('../../server/routes/paymentRoutes');

function buildApp() {
    const app = express();
    app.use(express.json());
    app.use('/api/payment', paymentRoutes);
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

describe('POST /api/payment/process', () => {
    beforeEach(() => jest.clearAllMocks());

    it('returns 400 when order_number is missing', async () => {
        const app = buildApp();
        const res = await request(app).post('/api/payment/process').send({});
        expect(res.status).toBe(400);
        expect(res.body.error).toMatch(/order_number is required/i);
    });

    it('returns 404 when order does not exist', async () => {
        db.prepare.mockReturnValue(mockStmt({ get: jest.fn().mockReturnValue(undefined) }));

        const app = buildApp();
        const res = await request(app)
            .post('/api/payment/process')
            .send({ order_number: 'ORD-99999999-0000' });

        expect(res.status).toBe(404);
        expect(res.body.error).toMatch(/not found/i);
    });

    it('returns 400 when order is already paid', async () => {
        db.prepare.mockReturnValue(
            mockStmt({ get: jest.fn().mockReturnValue({ id: 1, payment_status: 'paid' }) })
        );

        const app = buildApp();
        const res = await request(app)
            .post('/api/payment/process')
            .send({ order_number: 'ORD-20240101-1234' });

        expect(res.status).toBe(400);
        expect(res.body.error).toMatch(/already paid/i);
    });

    it('processes payment successfully and returns transaction ID', async () => {
        const getStmt = mockStmt({ get: jest.fn().mockReturnValue({ id: 1, payment_status: 'pending' }) });
        const updateStmt = mockStmt();

        db.prepare
            .mockReturnValueOnce(getStmt)
            .mockReturnValueOnce(updateStmt);

        const app = buildApp();
        const res = await request(app)
            .post('/api/payment/process')
            .send({ order_number: 'ORD-20240101-1234', payment_method: 'card' });

        expect(res.status).toBe(200);
        expect(res.body.success).toBe(true);
        expect(res.body.message).toMatch(/payment processed successfully/i);
        expect(res.body).toHaveProperty('transaction_id');
        expect(res.body.transaction_id).toMatch(/^TXN-/);
        expect(res.body.order_number).toBe('ORD-20240101-1234');
    });

    it('generates a UPI-prefixed transaction ID for UPI payment method', async () => {
        const getStmt = mockStmt({ get: jest.fn().mockReturnValue({ id: 2, payment_status: 'pending' }) });
        const updateStmt = mockStmt();

        db.prepare
            .mockReturnValueOnce(getStmt)
            .mockReturnValueOnce(updateStmt);

        const app = buildApp();
        const res = await request(app)
            .post('/api/payment/process')
            .send({ order_number: 'ORD-20240101-5678', payment_method: 'upi' });

        expect(res.status).toBe(200);
        expect(res.body.transaction_id).toMatch(/^UPI-/);
    });

    it('generates an NB-prefixed transaction ID for netbanking payment method', async () => {
        const getStmt = mockStmt({ get: jest.fn().mockReturnValue({ id: 3, payment_status: 'pending' }) });
        const updateStmt = mockStmt();

        db.prepare
            .mockReturnValueOnce(getStmt)
            .mockReturnValueOnce(updateStmt);

        const app = buildApp();
        const res = await request(app)
            .post('/api/payment/process')
            .send({ order_number: 'ORD-20240101-9999', payment_method: 'netbanking' });

        expect(res.status).toBe(200);
        expect(res.body.transaction_id).toMatch(/^NB-/);
    });
});
