'use strict';

const jwt = require('jsonwebtoken');

// Set a known secret before loading the middleware
process.env.JWT_SECRET = 'test-jwt-secret';

const authMiddleware = require('../../server/middleware/auth');

describe('auth middleware', () => {
    let req, res, next;

    beforeEach(() => {
        req = { headers: {} };
        res = {
            status: jest.fn().mockReturnThis(),
            json: jest.fn()
        };
        next = jest.fn();
    });

    test('calls next() with valid Bearer token', () => {
        const token = jwt.sign({ id: 1, email: 'user@example.com' }, 'test-jwt-secret');
        req.headers.authorization = `Bearer ${token}`;

        authMiddleware(req, res, next);

        expect(next).toHaveBeenCalledTimes(1);
        expect(req.user).toMatchObject({ id: 1, email: 'user@example.com' });
        expect(res.status).not.toHaveBeenCalled();
    });

    test('returns 401 when Authorization header is missing', () => {
        authMiddleware(req, res, next);

        expect(res.status).toHaveBeenCalledWith(401);
        expect(res.json).toHaveBeenCalledWith(expect.objectContaining({ error: expect.any(String) }));
        expect(next).not.toHaveBeenCalled();
    });

    test('returns 401 when header does not start with Bearer', () => {
        req.headers.authorization = 'Basic sometoken';

        authMiddleware(req, res, next);

        expect(res.status).toHaveBeenCalledWith(401);
        expect(next).not.toHaveBeenCalled();
    });

    test('returns 401 when token is expired', () => {
        const token = jwt.sign({ id: 1 }, 'test-jwt-secret', { expiresIn: -1 });
        req.headers.authorization = `Bearer ${token}`;

        authMiddleware(req, res, next);

        expect(res.status).toHaveBeenCalledWith(401);
        expect(next).not.toHaveBeenCalled();
    });

    test('returns 401 when token is signed with wrong secret', () => {
        const token = jwt.sign({ id: 1 }, 'wrong-secret');
        req.headers.authorization = `Bearer ${token}`;

        authMiddleware(req, res, next);

        expect(res.status).toHaveBeenCalledWith(401);
        expect(next).not.toHaveBeenCalled();
    });

    test('returns 401 when token is malformed', () => {
        req.headers.authorization = 'Bearer not.a.valid.jwt';

        authMiddleware(req, res, next);

        expect(res.status).toHaveBeenCalledWith(401);
        expect(next).not.toHaveBeenCalled();
    });
});
