import express from 'express';
import { supabase } from '../lib/supabase';
import { auth } from '../middleware/auth';
import { ApiError } from '../middleware/errorHandler';
import { Subscription } from '../types/database.types';
import { body, param, validationResult } from 'express-validator';

const router = express.Router();

// Add this function at the beginning of your subscriptions.ts file
const disableCache = (req: express.Request, res: express.Response, next: express.NextFunction) => {
  res.set('Cache-Control', 'no-store, no-cache, must-revalidate, private');
  res.set('Pragma', 'no-cache');
  res.set('Expires', '0');
  next();
};

// Validation middleware
const validateSubscriptionCreate = [
  body('user_id').notEmpty().withMessage('User ID is required'),
  body('tier').notEmpty().withMessage('Tier is required'),
  body('price').isNumeric().withMessage('Price must be a number'),
  body('status').notEmpty().withMessage('Status is required'),
  body('start_date').notEmpty().withMessage('Start date is required'),
];

const validateSubscriptionUpdate = [
  param('id').notEmpty().withMessage('Subscription ID is required'),
  body('tier').optional(),
  body('price').optional().isNumeric().withMessage('Price must be a number'),
  body('status').optional(),
  body('end_date').optional(),
];

// Get user's subscription
router.get('/', disableCache, auth, async (req: express.Request, res: express.Response, next: express.NextFunction) => {
  try {
    const userId = req.userId;

    if (!userId) {
      throw new ApiError(401, 'Authentication required');
    }

    const { data, error } = await supabase
      .from('subscriptions')
      .select('*')
      .eq('user_id', userId)
      .order('created_at', { ascending: false })
      .limit(1)
      .single();

    // No error if no subscriptions found
    if (error && error.code !== 'PGRST116') {
      throw new ApiError(500, error.message);
    }

    res.status(200).json({
      success: true,
      data: data || null,
    });
  } catch (error) {
    next(error);
  }
});

// Create a new subscription
router.post('/', auth, validateSubscriptionCreate, async (req: express.Request, res: express.Response, next: express.NextFunction) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }

    const subscriptionData: Partial<Subscription> = req.body;
    
    // Verify user has permission to create this subscription
    if (subscriptionData.user_id !== req.userId && !req.user?.role?.includes('admin')) {
      throw new ApiError(403, 'Cannot create subscription for another user');
    }

    const { data, error } = await supabase
      .from('subscriptions')
      .insert([subscriptionData])
      .select()
      .single();

    if (error) {
      throw new ApiError(500, error.message);
    }

    // Also update user profile with subscription tier
    await supabase
      .from('profiles')
      .update({
        tier: subscriptionData.tier,
        is_premium: subscriptionData.tier !== 'free',
      })
      .eq('id', subscriptionData.user_id);

    res.status(201).json({
      success: true,
      data,
    });
  } catch (error) {
    next(error);
  }
});

// Update a subscription
router.put('/:id', auth, validateSubscriptionUpdate, async (req: express.Request, res: express.Response, next: express.NextFunction) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }

    const { id } = req.params;
    const updates: Partial<Subscription> = req.body;
    
    // Prevent changing user_id
    delete updates.user_id;

    // First get the subscription to check ownership
    const { data: subscription, error: fetchError } = await supabase
      .from('subscriptions')
      .select('*')
      .eq('id', id)
      .single();

    if (fetchError) {
      throw new ApiError(500, fetchError.message);
    }

    if (!subscription) {
      throw new ApiError(404, 'Subscription not found');
    }

    // Verify user has permission to update this subscription
    if (subscription.user_id !== req.userId && !req.user?.role?.includes('admin')) {
      throw new ApiError(403, 'Cannot update subscription for another user');
    }

    const { data, error } = await supabase
      .from('subscriptions')
      .update(updates)
      .eq('id', id)
      .select()
      .single();

    if (error) {
      throw new ApiError(500, error.message);
    }

    // If tier is being updated, update user profile as well
    if (updates.tier) {
      await supabase
        .from('profiles')
        .update({
          tier: updates.tier,
          is_premium: updates.tier !== 'free',
        })
        .eq('id', subscription.user_id);
    }

    res.status(200).json({
      success: true,
      data,
    });
  } catch (error) {
    next(error);
  }
});

// Cancel a subscription
router.put('/:id/cancel', auth, async (req: express.Request, res: express.Response, next: express.NextFunction) => {
  try {
    const { id } = req.params;

    // First get the subscription to check ownership
    const { data: subscription, error: fetchError } = await supabase
      .from('subscriptions')
      .select('*')
      .eq('id', id)
      .single();

    if (fetchError) {
      throw new ApiError(500, fetchError.message);
    }

    if (!subscription) {
      throw new ApiError(404, 'Subscription not found');
    }

    // Verify user has permission to cancel this subscription
    if (subscription.user_id !== req.userId && !req.user?.role?.includes('admin')) {
      throw new ApiError(403, 'Cannot cancel subscription for another user');
    }

    // Set cancellation data
    const { data, error } = await supabase
      .from('subscriptions')
      .update({
        status: 'cancelled',
        end_date: new Date().toISOString(),
      })
      .eq('id', id)
      .select()
      .single();

    if (error) {
      throw new ApiError(500, error.message);
    }

    // Update user profile
    await supabase
      .from('profiles')
      .update({
        tier: 'free',
        is_premium: false,
      })
      .eq('id', subscription.user_id);

    res.status(200).json({
      success: true,
      data,
    });
  } catch (error) {
    next(error);
  }
});

export default router; 