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

const mockProduct = {
    id: 1,
    name: 'Gold Ring',
    description: 'A beautiful ring',
    short_description: 'Beautiful ring',
    status: 'active',
    primary_image: '/uploads/products/ring.jpg',
    variant_count: 2
};

// ─── GET /api/admin/products ──────────────────────────────────────────────────

describe('GET /api/admin/products', () => {
    test('200 — returns paginated product list', async () => {
        db.prepare
            .mockReturnValueOnce({ get: jest.fn().mockReturnValue({ total: 1 }) })
            .mockReturnValueOnce({ all: jest.fn().mockReturnValue([mockProduct]) });

        const res = await request(app).get('/api/admin/products').set(authHeader);

        expect(res.status).toBe(200);
        expect(res.body).toHaveProperty('products');
        expect(res.body).toHaveProperty('pagination');
        expect(res.body.products).toHaveLength(1);
    });

    test('401 — rejects unauthenticated request', async () => {
        const res = await request(app).get('/api/admin/products');

        expect(res.status).toBe(401);
    });

    test('403 — rejects non-admin JWT', async () => {
        const customerToken = jwt.sign({ id: 2, email: 'user@example.com' }, 'test-jwt-secret');

        const res = await request(app)
            .get('/api/admin/products')
            .set('Authorization', `Bearer ${customerToken}`);

        expect(res.status).toBe(403);
    });
});

// ─── GET /api/admin/products/:id ─────────────────────────────────────────────

describe('GET /api/admin/products/:id', () => {
    test('200 — returns product with variants, images, categories', async () => {
        db.prepare
            .mockReturnValueOnce({ get: jest.fn().mockReturnValue({ id: 1, name: 'Gold Ring', status: 'active' }) })
            .mockReturnValueOnce({ all: jest.fn().mockReturnValue([{ id: 10, sku: 'GR-001', price: 5000 }]) })
            .mockReturnValueOnce({ all: jest.fn().mockReturnValue([{ id: 1, image_path: '/ring.jpg' }]) })
            .mockReturnValueOnce({ all: jest.fn().mockReturnValue([{ id: 1, name: 'Rings', slug: 'rings' }]) });

        const res = await request(app).get('/api/admin/products/1').set(authHeader);

        expect(res.status).toBe(200);
        expect(res.body).toMatchObject({ id: 1, name: 'Gold Ring' });
        expect(res.body.variants).toHaveLength(1);
    });

    test('404 — product not found', async () => {
        db.prepare.mockReturnValueOnce({ get: jest.fn().mockReturnValue(null) });

        const res = await request(app).get('/api/admin/products/999').set(authHeader);

        expect(res.status).toBe(404);
    });

    test('400 — invalid product ID', async () => {
        const res = await request(app).get('/api/admin/products/abc').set(authHeader);

        expect(res.status).toBe(400);
    });
});

// ─── POST /api/admin/products ─────────────────────────────────────────────────

describe('POST /api/admin/products', () => {
    test('201 — creates a new product', async () => {
        db.prepare.mockReturnValueOnce({ run: jest.fn().mockReturnValue({ lastInsertRowid: 5 }) });

        const res = await request(app)
            .post('/api/admin/products')
            .set(authHeader)
            .send({ name: 'New Ring', description: 'Nice ring', short_description: 'Ring' });

        expect(res.status).toBe(201);
        expect(res.body).toHaveProperty('id', 5);
        expect(res.body).toHaveProperty('message');
    });

    test('400 — missing product name', async () => {
        const res = await request(app)
            .post('/api/admin/products')
            .set(authHeader)
            .send({ description: 'A product without a name' });

        expect(res.status).toBe(400);
        expect(res.body).toHaveProperty('error');
    });
});

// ─── PUT /api/admin/products/:id ─────────────────────────────────────────────

describe('PUT /api/admin/products/:id', () => {
    test('200 — updates a product', async () => {
        db.prepare.mockReturnValueOnce({ run: jest.fn() }); // UPDATE master_product

        const res = await request(app)
            .put('/api/admin/products/1')
            .set(authHeader)
            .send({ name: 'Updated Ring', description: 'Updated', short_description: 'Ring', status: 'active' });

        expect(res.status).toBe(200);
        expect(res.body).toHaveProperty('message');
    });
});

// ─── DELETE /api/admin/products/:id ──────────────────────────────────────────

describe('DELETE /api/admin/products/:id', () => {
    test('200 — soft-deletes a product', async () => {
        db.prepare.mockReturnValueOnce({ run: jest.fn() });

        const res = await request(app)
            .delete('/api/admin/products/1')
            .set(authHeader);

        expect(res.status).toBe(200);
        expect(res.body).toHaveProperty('message');
    });

    test('400 — invalid ID', async () => {
        const res = await request(app)
            .delete('/api/admin/products/abc')
            .set(authHeader);

        expect(res.status).toBe(400);
    });
});

// ─── POST /api/admin/products/:id/variants ────────────────────────────────────

describe('POST /api/admin/products/:id/variants', () => {
    test('201 — creates a variant for a product', async () => {
        db.prepare.mockReturnValueOnce({ run: jest.fn().mockReturnValue({ lastInsertRowid: 20 }) });

        const res = await request(app)
            .post('/api/admin/products/1/variants')
            .set(authHeader)
            .send({ sku: 'GR-NEW', metal: 'Gold', size: '8', price: 6000, inventory: 5 });

        expect(res.status).toBe(201);
        expect(res.body).toHaveProperty('id', 20);
    });

    test('400 — missing sku or price', async () => {
        const res = await request(app)
            .post('/api/admin/products/1/variants')
            .set(authHeader)
            .send({ metal: 'Gold' });

        expect(res.status).toBe(400);
        expect(res.body).toHaveProperty('error');
    });
});

// ─── PUT /api/admin/products/variants/:variantId ──────────────────────────────

describe('PUT /api/admin/products/variants/:variantId', () => {
    test('200 — updates a variant', async () => {
        db.prepare.mockReturnValueOnce({ run: jest.fn() });

        const res = await request(app)
            .put('/api/admin/products/variants/10')
            .set(authHeader)
            .send({ sku: 'GR-001', metal: 'Gold', size: '7', price: 5500, inventory: 8, status: 'active' });

        expect(res.status).toBe(200);
        expect(res.body).toHaveProperty('message');
    });
});
