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

// ─── GET /api/admin/categories ────────────────────────────────────────────────

describe('GET /api/admin/categories', () => {
    test('200 — returns all categories with product counts', async () => {
        const mockCategories = [
            { id: 1, name: 'Rings', slug: 'rings', status: 'active', product_count: 5 }
        ];
        db.prepare.mockReturnValueOnce({ all: jest.fn().mockReturnValue(mockCategories) });

        const res = await request(app).get('/api/admin/categories').set(authHeader);

        expect(res.status).toBe(200);
        expect(res.body).toHaveLength(1);
        expect(res.body[0]).toHaveProperty('product_count', 5);
    });

    test('401 — unauthenticated', async () => {
        const res = await request(app).get('/api/admin/categories');

        expect(res.status).toBe(401);
    });
});

// ─── POST /api/admin/categories ───────────────────────────────────────────────

describe('POST /api/admin/categories', () => {
    test('201 — creates a new category', async () => {
        db.prepare.mockReturnValueOnce({ run: jest.fn().mockReturnValue({ lastInsertRowid: 3 }) });

        const res = await request(app)
            .post('/api/admin/categories')
            .set(authHeader)
            .send({ name: 'Earrings', slug: 'earrings' });

        expect(res.status).toBe(201);
        expect(res.body).toHaveProperty('id', 3);
        expect(res.body).toHaveProperty('message');
    });

    test('400 — missing name or slug', async () => {
        const res = await request(app)
            .post('/api/admin/categories')
            .set(authHeader)
            .send({ name: 'Earrings' }); // no slug

        expect(res.status).toBe(400);
        expect(res.body).toHaveProperty('error');
    });
});

// ─── PUT /api/admin/categories/:id ────────────────────────────────────────────

describe('PUT /api/admin/categories/:id', () => {
    test('200 — updates a category', async () => {
        db.prepare.mockReturnValueOnce({ run: jest.fn() });

        const res = await request(app)
            .put('/api/admin/categories/1')
            .set(authHeader)
            .send({ name: 'Gold Rings', slug: 'gold-rings', status: 'active' });

        expect(res.status).toBe(200);
        expect(res.body).toHaveProperty('message');
    });
});

// ─── DELETE /api/admin/categories/:id ─────────────────────────────────────────

describe('DELETE /api/admin/categories/:id', () => {
    test('200 — deletes a category', async () => {
        db.prepare.mockReturnValueOnce({ run: jest.fn() });

        const res = await request(app)
            .delete('/api/admin/categories/1')
            .set(authHeader);

        expect(res.status).toBe(200);
        expect(res.body).toHaveProperty('message');
    });
});
