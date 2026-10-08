const jwt = require('jsonwebtoken');

const protect = (allowedRoles = []) => {
    return (req, res, next) => {
        let token;
        if (req.headers.authorization && req.headers.authorization.startsWith('Bearer')) {
            token = req.headers.authorization.split(' ')[1];
        }

        if (!token) {
            return res.status(401).json({ message: 'Not authorized, no token' });
        }

        try {
            const decoded = jwt.verify(token, process.env.JWT_ACCESS_SECRET);
            req.user = decoded; // { id, role }

            if (allowedRoles.length && !allowedRoles.includes(req.user.role)) {
                return res.status(403).json({ message: 'Forbidden' });
            }

            next();
        } catch (error) {
            console.error(error);
            res.status(401).json({ message: 'Not authorized, token failed' });
        }
    };
};

module.exports = { protect };
