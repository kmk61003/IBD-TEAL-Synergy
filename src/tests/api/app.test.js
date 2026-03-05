'use strict';

const { describe, test, expect, beforeAll } = require('@jest/globals');
const request = require('supertest');

// Mock DB
jest.mock('../../lib/db', () => ({
  getDb: () => ({
    user: {
      findUnique: jest.fn().mockResolvedValue(null),
      findFirst: jest.fn().mockResolvedValue(null),
      create: jest.fn().mockResolvedValue({ id: 'test-id', email: 'test@test.com', name: 'Test' }),
      update: jest.fn(),
    },
    product: {
      findMany: jest.fn().mockResolvedValue([]),
      findUnique: jest.fn().mockResolvedValue(null),
      count: jest.fn().mockResolvedValue(0),
    },
    cartItem: {
      findMany: jest.fn().mockResolvedValue([]),
    },
  }),
}));
jest.mock('../../lib/mailer', () => ({ sendVerificationEmail: jest.fn() }));

const { createApp } = require('../../app');

let app;

beforeAll(() => {
  process.env.NODE_ENV = 'test';
  process.env.SESSION_SECRET = 'test-session-secret-for-api-tests';
  process.env.CSRF_SECRET = 'test-csrf-secret-for-api-tests';
  process.env.DEV_SKIP_EMAIL_VERIFY = 'true';
  app = createApp();
});

describe('GET /healthz', () => {
  test('returns status ok', async () => {
    const res = await request(app).get('/healthz');
    expect(res.status).toBe(200);
    expect(res.body).toMatchObject({ status: 'ok' });
    expect(res.body.uptime).toBeGreaterThanOrEqual(0);
    expect(res.body.timestamp).toBeDefined();
  });
});

describe('Catalog API', () => {
  test('GET /catalog returns HTML page', async () => {
    const res = await request(app).get('/catalog');
    expect(res.status).toBe(200);
    expect(res.headers['content-type']).toContain('text/html');
  });

  test('GET /catalog?q=ring returns 200', async () => {
    const res = await request(app).get('/catalog?q=ring');
    expect(res.status).toBe(200);
  });

  test('GET /catalog/nonexistent-slug returns 404', async () => {
    const res = await request(app).get('/catalog/this-does-not-exist');
    expect(res.status).toBe(404);
  });
});

describe('Security headers', () => {
  test('Responses include X-Content-Type-Options', async () => {
    const res = await request(app).get('/');
    expect(res.headers['x-content-type-options']).toBe('nosniff');
  });

  test('Responses include X-Frame-Options or CSP frame-ancestors', async () => {
    const res = await request(app).get('/');
    const hasXFrame = Boolean(res.headers['x-frame-options']);
    const hasCsp = Boolean(res.headers['content-security-policy']);
    expect(hasXFrame || hasCsp).toBe(true);
  });
});
