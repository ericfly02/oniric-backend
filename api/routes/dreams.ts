import express from 'express';
import { supabase } from '../lib/supabase';
import { auth } from '../middleware/auth';
import { ApiError } from '../middleware/errorHandler';
import { Dream } from '../types/database.types';
import { body, param, query, validationResult } from 'express-validator';
import multer from 'multer';
import axios from 'axios';
import FormData from 'form-data';
import fs from 'fs';
import { promisify } from 'util';
import path from 'path';

const router = express.Router();

// Use memory storage instead of disk storage
const upload = multer({ 
  storage: multer.memoryStorage()
});

const unlinkAsync = promisify(fs.unlink);

// Validation middleware
const validateDreamCreate = [
  body('title').notEmpty().withMessage('Title is required'),
  body('description').notEmpty().withMessage('Description is required'),
  body('date').notEmpty().withMessage('Date is required'),
];

const validateDreamUpdate = [
  param('id').notEmpty().withMessage('Dream ID is required'),
  body('title').optional(),
  body('description').optional(),
  body('date').optional(),
];

const validateDreamId = [
  param('id').notEmpty().withMessage('Dream ID is required'),
];

// Disable caching middleware
const disableCache = (req: express.Request, res: express.Response, next: express.NextFunction) => {
  res.set('Cache-Control', 'no-store, no-cache, must-revalidate, private');
  res.set('Pragma', 'no-cache');
  res.set('Expires', '0');
  next();
};

// Get dreams endpoint
router.get('/', disableCache, auth, async (req: express.Request, res: express.Response, next: express.NextFunction) => {
  try {
    const userId = req.query.userId as string;
    const page = parseInt(req.query.page as string || '0');
    const pageSize = parseInt(req.query.pageSize as string || '9');
    
    if (!userId) {
      throw new ApiError(400, 'User ID is required');
    }
    
    console.log(`Fetching dreams for user: ${userId}, page: ${page}, pageSize: ${pageSize}`);
    
    // Calculate offset based on page and pageSize
    const offset = page * pageSize;
    
    // Query to get dreams
    const { data: dreams, error, count } = await supabase
      .from('dreams')
      .select('*')
      .eq('user_id', userId);
    
    if (error) {
      console.error('Supabase error fetching dreams:', error);
      throw new ApiError(500, `Error fetching dreams: ${error.message}`);
    }
    
    console.log(`Found ${count || 0} dreams, returning ${dreams?.length || 0} results`);
    
    // Send the response with proper headers to prevent caching
    res.set('Cache-Control', 'no-store, no-cache, must-revalidate, private');
    res.set('Pragma', 'no-cache');
    res.status(200).json({
      data: dreams || [],
      count: count || 0
    });
  } catch (error) {
    next(error);
  }
});

// Get dream by ID
router.get('/:id', auth, validateDreamId, async (req: express.Request, res: express.Response, next: express.NextFunction) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }

    const { id } = req.params;

    const { data, error } = await supabase
      .from('dreams')
      .select('*')
      .eq('id', id)
      .single();

    if (error) {
      throw new ApiError(500, error.message);
    }

    if (!data) {
      throw new ApiError(404, 'Dream not found');
    }

    res.status(200).json({
      success: true,
      data,
    });
  } catch (error) {
    next(error);
  }
});

// Create a new dream
router.post('/', auth, validateDreamCreate, async (req: express.Request, res: express.Response, next: express.NextFunction) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }

    const dreamData: Partial<Dream> = req.body;
    
    // Ensure user_id is set
    if (!dreamData.user_id) {
      dreamData.user_id = req.userId as string;
    }

    const { data, error } = await supabase
      .from('dreams')
      .insert([dreamData])
      .select()
      .single();

    if (error) {
      throw new ApiError(500, error.message);
    }

    res.status(201).json({
      success: true,
      data,
    });
  } catch (error) {
    next(error);
  }
});

// Save a dream with user ID
router.post('/save', auth, validateDreamCreate, async (req: express.Request, res: express.Response, next: express.NextFunction) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }

    const { userId, ...dreamData } = req.body;

    // Use the authenticated user's ID if not provided
    const user_id = userId || req.userId;

    if (!user_id) {
      throw new ApiError(400, 'User ID is required');
    }

    const { data, error } = await supabase
      .from('dreams')
      .insert([{
        ...dreamData,
        user_id,
        date: dreamData.date || new Date().toISOString(),
      }])
      .select()
      .single();

    if (error) {
      throw new ApiError(500, error.message);
    }

    res.status(201).json({
      success: true,
      data,
    });
  } catch (error) {
    next(error);
  }
});

// Update a dream
router.put('/:id', auth, validateDreamUpdate, async (req: express.Request, res: express.Response, next: express.NextFunction) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }

    const { id } = req.params;
    const updates: Partial<Dream> = req.body;

    // Remove user_id from updates if present (shouldn't be changed)
    delete updates.user_id;

    const { data, error } = await supabase
      .from('dreams')
      .update(updates)
      .eq('id', id)
      .select()
      .single();

    if (error) {
      throw new ApiError(500, error.message);
    }

    if (!data) {
      throw new ApiError(404, 'Dream not found');
    }

    res.status(200).json({
      success: true,
      data,
    });
  } catch (error) {
    next(error);
  }
});

