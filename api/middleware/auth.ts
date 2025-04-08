import { Request, Response, NextFunction } from 'express';
import jwt from 'jsonwebtoken';
import { ApiError } from './errorHandler';
import { getUserById } from '../lib/supabase';

// Extend Express Request type to include user property
declare global {
  namespace Express {
    interface Request {
      user?: any;
      userId?: string;
    }
  }
}

export const auth = async (req: Request, res: Response, next: NextFunction) => {
  try {
    // Get token from header
    const authHeader = req.headers.authorization;
    
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      throw new ApiError(401, 'Authorization token required');
    }
    
    const token = authHeader.split(' ')[1];
    
    if (!token) {
      throw new ApiError(401, 'Authorization token required');
    }
    
    // Verify token
    const jwtSecret = process.env.JWT_SECRET;
    if (!jwtSecret) {
      throw new ApiError(500, 'JWT secret not configured');
    }
    
    try {
      const decoded = jwt.verify(token, jwtSecret) as { id: string };
      
      // Get user from database
      const user = await getUserById(decoded.id);
      
      if (!user) {
        throw new ApiError(401, 'User not found');
      }
      
      // Add user to request object
      req.user = user;
      req.userId = user.id;
      
      next();
    } catch (error) {
      throw new ApiError(401, 'Invalid or expired token');
    }
  } catch (error) {
    next(error);
  }
};

// Optional auth middleware - doesn't require authentication but will
// add user to request if token is valid
export const optionalAuth = async (req: Request, res: Response, next: NextFunction) => {
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
      throw new ApiError(500, 'JWT secret not configured');
    }
    
    try {
      const decoded = jwt.verify(token, jwtSecret) as { id: string };
      
      // Get user from database
      const user = await getUserById(decoded.id);
      
      if (user) {
        // Add user to request object
        req.user = user;
        req.userId = user.id;
      }
      
      next();
    } catch (error) {
      // Ignore token validation errors in optional auth
      next();
    }
  } catch (error) {
    next(error);
  }
}; 