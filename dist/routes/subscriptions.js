"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = __importDefault(require("express"));
const supabase_1 = require("../lib/supabase");
const auth_1 = require("../middleware/auth");
const errorHandler_1 = require("../middleware/errorHandler");
const express_validator_1 = require("express-validator");
const router = express_1.default.Router();
// Validation middleware
const validateSubscriptionCreate = [
    (0, express_validator_1.body)('user_id').notEmpty().withMessage('User ID is required'),
    (0, express_validator_1.body)('tier').notEmpty().withMessage('Tier is required'),
    (0, express_validator_1.body)('price').isNumeric().withMessage('Price must be a number'),
    (0, express_validator_1.body)('status').notEmpty().withMessage('Status is required'),
    (0, express_validator_1.body)('start_date').notEmpty().withMessage('Start date is required'),
];
const validateSubscriptionUpdate = [
    (0, express_validator_1.param)('id').notEmpty().withMessage('Subscription ID is required'),
    (0, express_validator_1.body)('tier').optional(),
    (0, express_validator_1.body)('price').optional().isNumeric().withMessage('Price must be a number'),
    (0, express_validator_1.body)('status').optional(),
    (0, express_validator_1.body)('end_date').optional(),
];
// Get user's subscription
router.get('/', auth_1.auth, async (req, res, next) => {
    try {
        const userId = req.userId;
        if (!userId) {
            throw new errorHandler_1.ApiError(401, 'Authentication required');
        }
        const { data, error } = await supabase_1.supabase
            .from('subscriptions')
            .select('*')
            .eq('user_id', userId)
            .order('created_at', { ascending: false })
            .limit(1)
            .single();
        // No error if no subscriptions found
        if (error && error.code !== 'PGRST116') {
            throw new errorHandler_1.ApiError(500, error.message);
        }
        res.status(200).json({
            success: true,
            data: data || null,
        });
    }
    catch (error) {
        next(error);
    }
});
// Create a new subscription
router.post('/', auth_1.auth, validateSubscriptionCreate, async (req, res, next) => {
    try {
        const errors = (0, express_validator_1.validationResult)(req);
        if (!errors.isEmpty()) {
            return res.status(400).json({ errors: errors.array() });
        }
        const subscriptionData = req.body;
        // Verify user has permission to create this subscription
        if (subscriptionData.user_id !== req.userId && !req.user?.role?.includes('admin')) {
            throw new errorHandler_1.ApiError(403, 'Cannot create subscription for another user');
        }
        const { data, error } = await supabase_1.supabase
            .from('subscriptions')
            .insert([subscriptionData])
            .select()
            .single();
        if (error) {
            throw new errorHandler_1.ApiError(500, error.message);
        }
        // Also update user profile with subscription tier
        await supabase_1.supabase
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
    }
    catch (error) {
        next(error);
    }
});
// Update a subscription
router.put('/:id', auth_1.auth, validateSubscriptionUpdate, async (req, res, next) => {
    try {
        const errors = (0, express_validator_1.validationResult)(req);
        if (!errors.isEmpty()) {
            return res.status(400).json({ errors: errors.array() });
        }
        const { id } = req.params;
        const updates = req.body;
        // Prevent changing user_id
        delete updates.user_id;
        // First get the subscription to check ownership
        const { data: subscription, error: fetchError } = await supabase_1.supabase
            .from('subscriptions')
            .select('*')
            .eq('id', id)
            .single();
        if (fetchError) {
            throw new errorHandler_1.ApiError(500, fetchError.message);
        }
        if (!subscription) {
            throw new errorHandler_1.ApiError(404, 'Subscription not found');
        }
        // Verify user has permission to update this subscription
        if (subscription.user_id !== req.userId && !req.user?.role?.includes('admin')) {
            throw new errorHandler_1.ApiError(403, 'Cannot update subscription for another user');
        }
        const { data, error } = await supabase_1.supabase
            .from('subscriptions')
            .update(updates)
            .eq('id', id)
            .select()
            .single();
        if (error) {
            throw new errorHandler_1.ApiError(500, error.message);
        }
        // If tier is being updated, update user profile as well
        if (updates.tier) {
            await supabase_1.supabase
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
    }
    catch (error) {
        next(error);
    }
});
// Cancel a subscription
router.put('/:id/cancel', auth_1.auth, async (req, res, next) => {
    try {
        const { id } = req.params;
        // First get the subscription to check ownership
        const { data: subscription, error: fetchError } = await supabase_1.supabase
            .from('subscriptions')
            .select('*')
            .eq('id', id)
            .single();
        if (fetchError) {
            throw new errorHandler_1.ApiError(500, fetchError.message);
        }
        if (!subscription) {
            throw new errorHandler_1.ApiError(404, 'Subscription not found');
        }
        // Verify user has permission to cancel this subscription
        if (subscription.user_id !== req.userId && !req.user?.role?.includes('admin')) {
            throw new errorHandler_1.ApiError(403, 'Cannot cancel subscription for another user');
        }
        // Set cancellation data
        const { data, error } = await supabase_1.supabase
            .from('subscriptions')
            .update({
            status: 'cancelled',
            end_date: new Date().toISOString(),
        })
            .eq('id', id)
            .select()
            .single();
        if (error) {
            throw new errorHandler_1.ApiError(500, error.message);
        }
        // Update user profile
        await supabase_1.supabase
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
    }
    catch (error) {
        next(error);
    }
});
exports.default = router;
//# sourceMappingURL=subscriptions.js.map