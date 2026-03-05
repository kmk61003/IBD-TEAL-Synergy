'use strict';

jest.mock('../../server/config/db');
const db = require('../../server/config/db');

const express = require('express');
const request = require('supertest');
const categoryRoutes = require('../../server/routes/categoryRoutes');

function buildApp() {
    const app = express();
    app.use(express.json());
    app.use('/api/categories', categoryRoutes);
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

describe('GET /api/categories', () => {
    beforeEach(() => jest.clearAllMocks());

    it('returns an empty array when no categories exist', async () => {
        db.prepare.mockReturnValue(mockStmt({ all: jest.fn().mockReturnValue([]) }));

        const app = buildApp();
        const res = await request(app).get('/api/categories');

        expect(res.status).toBe(200);
        expect(res.body).toEqual([]);
    });

    it('returns list of active categories', async () => {
        const categories = [
            { id: 1, name: 'Rings', slug: 'rings', status: 'active' },
            { id: 2, name: 'Necklaces', slug: 'necklaces', status: 'active' }
        ];
        db.prepare.mockReturnValue(mockStmt({ all: jest.fn().mockReturnValue(categories) }));

        const app = buildApp();
        const res = await request(app).get('/api/categories');

        expect(res.status).toBe(200);
        expect(res.body).toHaveLength(2);
        expect(res.body[0]).toMatchObject({ name: 'Rings', slug: 'rings' });
    });

    it('returns 500 when database throws an error', async () => {
        db.prepare.mockImplementation(() => {
            throw new Error('DB error');
        });

        const app = buildApp();
        const res = await request(app).get('/api/categories');

        expect(res.status).toBe(500);
        expect(res.body.error).toMatch(/failed to fetch categories/i);
    });
});
