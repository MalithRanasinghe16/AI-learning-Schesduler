import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import rateLimit from 'express-rate-limit';
import dotenv from 'dotenv';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';
import connectDB from './config/database';
import mongoose from 'mongoose';

import { AIScheduler, ScheduleRecommendation } from './services/aiScheduler';
import User from './models/User';
import Subject from './models/Subject';
import StudySession from './models/StudySession';

// Import routes
import authRoutes from './routes/auth';
import subjectRoutes from './routes/subjects';
import sessionRoutes from './routes/sessions';
import analyticsRoutes from './routes/analytics';
import adaptiveScheduleRoutes from './routes/adaptive-schedule';
import scheduleRoutes from './routes/schedules';
import scheduleSessionRoutes from './routes/schedule-sessions'; 

// Load environment variables from the root directory
const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
dotenv.config({ path: join(__dirname, '..', '.env') }); // Adjust path to root .env

const app = express();
const PORT = process.env.PORT || 5000;

// Connect to MongoDB (use connectDB to avoid duplication)
connectDB();

// Security middleware
app.use(helmet());
app.use(cors({
  origin: process.env.FRONTEND_URL || 'http://localhost:5173',
  credentials: true,
}));

// Rate limiting
const limiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: process.env.NODE_ENV === 'production' ? 100 : 1000, // 1000 requests for dev, 100 for production
  message: 'Too many requests from this IP, please try again later.',
  standardHeaders: true, // Return rate limit info in the `RateLimit-*` headers
  legacyHeaders: false, // Disable the `X-RateLimit-*` headers
});
app.use('/api/', limiter);

// Body parsing middleware
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true }));

// Routes
app.use('/api/auth', authRoutes);
app.use('/api/subjects', subjectRoutes);
app.use('/api/sessions', sessionRoutes);
app.use('/api/analytics', analyticsRoutes);
app.use('/api/adaptive-schedule', adaptiveScheduleRoutes);
app.use('/api/schedules', scheduleRoutes);
app.use('/api/schedule-sessions', scheduleSessionRoutes); 

// Health check endpoint
app.get('/api/health', (req, res) => {
  res.json({
    status: 'OK',
    timestamp: new Date().toISOString(),
    environment: process.env.NODE_ENV || 'development',
    mongodb: mongoose.connection.readyState === 1 ? 'Connected' : 'Disconnected',
  });
});

// Error handling middleware
app.use((err: any, req: express.Request, res: express.Response, next: express.NextFunction) => {
  console.error('❌ Error:', err);
  res.status(err.status || 500).json({
    message: err.message || 'Internal server error',
    ...(process.env.NODE_ENV === 'development' && { stack: err.stack }),
  });
});

// 404 handler (place after all routes)
app.use('*', (req, res) => {
  res.status(404).json({ message: 'Route not found' });
});

// Start server
app.listen(PORT, () => {
  console.log(`🌟 Server running on port ${PORT}`);
  console.log(`📡 Base URL: http://localhost:${PORT}/api`);
});

export default app;