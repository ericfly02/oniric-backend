import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import morgan from 'morgan';
import dotenv from 'dotenv';
import { errorHandler } from './middleware/errorHandler';
import { notFoundHandler } from './middleware/notFoundHandler';

// Import routes
import dreamRoutes from './routes/dreams';
import subscriptionRoutes from './routes/subscriptions';
import profileRoutes from './routes/profile';
import authRoutes from './routes/auth';

// Load environment variables
dotenv.config();

// Initialize Express app
const app = express();
const port = process.env.PORT || 3000;

// Middleware
app.use(cors({
  origin: '*', // Allow all origins for now
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization'],
  credentials: true
}));

app.use(helmet());
app.use(morgan('dev'));
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Routes
app.use('/api/dreams', dreamRoutes);
app.use('/api/subscriptions', subscriptionRoutes);
app.use('/api/profile', profileRoutes);
app.use('/api/auth', authRoutes);

// Add specific OPTIONS handler
app.options('*', (req, res) => {
  // Set CORS headers
  res.header('Access-Control-Allow-Origin', '*');
  res.header('Access-Control-Allow-Methods', 'GET,OPTIONS,PATCH,DELETE,POST,PUT');
  res.header('Access-Control-Allow-Headers', 'X-CSRF-Token, X-Requested-With, Accept, Accept-Version, Content-Length, Content-MD5, Content-Type, Date, X-Api-Version, Authorization');
  res.header('Access-Control-Allow-Credentials', 'true');
  res.sendStatus(204);
});

// Health check endpoint
app.get('/api/health', (req, res) => {
  res.status(200).json({
    status: 'ok',
    message: 'Server is running',
    timestamp: new Date().toISOString(),
  });
});

// Root path handler
app.get('/', (req, res) => {
  res.status(200).json({
    message: 'Oniric API is running',
    docs: '/api-docs', // If you have API documentation
    health: '/api/health'
  });
});

// Handle 404 errors
app.use(notFoundHandler);

// Global error handling
app.use(errorHandler);

// Start server
app.listen(port, () => {
  console.log(`Server running on port ${port}`);
});

export default app; 