// Delete a dream
router.delete('/:id', auth, validateDreamId, async (req: express.Request, res: express.Response, next: express.NextFunction) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }

    const { id } = req.params;

    const { error } = await supabase
      .from('dreams')
      .delete()
      .eq('id', id);

    if (error) {
      throw new ApiError(500, error.message);
    }

    res.status(200).json({
      success: true,
    });
  } catch (error) {
    next(error);
  }
});

// Process audio dream
router.post('/process-audio', auth, upload.single('audio'), async (req: express.Request, res: express.Response, next: express.NextFunction) => {
  try {
    if (!req.file) {
      throw new ApiError(400, 'Audio file is required');
    }

    // Use the buffer directly from memory
    const audioBuffer = req.file.buffer;
    const mimetype = req.file.mimetype;
    
    // Create a FormData object for your API request
    const formData = new FormData();
    formData.append('audio', audioBuffer, {
      filename: req.file.originalname,
      contentType: mimetype
    });
    
    // Make your API request with the form data
    // Forward to your target API
    const response = await axios.post(
      process.env.YOUR_TARGET_API_URL || 'https://your-api-endpoint.com',
      formData,
      {
        headers: {
          ...formData.getHeaders(),
          // Add any other headers you need
        }
      }
    );
    
    // Return the response from the target API
    res.status(200).json(response.data);
    
  } catch (error) {
    next(error);
  }
});

// Generate comic for dream
router.post('/comic', auth, async (req: express.Request, res: express.Response, next: express.NextFunction) => {
  try {
    const { interpretation, userId } = req.body;

    if (!interpretation) {
      throw new ApiError(400, 'Dream interpretation is required');
    }

    if (!userId) {
      throw new ApiError(400, 'User ID is required');
    }

    const comicServiceUrl = process.env.COMIC_SERVICE_URL;

    if (!comicServiceUrl) {
      throw new ApiError(500, 'Comic service URL not configured');
    }

    // Send to external service
    const response = await axios.post(comicServiceUrl, {
      interpretation,
      userId,
    });

    res.status(200).json({
      success: true,
      data: response.data,
    });
  } catch (error) {
    next(error);
  }
});

// Update dream with comic
router.put('/:id/comic', auth, validateDreamId, async (req: express.Request, res: express.Response, next: express.NextFunction) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }

    const { id } = req.params;
    const { imageUrl } = req.body;

    if (!imageUrl) {
      throw new ApiError(400, 'Image URL is required');
    }

    const { data, error } = await supabase
      .from('dreams')
      .update({ image_url: imageUrl })
      .eq('id', id)
      .select()
      .single();

    if (error) {
      throw new ApiError(500, error.message);
    }

    if (!data) {
      throw new ApiError(404, 'Dream not found');
    }

    res.status(200).json({
      success: true,
      data,
    });
  } catch (error) {
    next(error);
  }
});

// Generate video for dream
router.post('/:id/video', auth, validateDreamId, async (req: express.Request, res: express.Response, next: express.NextFunction) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }

    const { id } = req.params;
    const videoServiceUrl = process.env.VIDEO_SERVICE_URL;

    if (!videoServiceUrl) {
      throw new ApiError(500, 'Video service URL not configured');
    }

    // Get dream data
    const { data: dream, error: dreamError } = await supabase
      .from('dreams')
      .select('title, description, mood')
      .eq('id', id)
      .single();

    if (dreamError || !dream) {
      throw new ApiError(500, 'Failed to fetch dream data');
    }

    // Generate prompt based on dream data
    const prompt = `A dreamlike scene about ${dream.title}. ${dream.description} The mood is ${dream.mood || 'mysterious'}.`;

    // Send to external service
    const response = await axios.post(videoServiceUrl, {
      prompt,
      dreamId: id,
      userId: req.userId,
    });

    // Update dream with task ID
    const taskId = response.data.taskId;
    
    if (taskId) {
      await supabase
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
  } catch (error) {
    next(error);
  }
});

// Check video status
router.get('/video/:taskId', auth, async (req: express.Request, res: express.Response, next: express.NextFunction) => {
  try {
    const { taskId } = req.params;

    if (!taskId) {
      throw new ApiError(400, 'Task ID is required');
    }

    // Get dream with this task ID
    const { data: dream, error: dreamError } = await supabase
      .from('dreams')
      .select('id, video_status, video_url')
      .eq('video_task_id', taskId)
      .single();

    if (dreamError) {
      throw new ApiError(500, dreamError.message);
    }

    if (!dream) {
      throw new ApiError(404, 'No dream found with this task ID');
    }

    // Return status from database
    res.status(200).json({
      success: true,
      data: {
        status: dream.video_status,
        videoUrl: dream.video_url,
      },
    });
  } catch (error) {
    next(error);
  }
});

export default router; 