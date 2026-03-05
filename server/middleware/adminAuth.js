const jwt = require('jsonwebtoken');

module.exports = function (req, res, next) {
    const header = req.headers.authorization;
    if (!header || !header.startsWith('Bearer ')) {
        return res.status(401).json({ error: 'Admin access denied. No token provided.' });
    }

    try {
        const token = header.split(' ')[1];
        const decoded = jwt.verify(token, process.env.JWT_SECRET);
        if (!decoded.isAdmin) {
            return res.status(403).json({ error: 'Forbidden. Admin access required.' });
        }
        req.admin = decoded; // { id, username, role, isAdmin }
        next();
    } catch (err) {
        res.status(401).json({ error: 'Invalid or expired admin token.' });
    }
};
