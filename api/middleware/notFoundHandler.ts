import { Request, Response, NextFunction } from 'express';
import { ApiError } from './errorHandler';

export const notFoundHandler = (
  req: Request,
  res: Response,
  next: NextFunction
) => {
  const error = new ApiError(404, `Resource not found - ${req.originalUrl}`);
  next(error);
}; 