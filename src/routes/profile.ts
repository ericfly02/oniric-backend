import express from 'express';
import { supabase } from '../lib/supabase';
import { auth } from '../middleware/auth';
import { ApiError } from '../middleware/errorHandler';
import { Profile } from '../types/database.types';
import { body, validationResult } from 'express-validator';

const router = express.Router();

// Validation middleware
const validateProfileUpdate = [
  body('username').optional().isString().withMessage('Username must be a string'),
  body('full_name').optional().isString().withMessage('Full name must be a string'),
  body('avatar_url').optional().isURL().withMessage('Avatar URL must be a valid URL'),
];

// Get user profile
router.get('/', auth, async (req, res, next) => {
  try {
    const userId = req.userId;

    if (!userId) {
      throw new ApiError(401, 'Authentication required');
    }

    const { data, error } = await supabase
      .from('profiles')
      .select('*')
      .eq('id', userId)
      .single();

    if (error) {
      throw new ApiError(500, error.message);
    }

    if (!data) {
      throw new ApiError(404, 'Profile not found');
    }

    res.status(200).json({
      success: true,
      data,
    });
  } catch (error) {
    next(error);
  }
});

// Update user profile
router.put('/', auth, validateProfileUpdate, async (req, res, next) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }

    const userId = req.userId;

    if (!userId) {
      throw new ApiError(401, 'Authentication required');
    }

    const updates: Partial<Profile> = req.body;
    
    // Prevent updating restricted fields
    delete updates.id;
    delete updates.tier;
    delete updates.is_premium;
    delete updates.created_at;
    delete updates.updated_at;

    const { data, error } = await supabase
      .from('profiles')
      .update(updates)
      .eq('id', userId)
      .select()
      .single();

    if (error) {
      throw new ApiError(500, error.message);
    }

    if (!data) {
      throw new ApiError(404, 'Profile not found');
    }

    res.status(200).json({
      success: true,
      data,
    });
  } catch (error) {
    next(error);
  }
});

export default router; 