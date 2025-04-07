import express from 'express';
import jwt from 'jsonwebtoken';
import { supabase } from '../lib/supabase';
import { ApiError } from '../middleware/errorHandler';
import { auth } from '../middleware/auth';
import { body, validationResult } from 'express-validator';

const router = express.Router();

// Validation middleware
const validateLogin = [
  body('email').isEmail().withMessage('Please provide a valid email'),
  body('password').notEmpty().withMessage('Password is required')
];

const validateRegister = [
  body('email').isEmail().withMessage('Please provide a valid email'),
  body('password').isLength({ min: 6 }).withMessage('Password must be at least 6 characters long'),
  body('full_name').optional().isString().withMessage('Full name must be a string')
];

// Login route
router.post('/login', validateLogin, async (req, res, next) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }

    const { email, password } = req.body;

    // Sign in with Supabase
    const { data, error } = await supabase.auth.signInWithPassword({
      email,
      password,
    });

    if (error) {
      throw new ApiError(401, error.message);
    }

    if (!data.user) {
      throw new ApiError(401, 'Invalid credentials');
    }

    // Get user profile
    const { data: profile, error: profileError } = await supabase
      .from('profiles')
      .select('*')
      .eq('id', data.user.id)
      .single();

    if (profileError) {
      throw new ApiError(500, profileError.message);
    }

    // Generate JWT token
    const jwtSecret = process.env.JWT_SECRET;
    if (!jwtSecret) {
      throw new ApiError(500, 'JWT secret not configured');
    }

    const token = jwt.sign(
      { id: data.user.id, email: data.user.email },
      jwtSecret,
      { expiresIn: process.env.JWT_EXPIRES_IN || '7d' }
    );

    res.status(200).json({
      success: true,
      token,
      user: {
        id: data.user.id,
        email: data.user.email,
        ...profile
      }
    });
  } catch (error) {
    next(error);
  }
});

// Register route
router.post('/register', validateRegister, async (req, res, next) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }

    const { email, password, full_name } = req.body;

    // Check if user already exists
    const { data: existingUser } = await supabase
      .from('users')
      .select('*')
      .eq('email', email)
      .single();

    if (existingUser) {
      throw new ApiError(409, 'User already exists');
    }

    // Sign up with Supabase
    const { data, error } = await supabase.auth.signUp({
      email,
      password,
      options: {
        data: {
          full_name
        }
      }
    });

    if (error) {
      throw new ApiError(400, error.message);
    }

    if (!data.user) {
      throw new ApiError(400, 'Registration failed');
    }

    // Initialize user profile
    const { error: profileError } = await supabase
      .from('profiles')
      .insert([
        {
          id: data.user.id,
          full_name,
          tier: 'free',
          is_premium: false,
        }
      ]);

    if (profileError) {
      throw new ApiError(500, profileError.message);
    }

    // Generate JWT token
    const jwtSecret = process.env.JWT_SECRET;
    if (!jwtSecret) {
      throw new ApiError(500, 'JWT secret not configured');
    }

    const token = jwt.sign(
      { id: data.user.id, email: data.user.email },
      jwtSecret,
      { expiresIn: process.env.JWT_EXPIRES_IN || '7d' }
    );

    res.status(201).json({
      success: true,
      token,
      user: {
        id: data.user.id,
        email: data.user.email,
        full_name,
        tier: 'free',
        is_premium: false
      }
    });
  } catch (error) {
    next(error);
  }
});

// Logout route
router.post('/logout', async (req, res) => {
  res.status(200).json({
    success: true,
    message: 'Logout successful'
  });
});

// Get current user route
router.get('/me', auth, async (req, res) => {
  res.status(200).json({
    success: true,
    user: req.user
  });
});

// Refresh token route
router.post('/refresh', auth, async (req, res, next) => {
  try {
    // Generate new JWT token
    const jwtSecret = process.env.JWT_SECRET;
    if (!jwtSecret) {
      throw new ApiError(500, 'JWT secret not configured');
    }

    const token = jwt.sign(
      { id: req.user.id, email: req.user.email },
      jwtSecret,
      { expiresIn: process.env.JWT_EXPIRES_IN || '7d' }
    );

    res.status(200).json({
      success: true,
      token
    });
  } catch (error) {
    next(error);
  }
});

export default router; 