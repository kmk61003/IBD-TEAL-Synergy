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

describe('GET /api/categories', () => {
    test('200 — returns list of active categories', async () => {
        const mockCategories = [
            { id: 1, name: 'Rings', slug: 'rings', status: 'active' },
            { id: 2, name: 'Necklaces', slug: 'necklaces', status: 'active' }
        ];
        db.prepare.mockReturnValueOnce({ all: jest.fn().mockReturnValue(mockCategories) });

        const res = await request(app).get('/api/categories');

        expect(res.status).toBe(200);
        expect(res.body).toEqual(mockCategories);
    });

    test('200 — returns empty array when no categories exist', async () => {
        db.prepare.mockReturnValueOnce({ all: jest.fn().mockReturnValue([]) });

        const res = await request(app).get('/api/categories');

        expect(res.status).toBe(200);
        expect(res.body).toEqual([]);
    });
});
