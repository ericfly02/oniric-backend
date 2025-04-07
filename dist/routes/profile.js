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
const validateProfileUpdate = [
    (0, express_validator_1.body)('username').optional().isString().withMessage('Username must be a string'),
    (0, express_validator_1.body)('full_name').optional().isString().withMessage('Full name must be a string'),
    (0, express_validator_1.body)('avatar_url').optional().isURL().withMessage('Avatar URL must be a valid URL'),
];
// Get user profile
router.get('/', auth_1.auth, async (req, res, next) => {
    try {
        const userId = req.userId;
        if (!userId) {
            throw new errorHandler_1.ApiError(401, 'Authentication required');
        }
        const { data, error } = await supabase_1.supabase
            .from('profiles')
            .select('*')
            .eq('id', userId)
            .single();
        if (error) {
            throw new errorHandler_1.ApiError(500, error.message);
        }
        if (!data) {
            throw new errorHandler_1.ApiError(404, 'Profile not found');
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
// Update user profile
router.put('/', auth_1.auth, validateProfileUpdate, async (req, res, next) => {
    try {
        const errors = (0, express_validator_1.validationResult)(req);
        if (!errors.isEmpty()) {
            return res.status(400).json({ errors: errors.array() });
        }
        const userId = req.userId;
        if (!userId) {
            throw new errorHandler_1.ApiError(401, 'Authentication required');
        }
        const updates = req.body;
        // Prevent updating restricted fields
        delete updates.id;
        delete updates.tier;
        delete updates.is_premium;
        delete updates.created_at;
        delete updates.updated_at;
        const { data, error } = await supabase_1.supabase
            .from('profiles')
            .update(updates)
            .eq('id', userId)
            .select()
            .single();
        if (error) {
            throw new errorHandler_1.ApiError(500, error.message);
        }
        if (!data) {
            throw new errorHandler_1.ApiError(404, 'Profile not found');
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
exports.default = router;
//# sourceMappingURL=profile.js.map