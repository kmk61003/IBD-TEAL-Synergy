'use strict';

jest.mock('../../../server/config/db');
jest.mock('bcryptjs');

process.env.JWT_SECRET = 'test-jwt-secret';
process.env.SESSION_SECRET = 'test-session-secret';

const request = require('supertest');
const bcrypt = require('bcryptjs');
const db = require('../../../server/config/db');

let app;

beforeAll(() => {
    app = require('../../../server/app');
});

beforeEach(() => {
    jest.clearAllMocks();
});

// ─── POST /api/admin/auth/login ───────────────────────────────────────────────

describe('POST /api/admin/auth/login', () => {
    test('200 — logs in admin with correct credentials', async () => {
        bcrypt.compare.mockResolvedValue(true);
        db.prepare.mockReturnValueOnce({
            get: jest.fn().mockReturnValue({
                id: 1,
                username: 'admin',
                password_hash: 'hashed_pw',
                role: 'admin'
            })
        });

        const res = await request(app)
            .post('/api/admin/auth/login')
            .send({ username: 'admin', password: 'admin123' });

        expect(res.status).toBe(200);
        expect(res.body).toHaveProperty('token');
        expect(res.body.admin).toMatchObject({ username: 'admin', role: 'admin' });
    });

    test('400 — missing username or password', async () => {
        const res = await request(app)
            .post('/api/admin/auth/login')
            .send({ username: 'admin' });

        expect(res.status).toBe(400);
        expect(res.body).toHaveProperty('error');
    });

    test('401 — admin user not found', async () => {
        db.prepare.mockReturnValueOnce({ get: jest.fn().mockReturnValue(null) });

        const res = await request(app)
            .post('/api/admin/auth/login')
            .send({ username: 'nobody', password: 'secret' });

        expect(res.status).toBe(401);
        expect(res.body).toHaveProperty('error');
    });

    test('401 — wrong password', async () => {
        bcrypt.compare.mockResolvedValue(false);
        db.prepare.mockReturnValueOnce({
            get: jest.fn().mockReturnValue({ id: 1, username: 'admin', password_hash: 'hash', role: 'admin' })
        });

        const res = await request(app)
            .post('/api/admin/auth/login')
            .send({ username: 'admin', password: 'wrong' });

        expect(res.status).toBe(401);
        expect(res.body).toHaveProperty('error');
    });
});
