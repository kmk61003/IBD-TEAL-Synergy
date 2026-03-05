'use strict';

// Must mock before requiring app so the routes pick up the mock
jest.mock('../../server/config/db');
jest.mock('bcryptjs');

process.env.JWT_SECRET = 'test-jwt-secret';
process.env.JWT_EXPIRES_IN = '1h';
process.env.SESSION_SECRET = 'test-session-secret';

const request = require('supertest');
const bcrypt = require('bcryptjs');
const db = require('../../server/config/db');
const { mockPrepare } = require('../helpers/dbMock');

let app;

beforeAll(() => {
    // Require app after mocks are in place
    app = require('../../server/app');
});

beforeEach(() => {
    jest.clearAllMocks();
});

// ─── POST /api/auth/register ─────────────────────────────────────────────────

describe('POST /api/auth/register', () => {
    test('201 — registers a new customer and returns a JWT', async () => {
        bcrypt.hash.mockResolvedValue('hashed_pw');
        // First prepare call: check duplicate email → null
        // Second prepare call: INSERT → lastInsertRowid
        db.prepare
            .mockReturnValueOnce({ get: jest.fn().mockReturnValue(null) })          // SELECT existing
            .mockReturnValueOnce({ run: jest.fn().mockReturnValue({ lastInsertRowid: 42 }) }); // INSERT

        const res = await request(app)
            .post('/api/auth/register')
            .send({ first_name: 'Alice', email: 'alice@example.com', password: 'secret123' });

        expect(res.status).toBe(201);
        expect(res.body).toHaveProperty('token');
        expect(res.body.customer).toMatchObject({ id: 42, first_name: 'Alice', email: 'alice@example.com' });
    });

    test('400 — missing required fields', async () => {
        const res = await request(app)
            .post('/api/auth/register')
            .send({ email: 'alice@example.com' }); // no first_name, no password

        expect(res.status).toBe(400);
        expect(res.body).toHaveProperty('error');
    });

    test('409 — email already registered', async () => {
        db.prepare.mockReturnValueOnce({
            get: jest.fn().mockReturnValue({ id: 1 }) // existing customer found
        });

        const res = await request(app)
            .post('/api/auth/register')
            .send({ first_name: 'Alice', email: 'alice@example.com', password: 'secret123' });

        expect(res.status).toBe(409);
        expect(res.body).toHaveProperty('error');
    });
});

// ─── POST /api/auth/login ─────────────────────────────────────────────────────

describe('POST /api/auth/login', () => {
    test('200 — logs in with correct credentials and returns JWT', async () => {
        bcrypt.compare.mockResolvedValue(true);
        db.prepare.mockReturnValueOnce({
            get: jest.fn().mockReturnValue({
                id: 1,
                first_name: 'Alice',
                last_name: 'Smith',
                email: 'alice@example.com',
                password_hash: 'hashed_pw'
            })
        });

        const res = await request(app)
            .post('/api/auth/login')
            .send({ email: 'alice@example.com', password: 'secret123' });

        expect(res.status).toBe(200);
        expect(res.body).toHaveProperty('token');
        expect(res.body.customer).toMatchObject({ email: 'alice@example.com' });
    });

    test('400 — missing email or password', async () => {
        const res = await request(app)
            .post('/api/auth/login')
            .send({ email: 'alice@example.com' });

        expect(res.status).toBe(400);
        expect(res.body).toHaveProperty('error');
    });

    test('401 — email not found', async () => {
        db.prepare.mockReturnValueOnce({ get: jest.fn().mockReturnValue(null) });

        const res = await request(app)
            .post('/api/auth/login')
            .send({ email: 'nobody@example.com', password: 'secret' });

        expect(res.status).toBe(401);
        expect(res.body).toHaveProperty('error');
    });

    test('401 — wrong password', async () => {
        bcrypt.compare.mockResolvedValue(false);
        db.prepare.mockReturnValueOnce({
            get: jest.fn().mockReturnValue({
                id: 1,
                email: 'alice@example.com',
                password_hash: 'hashed_pw'
            })
        });

        const res = await request(app)
            .post('/api/auth/login')
            .send({ email: 'alice@example.com', password: 'wrong' });

        expect(res.status).toBe(401);
        expect(res.body).toHaveProperty('error');
    });
});
