"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = __importDefault(require("express"));
const jsonwebtoken_1 = __importDefault(require("jsonwebtoken"));
const supabase_1 = require("../lib/supabase");
const errorHandler_1 = require("../middleware/errorHandler");
const auth_1 = require("../middleware/auth");
const express_validator_1 = require("express-validator");
const router = express_1.default.Router();
// Validation middleware
const validateLogin = [
    (0, express_validator_1.body)('email').isEmail().withMessage('Please provide a valid email'),
    (0, express_validator_1.body)('password').notEmpty().withMessage('Password is required')
];
const validateRegister = [
    (0, express_validator_1.body)('email').isEmail().withMessage('Please provide a valid email'),
    (0, express_validator_1.body)('password').isLength({ min: 6 }).withMessage('Password must be at least 6 characters long'),
    (0, express_validator_1.body)('full_name').optional().isString().withMessage('Full name must be a string')
];
// Login route
router.post('/login', validateLogin, async (req, res, next) => {
    try {
        const errors = (0, express_validator_1.validationResult)(req);
        if (!errors.isEmpty()) {
            return res.status(400).json({ errors: errors.array() });
        }
        const { email, password } = req.body;
        // Sign in with Supabase
        const { data, error } = await supabase_1.supabase.auth.signInWithPassword({
            email,
            password,
        });
        if (error) {
            throw new errorHandler_1.ApiError(401, error.message);
        }
        if (!data.user) {
            throw new errorHandler_1.ApiError(401, 'Invalid credentials');
        }
        // Get user profile
        const { data: profile, error: profileError } = await supabase_1.supabase
            .from('profiles')
            .select('*')
            .eq('id', data.user.id)
            .single();
        if (profileError) {
            throw new errorHandler_1.ApiError(500, profileError.message);
        }
        // Generate JWT token
        const jwtSecret = process.env.JWT_SECRET;
        if (!jwtSecret) {
            throw new errorHandler_1.ApiError(500, 'JWT secret not configured');
        }
        const expiresIn = process.env.JWT_EXPIRES_IN ? process.env.JWT_EXPIRES_IN : '7d';
        const token = jsonwebtoken_1.default.sign({ id: data.user.id, email: data.user.email }, jwtSecret, { expiresIn: expiresIn });
        res.status(200).json({
            success: true,
            token,
            user: {
                id: data.user.id,
                email: data.user.email,
                ...profile
            }
        });
    }
    catch (error) {
        next(error);
    }
});
// Register route
router.post('/register', validateRegister, async (req, res, next) => {
    try {
        const errors = (0, express_validator_1.validationResult)(req);
        if (!errors.isEmpty()) {
            return res.status(400).json({ errors: errors.array() });
        }
        const { email, password, full_name } = req.body;
        // Check if user already exists
        const { data: existingUser } = await supabase_1.supabase
            .from('users')
            .select('*')
            .eq('email', email)
            .single();
        if (existingUser) {
            throw new errorHandler_1.ApiError(409, 'User already exists');
        }
        // Sign up with Supabase
        const { data, error } = await supabase_1.supabase.auth.signUp({
            email,
            password,
            options: {
                data: {
                    full_name
                }
            }
        });
        if (error) {
            throw new errorHandler_1.ApiError(400, error.message);
        }
        if (!data.user) {
            throw new errorHandler_1.ApiError(400, 'Registration failed');
        }
        // Initialize user profile
        const { error: profileError } = await supabase_1.supabase
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
            throw new errorHandler_1.ApiError(500, profileError.message);
        }
        // Generate JWT token
        const jwtSecret = process.env.JWT_SECRET;
        if (!jwtSecret) {
            throw new errorHandler_1.ApiError(500, 'JWT secret not configured');
        }
        const expiresIn = process.env.JWT_EXPIRES_IN ? process.env.JWT_EXPIRES_IN : '7d';
        const token = jsonwebtoken_1.default.sign({ id: data.user.id, email: data.user.email }, jwtSecret, { expiresIn: expiresIn });
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
    }
    catch (error) {
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
router.get('/me', auth_1.auth, async (req, res) => {
    res.status(200).json({
        success: true,
        user: req.user
    });
});
// Refresh token route
router.post('/refresh', auth_1.auth, async (req, res, next) => {
    try {
        // Generate new JWT token
        const jwtSecret = process.env.JWT_SECRET;
        if (!jwtSecret) {
            throw new errorHandler_1.ApiError(500, 'JWT secret not configured');
        }
        const expiresIn = process.env.JWT_EXPIRES_IN ? process.env.JWT_EXPIRES_IN : '7d';
        const token = jsonwebtoken_1.default.sign({ id: req.user.id, email: req.user.email }, jwtSecret, { expiresIn: expiresIn });
        res.status(200).json({
            success: true,
            token
        });
    }
    catch (error) {
        next(error);
    }
});
exports.default = router;
//# sourceMappingURL=auth.js.map