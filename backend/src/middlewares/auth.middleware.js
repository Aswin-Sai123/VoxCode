import jwt from 'jsonwebtoken';
import { ApiError } from '../utils/ApiError.js';
import { asyncHandler } from '../utils/asyncHandler.js';

export const protect = (allowedRoles = []) => {
    return asyncHandler(async (req, res, next) => {
        let token;
        if (req.headers.authorization && req.headers.authorization.startsWith('Bearer')) {
            token = req.headers.authorization.split(' ')[1];
        }

        if (!token) {
            throw new ApiError(401, 'Not authorized, no token');
        }

        let decoded;
        try {
            decoded = jwt.verify(token, process.env.JWT_ACCESS_SECRET);
        } catch (error) {
            if (error.name === 'TokenExpiredError') {
                throw new ApiError(401, 'Token expired, please refresh');
            }
            throw new ApiError(401, 'Not authorized, token invalid');
        }

        req.user = decoded; // { id, role }

        if (allowedRoles.length && !allowedRoles.includes(req.user.role)) {
            throw new ApiError(403, 'Forbidden: you do not have access to this resource');
        }

        next();
    });
};

