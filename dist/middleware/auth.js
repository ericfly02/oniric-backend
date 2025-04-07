"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.optionalAuth = exports.auth = void 0;
const jsonwebtoken_1 = __importDefault(require("jsonwebtoken"));
const errorHandler_1 = require("./errorHandler");
const supabase_1 = require("../lib/supabase");
const auth = async (req, res, next) => {
    try {
        // Get token from header
        const authHeader = req.headers.authorization;
        if (!authHeader || !authHeader.startsWith('Bearer ')) {
            throw new errorHandler_1.ApiError(401, 'Authorization token required');
        }
        const token = authHeader.split(' ')[1];
        if (!token) {
            throw new errorHandler_1.ApiError(401, 'Authorization token required');
        }
        // Verify token
        const jwtSecret = process.env.JWT_SECRET;
        if (!jwtSecret) {
            throw new errorHandler_1.ApiError(500, 'JWT secret not configured');
        }
        try {
            const decoded = jsonwebtoken_1.default.verify(token, jwtSecret);
            // Get user from database
            const user = await (0, supabase_1.getUserById)(decoded.id);
            if (!user) {
                throw new errorHandler_1.ApiError(401, 'User not found');
            }
            // Add user to request object
            req.user = user;
            req.userId = user.id;
            next();
        }
        catch (error) {
            throw new errorHandler_1.ApiError(401, 'Invalid or expired token');
        }
    }
    catch (error) {
        next(error);
    }
};
exports.auth = auth;
// Optional auth middleware - doesn't require authentication but will
// add user to request if token is valid
const optionalAuth = async (req, res, next) => {
    try {
        // Get token from header
        const authHeader = req.headers.authorization;
        if (!authHeader || !authHeader.startsWith('Bearer ')) {
            return next();
        }
        const token = authHeader.split(' ')[1];
        if (!token) {
            return next();
        }
        // Verify token
        const jwtSecret = process.env.JWT_SECRET;
        if (!jwtSecret) {
            throw new errorHandler_1.ApiError(500, 'JWT secret not configured');
        }
        try {
            const decoded = jsonwebtoken_1.default.verify(token, jwtSecret);
            // Get user from database
            const user = await (0, supabase_1.getUserById)(decoded.id);
            if (user) {
                // Add user to request object
                req.user = user;
                req.userId = user.id;
            }
            next();
        }
        catch (error) {
            // Ignore token validation errors in optional auth
            next();
        }
    }
    catch (error) {
        next(error);
    }
};
exports.optionalAuth = optionalAuth;
//# sourceMappingURL=auth.js.map