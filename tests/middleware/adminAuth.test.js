'use strict';

const jwt = require('jsonwebtoken');

process.env.JWT_SECRET = 'test-secret';

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

    it('returns 401 when no Authorization header is provided', () => {
        adminAuthMiddleware(req, res, next);
        expect(res.status).toHaveBeenCalledWith(401);
        expect(res.json).toHaveBeenCalledWith({ error: 'Admin access denied. No token provided.' });
        expect(next).not.toHaveBeenCalled();
    });

    it('returns 401 when Authorization header does not start with Bearer', () => {
        req.headers.authorization = 'Basic sometoken';
        adminAuthMiddleware(req, res, next);
        expect(res.status).toHaveBeenCalledWith(401);
        expect(next).not.toHaveBeenCalled();
    });

    it('calls next() and sets req.admin with a valid admin token', () => {
        const payload = { id: 1, username: 'admin', role: 'admin', isAdmin: true };
        const token = jwt.sign(payload, 'test-secret', { expiresIn: '1h' });
        req.headers.authorization = `Bearer ${token}`;

        adminAuthMiddleware(req, res, next);

        expect(next).toHaveBeenCalled();
        expect(req.admin).toMatchObject({ id: 1, username: 'admin', isAdmin: true });
        expect(res.status).not.toHaveBeenCalled();
    });

    it('returns 403 when token is valid but isAdmin is false', () => {
        const payload = { id: 2, username: 'customer', isAdmin: false };
        const token = jwt.sign(payload, 'test-secret', { expiresIn: '1h' });
        req.headers.authorization = `Bearer ${token}`;

        adminAuthMiddleware(req, res, next);

        expect(res.status).toHaveBeenCalledWith(403);
        expect(res.json).toHaveBeenCalledWith({ error: 'Forbidden. Admin access required.' });
        expect(next).not.toHaveBeenCalled();
    });

    it('returns 403 when token is valid but isAdmin flag is missing', () => {
        const payload = { id: 2, username: 'customer' };
        const token = jwt.sign(payload, 'test-secret', { expiresIn: '1h' });
        req.headers.authorization = `Bearer ${token}`;

        adminAuthMiddleware(req, res, next);

        expect(res.status).toHaveBeenCalledWith(403);
        expect(next).not.toHaveBeenCalled();
    });

    it('returns 401 when the token is invalid', () => {
        req.headers.authorization = 'Bearer not.a.valid.token';
        adminAuthMiddleware(req, res, next);
        expect(res.status).toHaveBeenCalledWith(401);
        expect(res.json).toHaveBeenCalledWith({ error: 'Invalid or expired admin token.' });
        expect(next).not.toHaveBeenCalled();
    });

    it('returns 401 when the token is signed with a wrong secret', () => {
        const token = jwt.sign({ id: 1, isAdmin: true }, 'wrong-secret');
        req.headers.authorization = `Bearer ${token}`;
        adminAuthMiddleware(req, res, next);
        expect(res.status).toHaveBeenCalledWith(401);
        expect(next).not.toHaveBeenCalled();
    });
});
