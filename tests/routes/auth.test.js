'use strict';

process.env.JWT_SECRET = 'test-secret';
process.env.JWT_EXPIRES_IN = '1h';

// Mock the database before requiring any route files
jest.mock('../../server/config/db');
const db = require('../../server/config/db');

const express = require('express');
const request = require('supertest');
const session = require('express-session');
const authRoutes = require('../../server/routes/authRoutes');

function buildApp() {
    const app = express();
    app.use(express.json());
    app.use(session({ secret: 'test', resave: false, saveUninitialized: true }));
    app.use('/api/auth', authRoutes);
    return app;
}

// Helper: create a mock prepared statement
function mockStmt(overrides) {
    return {
        get: jest.fn(),
        all: jest.fn().mockReturnValue([]),
        run: jest.fn().mockReturnValue({ lastInsertRowid: 1, changes: 1 }),
        ...overrides
    };
}

describe('POST /api/auth/register', () => {
    beforeEach(() => jest.clearAllMocks());

    it('returns 400 when required fields are missing', async () => {
        const app = buildApp();
        const res = await request(app)
            .post('/api/auth/register')
            .send({ email: 'a@b.com' });
        expect(res.status).toBe(400);
        expect(res.body.error).toMatch(/required/i);
    });

    it('returns 409 when email is already registered', async () => {
        db.prepare.mockReturnValue(mockStmt({ get: jest.fn().mockReturnValue({ id: 1 }) }));

        const app = buildApp();
        const res = await request(app)
            .post('/api/auth/register')
            .send({ first_name: 'Alice', email: 'alice@example.com', password: 'secret' });

        expect(res.status).toBe(409);
        expect(res.body.error).toMatch(/already registered/i);
    });

    it('returns 201 with a token on successful registration', async () => {
        const insertStmt = mockStmt({ run: jest.fn().mockReturnValue({ lastInsertRowid: 42 }) });
        db.prepare
            .mockReturnValueOnce(mockStmt({ get: jest.fn().mockReturnValue(undefined) })) // email check
            .mockReturnValueOnce(insertStmt); // INSERT

        const app = buildApp();
        const res = await request(app)
            .post('/api/auth/register')
            .send({ first_name: 'Alice', email: 'alice@example.com', password: 'secret' });

        expect(res.status).toBe(201);
        expect(res.body).toHaveProperty('token');
        expect(res.body.customer).toMatchObject({ first_name: 'Alice', email: 'alice@example.com' });
    });
});

describe('POST /api/auth/login', () => {
    const bcrypt = require('bcryptjs');

    beforeEach(() => jest.clearAllMocks());

    it('returns 400 when email or password is missing', async () => {
        const app = buildApp();
        const res = await request(app)
            .post('/api/auth/login')
            .send({ email: 'a@b.com' });
        expect(res.status).toBe(400);
        expect(res.body.error).toMatch(/required/i);
    });

    it('returns 401 when customer does not exist', async () => {
        db.prepare.mockReturnValue(mockStmt({ get: jest.fn().mockReturnValue(undefined) }));

        const app = buildApp();
        const res = await request(app)
            .post('/api/auth/login')
            .send({ email: 'nobody@example.com', password: 'pass' });

        expect(res.status).toBe(401);
        expect(res.body.error).toMatch(/invalid/i);
    });

    it('returns 401 when password is incorrect', async () => {
        const hash = await bcrypt.hash('correct', 10);
        db.prepare.mockReturnValue(
            mockStmt({
                get: jest.fn().mockReturnValue({
                    id: 1, first_name: 'Alice', last_name: null,
                    email: 'alice@example.com', password_hash: hash
                })
            })
        );

        const app = buildApp();
        const res = await request(app)
            .post('/api/auth/login')
            .send({ email: 'alice@example.com', password: 'wrong' });

        expect(res.status).toBe(401);
    });

    it('returns 200 with token on successful login', async () => {
        const hash = await bcrypt.hash('secret', 10);
        db.prepare.mockReturnValue(
            mockStmt({
                get: jest.fn().mockReturnValue({
                    id: 1, first_name: 'Alice', last_name: 'Smith',
                    email: 'alice@example.com', password_hash: hash
                })
            })
        );

        const app = buildApp();
        const res = await request(app)
            .post('/api/auth/login')
            .send({ email: 'alice@example.com', password: 'secret' });

        expect(res.status).toBe(200);
        expect(res.body).toHaveProperty('token');
        expect(res.body.customer).toMatchObject({ id: 1, email: 'alice@example.com' });
    });
});
