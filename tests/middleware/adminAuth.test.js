'use strict';

const jwt = require('jsonwebtoken');

process.env.JWT_SECRET = 'test-jwt-secret';

const adminAuthMiddleware = require('../../server/middleware/adminAuth');

describe('adminAuth middleware', () => {
    let req, res, next;

    beforeEach(() => {
        req = { headers: {} };
        res = {
            status: jest.fn().mockReturnThis(),
            json: jest.fn()
        };
        next = jest.fn();
    });

    test('calls next() with a valid admin token', () => {
        const token = jwt.sign(
            { id: 1, username: 'admin', role: 'admin', isAdmin: true },
            'test-jwt-secret'
        );
        req.headers.authorization = `Bearer ${token}`;

        adminAuthMiddleware(req, res, next);

        expect(next).toHaveBeenCalledTimes(1);
        expect(req.admin).toMatchObject({ id: 1, username: 'admin', isAdmin: true });
        expect(res.status).not.toHaveBeenCalled();
    });

    test('returns 401 when Authorization header is missing', () => {
        adminAuthMiddleware(req, res, next);

        expect(res.status).toHaveBeenCalledWith(401);
        expect(res.json).toHaveBeenCalledWith(expect.objectContaining({ error: expect.any(String) }));
        expect(next).not.toHaveBeenCalled();
    });

    test('returns 403 when token is valid but isAdmin flag is false', () => {
        const token = jwt.sign({ id: 2, email: 'user@example.com', isAdmin: false }, 'test-jwt-secret');
        req.headers.authorization = `Bearer ${token}`;

        adminAuthMiddleware(req, res, next);

        expect(res.status).toHaveBeenCalledWith(403);
        expect(res.json).toHaveBeenCalledWith(expect.objectContaining({ error: expect.any(String) }));
        expect(next).not.toHaveBeenCalled();
    });

    test('returns 403 when token is valid but isAdmin flag is missing', () => {
        const token = jwt.sign({ id: 2, email: 'user@example.com' }, 'test-jwt-secret');
        req.headers.authorization = `Bearer ${token}`;

        adminAuthMiddleware(req, res, next);

        expect(res.status).toHaveBeenCalledWith(403);
        expect(next).not.toHaveBeenCalled();
    });

    test('returns 401 when token is expired', () => {
        const token = jwt.sign({ id: 1, isAdmin: true }, 'test-jwt-secret', { expiresIn: -1 });
        req.headers.authorization = `Bearer ${token}`;

        adminAuthMiddleware(req, res, next);

        expect(res.status).toHaveBeenCalledWith(401);
        expect(next).not.toHaveBeenCalled();
    });

    test('returns 401 when token is signed with wrong secret', () => {
        const token = jwt.sign({ id: 1, isAdmin: true }, 'wrong-secret');
        req.headers.authorization = `Bearer ${token}`;

        adminAuthMiddleware(req, res, next);

        expect(res.status).toHaveBeenCalledWith(401);
        expect(next).not.toHaveBeenCalled();
    });
});
