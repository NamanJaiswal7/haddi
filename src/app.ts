import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import authRoutes from './routes/auth';
import districtAdminRoutes from './routes/districtAdmin';
import courseRoutes from './routes/course';
import masterAdminRoutes from './routes/masterAdmin';
import districtRoutes from './routes/district';
import studentRoutes from './routes/student';
import deletionRequestRoutes from './routes/deletionRequest';
import metricsRoutes from './routes/metrics';
import { requestLogger } from './middleware/requestLogger';
import { createRedisMiddleware } from './middleware/redisMiddleware';
import metricsMiddleware from './middleware/metricsMiddleware';
import redisService from './services/redisService';
import logger from './utils/logger';

dotenv.config();

const app = express();

// CORS configuration for development
const corsOptions = {
  origin: function (origin: string | undefined, callback: (err: Error | null, allow?: boolean) => void) {
    // Allow requests with no origin (like mobile apps or curl requests)
    if (!origin) return callback(null, true);

    const allowedOrigins = [
      'http://localhost:3000',
      'http://localhost:5173',
      'http://localhost:4173',
      'http://localhost:8080',
      'http://127.0.0.1:3000',
      'http://127.0.0.1:5173',
      'http://127.0.0.1:4173',
      'http://127.0.0.1:8080',
      'https://facevalue-rej5-namanjaiswal7s-projects.vercel.app',
      'https://facevalue-rej5-git-main-namanjaiswal7s-projects.vercel.app',
      'https://facevalue-rej5.vercel.app',
      'https://exam.gitacontest.in'
    ];
    
    if (allowedOrigins.indexOf(origin) !== -1) {
      callback(null, true);
    } else {
      console.log('CORS blocked origin:', origin);
      callback(new Error('Not allowed by CORS'));
    }
  },
  credentials: true,
  optionsSuccessStatus: 200 // Some legacy browsers (IE11, various SmartTVs) choke on 204
};

app.use(cors(corsOptions));
app.use(express.json());
app.use(requestLogger);
app.use(metricsMiddleware);

// Initialize Redis connection
const initializeRedis = async () => {
  try {
    await redisService.connect();
    logger.info('Redis connection established');
  } catch (error) {
    logger.error('Failed to connect to Redis:', error);
    // Continue without Redis if connection fails
  }
};

// Initialize Redis on startup
initializeRedis();

// Redis middleware configuration
const isDevelopment = process.env.NODE_ENV === 'development';
const disableRateLimit = process.env.DISABLE_RATE_LIMIT === 'true';
const rateLimitingEnabled = !(isDevelopment && disableRateLimit);

if (isDevelopment && disableRateLimit) {
  logger.info('Rate limiting disabled in development mode');
} else if (isDevelopment) {
  logger.info('Rate limiting enabled in development mode');
}

const redisMiddleware = createRedisMiddleware({
  enableRateLimiting: rateLimitingEnabled,
  enableSessionManagement: true,
  enableCaching: true,
  enableHealthCheck: true
});

// Apply Redis middleware globally
app.use(redisMiddleware);

// Health check endpoint for Docker
app.get('/health', async (req, res) => {
  try {
    const redisStatus = redisService.getConnectionStatus();
    const redisPing = redisStatus ? await redisService.ping() : 'disconnected';
    
    res.status(200).json({ 
      status: 'healthy', 
      timestamp: new Date().toISOString(),
      uptime: process.uptime(),
      redis: {
        status: redisStatus ? 'connected' : 'disconnected',
        ping: redisPing
      }
    });
  } catch (error) {
    logger.error('Health check error:', error);
    res.status(500).json({ 
      status: 'unhealthy', 
      timestamp: new Date().toISOString(),
      error: 'Health check failed'
    });
  }
});

// Redis status endpoint
app.get('/api/redis/status', async (req, res) => {
  try {
    const redisStatus = redisService.getConnectionStatus();
    const redisPing = redisStatus ? await redisService.ping() : 'disconnected';
    
    res.json({
      status: redisStatus ? 'connected' : 'disconnected',
      ping: redisPing,
      timestamp: new Date().toISOString()
    });
  } catch (error) {
    logger.error('Redis status check error:', error);
    res.status(500).json({
      status: 'error',
      message: 'Failed to check Redis status',
      error: error instanceof Error ? error.message : 'Unknown error'
    });
  }
});

// Redis statistics endpoint
app.get('/api/redis/stats', async (req, res) => {
  try {
    const sessionService = await import('./services/sessionService');
    const cacheService = await import('./services/cacheService');
    const rateLimitService = await import('./services/rateLimitService');
    
    const [sessionStats, cacheStats, rateLimitStats] = await Promise.all([
      sessionService.default.getSessionStats(),
      cacheService.default.getCacheStats(),
      rateLimitService.default.getStats()
    ]);
    
    res.json({
      session: sessionStats,
      cache: cacheStats,
      rateLimit: rateLimitStats,
      timestamp: new Date().toISOString()
    });
  } catch (error) {
    logger.error('Redis stats error:', error);
    res.status(500).json({
      error: 'Failed to get Redis statistics',
      message: error instanceof Error ? error.message : 'Unknown error'
    });
  }
});

// Define API routes here
app.use('/api/auth', authRoutes);
app.use('/api/district-admin', districtAdminRoutes);
app.use('/api/courses', courseRoutes);
app.use('/api/master-admin', masterAdminRoutes);
app.use('/api/districts', districtRoutes);
app.use('/api/student', studentRoutes);
app.use('/api/deletion-requests', deletionRequestRoutes);

// Metrics and monitoring routes
app.use('/metrics', metricsRoutes);

// Graceful shutdown
process.on('SIGTERM', async () => {
  logger.info('SIGTERM received, shutting down gracefully');
  try {
    await redisService.disconnect();
    logger.info('Redis disconnected');
  } catch (error) {
    logger.error('Error during Redis disconnect:', error);
  }
  process.exit(0);
});

process.on('SIGINT', async () => {
  logger.info('SIGINT received, shutting down gracefully');
  try {
    await redisService.disconnect();
    logger.info('Redis disconnected');
  } catch (error) {
    logger.error('Error during Redis disconnect:', error);
  }
  process.exit(0);
});

export default app;
