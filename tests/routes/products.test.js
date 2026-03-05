'use strict';

process.env.JWT_SECRET = 'test-secret';

jest.mock('../../server/config/db');
const db = require('../../server/config/db');

const express = require('express');
const request = require('supertest');
const productRoutes = require('../../server/routes/productRoutes');

function buildApp() {
    const app = express();
    app.use(express.json());
    app.use('/api/products', productRoutes);
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

describe('GET /api/products', () => {
    beforeEach(() => jest.clearAllMocks());

    it('returns paginated product list with default params', async () => {
        const countStmt = mockStmt({ get: jest.fn().mockReturnValue({ total: 0 }) });
        const listStmt = mockStmt({ all: jest.fn().mockReturnValue([]) });
        db.prepare
            .mockReturnValueOnce(countStmt)
            .mockReturnValueOnce(listStmt);

        const app = buildApp();
        const res = await request(app).get('/api/products');

        expect(res.status).toBe(200);
        expect(res.body).toHaveProperty('products');
        expect(res.body).toHaveProperty('pagination');
        expect(res.body.pagination.page).toBe(1);
        expect(res.body.pagination.limit).toBe(12);
    });

    it('returns products filtered by category and search', async () => {
        const countStmt = mockStmt({ get: jest.fn().mockReturnValue({ total: 1 }) });
        const product = {
            id: 1, name: 'Gold Ring', short_description: 'A gold ring',
            status: 'active', primary_image: null, min_price: 99, max_price: 99, categories: 'Rings'
        };
        const listStmt = mockStmt({ all: jest.fn().mockReturnValue([product]) });
        db.prepare
            .mockReturnValueOnce(countStmt)
            .mockReturnValueOnce(listStmt);

        const app = buildApp();
        const res = await request(app).get('/api/products?category=rings&search=gold&page=1&limit=5');

        expect(res.status).toBe(200);
        expect(res.body.products).toHaveLength(1);
        expect(res.body.products[0].name).toBe('Gold Ring');
        expect(res.body.pagination.limit).toBe(5);
    });
});

describe('GET /api/products/:id', () => {
    beforeEach(() => jest.clearAllMocks());

    it('returns 400 for non-numeric product ID', async () => {
        const app = buildApp();
        const res = await request(app).get('/api/products/abc');
        expect(res.status).toBe(400);
        expect(res.body.error).toMatch(/invalid product id/i);
    });

    it('returns 404 when product is not found', async () => {
        db.prepare.mockReturnValue(mockStmt({ get: jest.fn().mockReturnValue(undefined) }));

        const app = buildApp();
        const res = await request(app).get('/api/products/999');
        expect(res.status).toBe(404);
        expect(res.body.error).toMatch(/not found/i);
    });

    it('returns product detail with variants, images and categories', async () => {
        const product = { id: 1, name: 'Gold Ring', status: 'active', description: 'Nice ring' };
        const variants = [{ id: 10, sku: 'GR-001', price: 99 }];
        const images = [{ id: 5, image_path: '/img/ring.jpg', is_primary: 1 }];
        const categories = [{ id: 2, name: 'Rings', slug: 'rings' }];

        db.prepare
            .mockReturnValueOnce(mockStmt({ get: jest.fn().mockReturnValue(product) }))  // SELECT product
            .mockReturnValueOnce(mockStmt({ run: jest.fn() }))                           // INSERT product_view
            .mockReturnValueOnce(mockStmt({ all: jest.fn().mockReturnValue(variants) })) // SELECT variants
            .mockReturnValueOnce(mockStmt({ all: jest.fn().mockReturnValue(images) }))   // SELECT images
            .mockReturnValueOnce(mockStmt({ all: jest.fn().mockReturnValue(categories) })); // SELECT categories

        const app = buildApp();
        const res = await request(app).get('/api/products/1');

        expect(res.status).toBe(200);
        expect(res.body.id).toBe(1);
        expect(res.body.variants).toHaveLength(1);
        expect(res.body.images).toHaveLength(1);
        expect(res.body.categories).toHaveLength(1);
    });
});

describe('GET /api/products/:id/recommendations/bestsellers', () => {
    beforeEach(() => jest.clearAllMocks());

    it('returns 400 for non-numeric product ID', async () => {
        const app = buildApp();
        const res = await request(app).get('/api/products/abc/recommendations/bestsellers');
        expect(res.status).toBe(400);
    });

    it('returns empty array when product has no categories', async () => {
        db.prepare.mockReturnValue(mockStmt({ all: jest.fn().mockReturnValue([]) }));

        const app = buildApp();
        const res = await request(app).get('/api/products/1/recommendations/bestsellers');

        expect(res.status).toBe(200);
        expect(res.body).toEqual([]);
    });

    it('returns bestseller products when categories exist', async () => {
        const catStmt = mockStmt({ all: jest.fn().mockReturnValue([{ category_id: 2 }]) });
        const bestsellers = [{ id: 5, name: 'Silver Necklace', total_sold: 10 }];
        const bsStmt = mockStmt({ all: jest.fn().mockReturnValue(bestsellers) });

        db.prepare
            .mockReturnValueOnce(catStmt)
            .mockReturnValueOnce(bsStmt);

        const app = buildApp();
        const res = await request(app).get('/api/products/1/recommendations/bestsellers');

        expect(res.status).toBe(200);
        expect(res.body).toHaveLength(1);
        expect(res.body[0].name).toBe('Silver Necklace');
    });
});

describe('GET /api/products/:id/recommendations/similar', () => {
    beforeEach(() => jest.clearAllMocks());

    it('returns empty array when product has no categories', async () => {
        db.prepare.mockReturnValue(mockStmt({ all: jest.fn().mockReturnValue([]) }));

        const app = buildApp();
        const res = await request(app).get('/api/products/1/recommendations/similar');

        expect(res.status).toBe(200);
        expect(res.body).toEqual([]);
    });

    it('returns similar products when categories exist', async () => {
        const catStmt = mockStmt({ all: jest.fn().mockReturnValue([{ category_id: 3 }]) });
        const similar = [{ id: 7, name: 'Gold Bracelet', view_count: 25 }];
        const simStmt = mockStmt({ all: jest.fn().mockReturnValue(similar) });

        db.prepare
            .mockReturnValueOnce(catStmt)
            .mockReturnValueOnce(simStmt);

        const app = buildApp();
        const res = await request(app).get('/api/products/1/recommendations/similar');

        expect(res.status).toBe(200);
        expect(res.body).toHaveLength(1);
        expect(res.body[0].name).toBe('Gold Bracelet');
    });
});
