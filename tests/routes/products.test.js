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

const mockProduct = {
    id: 1,
    name: 'Gold Ring',
    short_description: 'Beautiful gold ring',
    status: 'active',
    primary_image: '/uploads/products/ring.jpg',
    min_price: 5000,
    max_price: 8000,
    categories: 'Rings'
};

const mockVariants = [
    { id: 10, master_product_id: 1, sku: 'GR-001', metal: 'Gold', size: '7', price: 5000, inventory: 10, status: 'active' }
];

const mockImages = [
    { id: 1, master_product_id: 1, image_path: '/uploads/products/ring.jpg', is_primary: 1 }
];

// ─── GET /api/products ────────────────────────────────────────────────────────

describe('GET /api/products', () => {
    test('200 — returns paginated product list', async () => {
        db.prepare
            .mockReturnValueOnce({ get: jest.fn().mockReturnValue({ total: 1 }) })    // COUNT
            .mockReturnValueOnce({ all: jest.fn().mockReturnValue([mockProduct]) });   // SELECT

        const res = await request(app).get('/api/products');

        expect(res.status).toBe(200);
        expect(res.body).toHaveProperty('products');
        expect(res.body).toHaveProperty('pagination');
        expect(res.body.products).toHaveLength(1);
        expect(res.body.pagination).toMatchObject({ page: 1, limit: 12, total: 1 });
    });

    test('200 — supports category filter', async () => {
        db.prepare
            .mockReturnValueOnce({ get: jest.fn().mockReturnValue({ total: 1 }) })
            .mockReturnValueOnce({ all: jest.fn().mockReturnValue([mockProduct]) });

        const res = await request(app).get('/api/products?category=rings');

        expect(res.status).toBe(200);
        expect(res.body.products).toHaveLength(1);
    });

    test('200 — supports search filter', async () => {
        db.prepare
            .mockReturnValueOnce({ get: jest.fn().mockReturnValue({ total: 1 }) })
            .mockReturnValueOnce({ all: jest.fn().mockReturnValue([mockProduct]) });

        const res = await request(app).get('/api/products?search=gold');

        expect(res.status).toBe(200);
        expect(res.body.products).toHaveLength(1);
    });

    test('200 — returns empty product list when none exist', async () => {
        db.prepare
            .mockReturnValueOnce({ get: jest.fn().mockReturnValue({ total: 0 }) })
            .mockReturnValueOnce({ all: jest.fn().mockReturnValue([]) });

        const res = await request(app).get('/api/products');

        expect(res.status).toBe(200);
        expect(res.body.products).toHaveLength(0);
        expect(res.body.pagination.total).toBe(0);
    });
});

// ─── GET /api/products/:id ────────────────────────────────────────────────────

describe('GET /api/products/:id', () => {
    test('200 — returns product detail with variants, images and categories', async () => {
        db.prepare
            .mockReturnValueOnce({ get: jest.fn().mockReturnValue({ id: 1, name: 'Gold Ring', status: 'active' }) }) // master_product
            .mockReturnValueOnce({ run: jest.fn() })                                     // INSERT product_view
            .mockReturnValueOnce({ all: jest.fn().mockReturnValue(mockVariants) })       // variants
            .mockReturnValueOnce({ all: jest.fn().mockReturnValue(mockImages) })         // images
            .mockReturnValueOnce({ all: jest.fn().mockReturnValue([{ id: 1, name: 'Rings', slug: 'rings' }]) }); // categories

        const res = await request(app).get('/api/products/1');

        expect(res.status).toBe(200);
        expect(res.body).toMatchObject({ id: 1, name: 'Gold Ring' });
        expect(res.body.variants).toHaveLength(1);
        expect(res.body.images).toHaveLength(1);
        expect(res.body.categories).toHaveLength(1);
    });

    test('404 — product not found', async () => {
        db.prepare.mockReturnValueOnce({ get: jest.fn().mockReturnValue(null) });

        const res = await request(app).get('/api/products/999');

        expect(res.status).toBe(404);
        expect(res.body).toHaveProperty('error');
    });

    test('400 — invalid product ID', async () => {
        const res = await request(app).get('/api/products/abc');

        expect(res.status).toBe(400);
        expect(res.body).toHaveProperty('error');
    });
});

// ─── GET /api/products/:id/recommendations/bestsellers ───────────────────────

describe('GET /api/products/:id/recommendations/bestsellers', () => {
    test('200 — returns bestseller recommendations', async () => {
        db.prepare
            .mockReturnValueOnce({ all: jest.fn().mockReturnValue([{ category_id: 1 }]) })  // get category IDs
            .mockReturnValueOnce({ all: jest.fn().mockReturnValue([mockProduct]) });          // bestsellers query

        const res = await request(app).get('/api/products/1/recommendations/bestsellers');

        expect(res.status).toBe(200);
        expect(Array.isArray(res.body)).toBe(true);
    });

    test('200 — returns empty array when product has no categories', async () => {
        db.prepare.mockReturnValueOnce({ all: jest.fn().mockReturnValue([]) }); // no category IDs

        const res = await request(app).get('/api/products/1/recommendations/bestsellers');

        expect(res.status).toBe(200);
        expect(res.body).toEqual([]);
    });
});

// ─── GET /api/products/:id/recommendations/similar ───────────────────────────

describe('GET /api/products/:id/recommendations/similar', () => {
    test('200 — returns similar product recommendations', async () => {
        db.prepare
            .mockReturnValueOnce({ all: jest.fn().mockReturnValue([{ category_id: 1 }]) })
            .mockReturnValueOnce({ all: jest.fn().mockReturnValue([mockProduct]) });

        const res = await request(app).get('/api/products/1/recommendations/similar');

        expect(res.status).toBe(200);
        expect(Array.isArray(res.body)).toBe(true);
    });

    test('200 — returns empty array when product has no categories', async () => {
        db.prepare.mockReturnValueOnce({ all: jest.fn().mockReturnValue([]) });

        const res = await request(app).get('/api/products/1/recommendations/similar');

        expect(res.status).toBe(200);
        expect(res.body).toEqual([]);
    });
});
