'use strict';

const jwt = require('jsonwebtoken');

process.env.JWT_SECRET = 'test-secret';
process.env.JWT_EXPIRES_IN = '1h';

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

    it('returns 401 when no Authorization header is provided', () => {
        authMiddleware(req, res, next);
        expect(res.status).toHaveBeenCalledWith(401);
        expect(res.json).toHaveBeenCalledWith({ error: 'Access denied. No token provided.' });
        expect(next).not.toHaveBeenCalled();
    });

    it('returns 401 when Authorization header does not start with Bearer', () => {
        req.headers.authorization = 'Basic sometoken';
        authMiddleware(req, res, next);
        expect(res.status).toHaveBeenCalledWith(401);
        expect(next).not.toHaveBeenCalled();
    });

    it('calls next() and sets req.user with a valid token', () => {
        const payload = { id: 1, email: 'user@example.com' };
        const token = jwt.sign(payload, 'test-secret', { expiresIn: '1h' });
        req.headers.authorization = `Bearer ${token}`;

        authMiddleware(req, res, next);

        expect(next).toHaveBeenCalled();
        expect(req.user).toMatchObject({ id: 1, email: 'user@example.com' });
        expect(res.status).not.toHaveBeenCalled();
    });

    it('returns 401 when the token is invalid', () => {
        req.headers.authorization = 'Bearer this.is.invalid';
        authMiddleware(req, res, next);
        expect(res.status).toHaveBeenCalledWith(401);
        expect(res.json).toHaveBeenCalledWith({ error: 'Invalid or expired token.' });
        expect(next).not.toHaveBeenCalled();
    });

    it('returns 401 when the token is signed with a wrong secret', () => {
        const token = jwt.sign({ id: 1, email: 'user@example.com' }, 'wrong-secret');
        req.headers.authorization = `Bearer ${token}`;
        authMiddleware(req, res, next);
        expect(res.status).toHaveBeenCalledWith(401);
        expect(next).not.toHaveBeenCalled();
    });

    it('returns 401 when the token is expired', () => {
        const token = jwt.sign({ id: 1, email: 'user@example.com' }, 'test-secret', { expiresIn: '0s' });
        req.headers.authorization = `Bearer ${token}`;
        authMiddleware(req, res, next);
        expect(res.status).toHaveBeenCalledWith(401);
        expect(next).not.toHaveBeenCalled();
    });
});
