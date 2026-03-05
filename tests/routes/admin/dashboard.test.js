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

// ─── GET /api/admin/dashboard ─────────────────────────────────────────────────

describe('GET /api/admin/dashboard', () => {
    test('200 — returns dashboard stats and recent orders', async () => {
        const mockStats = {
            total_orders: 10,
            pending_orders: 2,
            total_revenue: 150000,
            active_products: 25,
            total_customers: 50,
            active_categories: 6
        };
        const mockRecentOrders = [
            {
                id: 100,
                order_number: 'ORD-001',
                order_total: 11800,
                order_status: 'confirmed',
                payment_status: 'paid',
                created_at: '2024-01-01',
                first_name: 'Alice',
                last_name: 'Smith'
            }
        ];

        db.prepare
            .mockReturnValueOnce({ get: jest.fn().mockReturnValue(mockStats) })
            .mockReturnValueOnce({ all: jest.fn().mockReturnValue(mockRecentOrders) });

        const res = await request(app).get('/api/admin/dashboard').set(authHeader);

        expect(res.status).toBe(200);
        expect(res.body).toHaveProperty('stats');
        expect(res.body.stats).toMatchObject({
            total_orders: 10,
            active_products: 25,
            total_customers: 50
        });
        expect(res.body).toHaveProperty('recent_orders');
        expect(res.body.recent_orders).toHaveLength(1);
    });

    test('401 — unauthenticated', async () => {
        const res = await request(app).get('/api/admin/dashboard');

        expect(res.status).toBe(401);
    });

    test('403 — non-admin JWT is rejected', async () => {
        const customerToken = jwt.sign({ id: 2, email: 'user@example.com' }, 'test-jwt-secret');

        const res = await request(app)
            .get('/api/admin/dashboard')
            .set('Authorization', `Bearer ${customerToken}`);

        expect(res.status).toBe(403);
    });
});
