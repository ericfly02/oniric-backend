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
    
    try {
      // First try to verify as Supabase JWT
      const decodedToken = jwt.decode(token);
      console.log("Decoded token:", JSON.stringify(decodedToken).substring(0, 100) + '...');
      
      if (!decodedToken) {
        throw new Error('Invalid token format');
      }
      
      // Handle different token formats
      let userId;
      
      if (typeof decodedToken === 'object') {
        // Supabase token format
        if (decodedToken?.sub) {
          // This is a Supabase token, verify it properly
          const supabaseJwtSecret = process.env.SUPABASE_JWT_SECRET;
          if (!supabaseJwtSecret) {
            throw new ApiError(500, 'Supabase JWT secret not configured');
          }
          
          try {
            jwt.verify(token, supabaseJwtSecret);
            userId = decodedToken.sub;
          } catch (err) {
            throw new ApiError(401, 'Invalid or expired Supabase token');
          }
        } 
        // Our custom JWT format
        else if (decodedToken?.id) {
          // Verify with our secret for custom tokens
          const jwtSecret = process.env.JWT_SECRET;
          if (!jwtSecret) {
            throw new ApiError(500, 'JWT secret not configured');
          }
          jwt.verify(token, jwtSecret);
          userId = decodedToken.id;
        } else {
          throw new Error('Invalid token payload');
        }
      } else {
        throw new Error('Invalid token format');
      }
      
      // Get user from database using userId
      console.log("Looking up user with ID:", userId);
      const user = await getUserById(userId);
      
      if (!user) {
        throw new ApiError(401, 'User not found');
      }
      
      // Add user to request object
      req.user = user;
      req.userId = user.id;
      
      next();
    } catch (error) {
      console.error('Token verification error:', error);
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
    
    try {
      // First try to verify as Supabase JWT
      const decodedToken = jwt.decode(token);
      
      if (!decodedToken) {
        return next();
      }
      
      // Handle different token formats
      let userId;
      
      if (typeof decodedToken === 'object') {
        // Supabase token format
        if (decodedToken?.sub) {
          userId = decodedToken.sub;
        } 
        // Our custom JWT format
        else if (decodedToken?.id) {
          // Verify with our secret for custom tokens
          const jwtSecret = process.env.JWT_SECRET;
          if (!jwtSecret) {
            return next();
          }
          try {
            jwt.verify(token, jwtSecret);
            userId = decodedToken.id;
          } catch (e) {
            return next();
          }
        } else {
          return next();
        }
      } else {
        return next();
      }
      
      // Get user from database using userId
      const user = await getUserById(userId);
      
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