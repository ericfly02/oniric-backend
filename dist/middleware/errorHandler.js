"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.notFound = exports.errorHandler = exports.ApiError = void 0;
// Custom error class with status code
class ApiError extends Error {
    statusCode;
    constructor(statusCode, message) {
        super(message);
        this.statusCode = statusCode;
        this.name = this.constructor.name;
        Error.captureStackTrace(this, this.constructor);
    }
}
exports.ApiError = ApiError;
// Error handling middleware
const errorHandler = (err, req, res, next) => {
    console.error('Error:', err);
    // Default to 500 Internal Server Error if no status code is available
    const statusCode = 'statusCode' in err ? err.statusCode : 500;
    const message = err.message || 'Something went wrong';
    // Set response
    res.status(statusCode).json({
        success: false,
        error: {
            message,
            ...(process.env.NODE_ENV === 'development' ? { stack: err.stack } : {}),
        },
    });
};
exports.errorHandler = errorHandler;
// Not found error generator
const notFound = (req, res, next) => {
    const error = new ApiError(404, `Resource not found - ${req.originalUrl}`);
    next(error);
};
exports.notFound = notFound;
//# sourceMappingURL=errorHandler.js.map