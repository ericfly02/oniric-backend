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
const multer_1 = __importDefault(require("multer"));
const axios_1 = __importDefault(require("axios"));
const form_data_1 = __importDefault(require("form-data"));
const fs_1 = __importDefault(require("fs"));
const util_1 = require("util");
const router = express_1.default.Router();
const upload = (0, multer_1.default)({ dest: 'uploads/' });
const unlinkAsync = (0, util_1.promisify)(fs_1.default.unlink);
// Validation middleware
const validateDreamCreate = [
    (0, express_validator_1.body)('title').notEmpty().withMessage('Title is required'),
    (0, express_validator_1.body)('description').notEmpty().withMessage('Description is required'),
    (0, express_validator_1.body)('date').notEmpty().withMessage('Date is required'),
];
const validateDreamUpdate = [
    (0, express_validator_1.param)('id').notEmpty().withMessage('Dream ID is required'),
    (0, express_validator_1.body)('title').optional(),
    (0, express_validator_1.body)('description').optional(),
    (0, express_validator_1.body)('date').optional(),
];
const validateDreamId = [
    (0, express_validator_1.param)('id').notEmpty().withMessage('Dream ID is required'),
];
// Get all dreams with pagination
router.get('/', auth_1.auth, async (req, res, next) => {
    try {
        const userId = req.query.userId;
        const page = parseInt(req.query.page) || 0;
        const pageSize = parseInt(req.query.pageSize) || 9;
        if (!userId) {
            throw new errorHandler_1.ApiError(400, 'User ID is required');
        }
        const from = page * pageSize;
        const to = from + pageSize - 1;
        const { data, error, count } = await supabase_1.supabase
            .from('dreams')
            .select('*', { count: 'exact' })
            .eq('user_id', userId)
            .order('date', { ascending: false })
            .range(from, to);
        if (error) {
            throw new errorHandler_1.ApiError(500, error.message);
        }
        res.status(200).json({
            success: true,
            data,
            count,
        });
    }
    catch (error) {
        next(error);
    }
});
// Get dream by ID
router.get('/:id', auth_1.auth, validateDreamId, async (req, res, next) => {
    try {
        const errors = (0, express_validator_1.validationResult)(req);
        if (!errors.isEmpty()) {
            return res.status(400).json({ errors: errors.array() });
        }
        const { id } = req.params;
        const { data, error } = await supabase_1.supabase
            .from('dreams')
            .select('*')
            .eq('id', id)
            .single();
        if (error) {
            throw new errorHandler_1.ApiError(500, error.message);
        }
        if (!data) {
            throw new errorHandler_1.ApiError(404, 'Dream not found');
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
// Create a new dream
router.post('/', auth_1.auth, validateDreamCreate, async (req, res, next) => {
    try {
        const errors = (0, express_validator_1.validationResult)(req);
        if (!errors.isEmpty()) {
            return res.status(400).json({ errors: errors.array() });
        }
        const dreamData = req.body;
        // Ensure user_id is set
        if (!dreamData.user_id) {
            dreamData.user_id = req.userId;
        }
        const { data, error } = await supabase_1.supabase
            .from('dreams')
            .insert([dreamData])
            .select()
            .single();
        if (error) {
            throw new errorHandler_1.ApiError(500, error.message);
        }
        res.status(201).json({
            success: true,
            data,
        });
    }
    catch (error) {
        next(error);
    }
});
// Save a dream with user ID
router.post('/save', auth_1.auth, validateDreamCreate, async (req, res, next) => {
    try {
        const errors = (0, express_validator_1.validationResult)(req);
        if (!errors.isEmpty()) {
            return res.status(400).json({ errors: errors.array() });
        }
        const { userId, ...dreamData } = req.body;
        // Use the authenticated user's ID if not provided
        const user_id = userId || req.userId;
        if (!user_id) {
            throw new errorHandler_1.ApiError(400, 'User ID is required');
        }
        const { data, error } = await supabase_1.supabase
            .from('dreams')
            .insert([{
                ...dreamData,
                user_id,
                date: dreamData.date || new Date().toISOString(),
            }])
            .select()
            .single();
        if (error) {
            throw new errorHandler_1.ApiError(500, error.message);
        }
        res.status(201).json({
            success: true,
            data,
        });
    }
    catch (error) {
        next(error);
    }
});
// Update a dream
router.put('/:id', auth_1.auth, validateDreamUpdate, async (req, res, next) => {
    try {
        const errors = (0, express_validator_1.validationResult)(req);
        if (!errors.isEmpty()) {
            return res.status(400).json({ errors: errors.array() });
        }
        const { id } = req.params;
        const updates = req.body;
        // Remove user_id from updates if present (shouldn't be changed)
        delete updates.user_id;
        const { data, error } = await supabase_1.supabase
            .from('dreams')
            .update(updates)
            .eq('id', id)
            .select()
            .single();
        if (error) {
            throw new errorHandler_1.ApiError(500, error.message);
        }
        if (!data) {
            throw new errorHandler_1.ApiError(404, 'Dream not found');
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
// Delete a dream
router.delete('/:id', auth_1.auth, validateDreamId, async (req, res, next) => {
    try {
        const errors = (0, express_validator_1.validationResult)(req);
        if (!errors.isEmpty()) {
            return res.status(400).json({ errors: errors.array() });
        }
        const { id } = req.params;
        const { error } = await supabase_1.supabase
            .from('dreams')
            .delete()
            .eq('id', id);
        if (error) {
            throw new errorHandler_1.ApiError(500, error.message);
        }
        res.status(200).json({
            success: true,
        });
    }
    catch (error) {
        next(error);
    }
});
// Process audio dream
router.post('/process-audio', auth_1.auth, upload.single('audio'), async (req, res, next) => {
    try {
        if (!req.file) {
            throw new errorHandler_1.ApiError(400, 'Audio file is required');
        }
        const audioFilePath = req.file.path;
        const audioServiceUrl = process.env.AUDIO_SERVICE_URL;
        if (!audioServiceUrl) {
            throw new errorHandler_1.ApiError(500, 'Audio service URL not configured');
        }
        // Create form data with audio file
        const formData = new form_data_1.default();
        formData.append('audio', fs_1.default.createReadStream(audioFilePath), {
            filename: 'dream_recording.webm',
            contentType: req.file.mimetype,
        });
        // Send to external service
        const response = await axios_1.default.post(audioServiceUrl, formData, {
            headers: {
                ...formData.getHeaders(),
            },
        });
        // Clean up temporary file
        await unlinkAsync(audioFilePath);
        res.status(200).json({
            success: true,
            data: response.data,
        });
    }
    catch (error) {
        // Clean up temporary file if it exists
        if (req.file) {
            await unlinkAsync(req.file.path).catch(() => { });
        }
        next(error);
    }
});
// Generate comic for dream
router.post('/comic', auth_1.auth, async (req, res, next) => {
    try {
        const { interpretation, userId } = req.body;
        if (!interpretation) {
            throw new errorHandler_1.ApiError(400, 'Dream interpretation is required');
        }
        if (!userId) {
            throw new errorHandler_1.ApiError(400, 'User ID is required');
        }
        const comicServiceUrl = process.env.COMIC_SERVICE_URL;
        if (!comicServiceUrl) {
            throw new errorHandler_1.ApiError(500, 'Comic service URL not configured');
        }
        // Send to external service
        const response = await axios_1.default.post(comicServiceUrl, {
            interpretation,
            userId,
        });
        res.status(200).json({
            success: true,
            data: response.data,
        });
    }
    catch (error) {
        next(error);
    }
});
// Update dream with comic
router.put('/:id/comic', auth_1.auth, validateDreamId, async (req, res, next) => {
    try {
        const errors = (0, express_validator_1.validationResult)(req);
        if (!errors.isEmpty()) {
            return res.status(400).json({ errors: errors.array() });
        }
        const { id } = req.params;
        const { imageUrl } = req.body;
        if (!imageUrl) {
            throw new errorHandler_1.ApiError(400, 'Image URL is required');
        }
        const { data, error } = await supabase_1.supabase
            .from('dreams')
            .update({ image_url: imageUrl })
            .eq('id', id)
            .select()
            .single();
        if (error) {
            throw new errorHandler_1.ApiError(500, error.message);
        }
        if (!data) {
            throw new errorHandler_1.ApiError(404, 'Dream not found');
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
// Generate video for dream
router.post('/:id/video', auth_1.auth, validateDreamId, async (req, res, next) => {
    try {
        const errors = (0, express_validator_1.validationResult)(req);
        if (!errors.isEmpty()) {
            return res.status(400).json({ errors: errors.array() });
        }
        const { id } = req.params;
        const videoServiceUrl = process.env.VIDEO_SERVICE_URL;
        if (!videoServiceUrl) {
            throw new errorHandler_1.ApiError(500, 'Video service URL not configured');
        }
        // Get dream data
        const { data: dream, error: dreamError } = await supabase_1.supabase
            .from('dreams')
            .select('title, description, mood')
            .eq('id', id)
            .single();
        if (dreamError || !dream) {
            throw new errorHandler_1.ApiError(500, 'Failed to fetch dream data');
        }
        // Generate prompt based on dream data
        const prompt = `A dreamlike scene about ${dream.title}. ${dream.description} The mood is ${dream.mood || 'mysterious'}.`;
        // Send to external service
        const response = await axios_1.default.post(videoServiceUrl, {
            prompt,
            dreamId: id,
            userId: req.userId,
        });
        // Update dream with task ID
        const taskId = response.data.taskId;
        if (taskId) {
            await supabase_1.supabase
                .from('dreams')
                .update({
                video_task_id: taskId,
                video_status: 'processing',
            })
                .eq('id', id);
        }
        res.status(200).json({
            success: true,
            data: {
                taskId,
                ...response.data,
            },
        });
    }
    catch (error) {
        next(error);
    }
});
// Check video status
router.get('/video/:taskId', auth_1.auth, async (req, res, next) => {
    try {
        const { taskId } = req.params;
        if (!taskId) {
            throw new errorHandler_1.ApiError(400, 'Task ID is required');
        }
        // Get dream with this task ID
        const { data: dream, error: dreamError } = await supabase_1.supabase
            .from('dreams')
            .select('id, video_status, video_url')
            .eq('video_task_id', taskId)
            .single();
        if (dreamError) {
            throw new errorHandler_1.ApiError(500, dreamError.message);
        }
        if (!dream) {
            throw new errorHandler_1.ApiError(404, 'No dream found with this task ID');
        }
        // Return status from database
        res.status(200).json({
            success: true,
            data: {
                status: dream.video_status,
                videoUrl: dream.video_url,
            },
        });
    }
    catch (error) {
        next(error);
    }
});
exports.default = router;
//# sourceMappingURL=dreams.js.map