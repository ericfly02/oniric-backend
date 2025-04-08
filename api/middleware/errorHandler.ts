import { Request, Response, NextFunction } from 'express';

// Custom error class with status code
export class ApiError extends Error {
  statusCode: number;
  
  constructor(statusCode: number, message: string) {
    super(message);
    this.statusCode = statusCode;
    this.name = this.constructor.name;
    Error.captureStackTrace(this, this.constructor);
  }
}

// Error handling middleware
export const errorHandler = (
  err: Error | ApiError,
  req: Request,
  res: Response,
  next: NextFunction
) => {
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

// Not found error generator
export const notFound = (req: Request, res: Response, next: NextFunction) => {
  const error = new ApiError(404, `Resource not found - ${req.originalUrl}`);
  next(error);
}; 