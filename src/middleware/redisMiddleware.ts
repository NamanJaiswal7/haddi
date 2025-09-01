import { Request, Response, NextFunction } from 'express';
import rateLimitService from '../services/rateLimitService';
import sessionService from '../services/sessionService';
import cacheService from '../services/cacheService';
import redisService from '../services/redisService';
import logger from '../utils/logger';

export interface RedisMiddlewareConfig {
  enableRateLimiting: boolean;
  enableSessionManagement: boolean;
  enableCaching: boolean;
  enableHealthCheck: boolean;
}

/**
 * Rate limiting middleware
 */
export const rateLimitMiddleware = (endpoint: string = 'global') => {
  return async (req: Request, res: Response, next: NextFunction) => {
    try {
      // Get identifier (IP address or user ID)
      const identifier = req.user?.id || req.ip || 'anonymous';
      
      // Check rate limit
      const rateLimitResult = await rateLimitService.checkRateLimit(identifier, endpoint);
      
      if (!rateLimitResult.allowed) {
        // Set rate limit headers
        res.set({
          'X-RateLimit-Limit': rateLimitResult.remaining.toString(),
          'X-RateLimit-Remaining': '0',
          'X-RateLimit-Reset': new Date(rateLimitResult.resetTime).toISOString(),
          'Retry-After': rateLimitResult.retryAfter?.toString() || '60'
        });
        
        return res.status(429).json({
          error: 'Rate limit exceeded',
          message: 'Too many requests, please try again later.',
          retryAfter: rateLimitResult.retryAfter
        });
      }
      
      // Set rate limit headers
      res.set({
        'X-RateLimit-Limit': rateLimitResult.remaining.toString(),
        'X-RateLimit-Remaining': rateLimitResult.remaining.toString(),
        'X-RateLimit-Reset': new Date(rateLimitResult.resetTime).toISOString()
      });
      
      next();
    } catch (error) {
      logger.error('Rate limiting middleware error:', error);
      // On error, allow the request to avoid blocking legitimate users
      next();
    }
  };
};

/**
 * Session management middleware
 */
export const sessionMiddleware = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const authHeader = req.headers['authorization'];
    const token = authHeader && authHeader.split(' ')[1];
    
    if (token) {
      // Check if token is blacklisted
      const isBlacklisted = await sessionService.isTokenBlacklisted(token);
      if (isBlacklisted) {
        return res.status(401).json({ error: 'Token is invalid' });
      }
      
      // Get session data
      const session = await sessionService.getSession(token);
      if (session) {
        // Update session activity
        await sessionService.updateSessionActivity(token);
        
        // Add session info to request
        req.session = session;
      }
    }
    
    next();
  } catch (error) {
    logger.error('Session middleware error:', error);
    next();
  }
};

/**
 * Caching middleware for GET requests
 */
export const cacheMiddleware = (cacheKey: string, ttl?: number) => {
  return async (req: Request, res: Response, next: NextFunction) => {
    try {
      // Only cache GET requests
      if (req.method !== 'GET') {
        return next();
      }
      
      // Generate cache key based on request parameters
      const fullCacheKey = `${cacheKey}:${req.originalUrl}`;
      
      // Try to get cached data
      const cachedData = await cacheService.getCachedData(fullCacheKey);
      
      if (cachedData) {
        // Return cached data
        res.set('X-Cache', 'HIT');
        return res.json(cachedData);
      }
      
      // Set cache miss header
      res.set('X-Cache', 'MISS');
      
      // Store original send method
      const originalSend = res.json;
      
      // Override send method to cache response
      res.json = function(data: any) {
        // Cache the response data
        cacheService.cacheData(fullCacheKey, data, ttl);
        
        // Call original send method
        return originalSend.call(this, data);
      };
      
      next();
    } catch (error) {
      logger.error('Cache middleware error:', error);
      next();
    }
  };
};

/**
 * Redis health check middleware
 */
export const redisHealthCheck = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const redisStatus = redisService.getConnectionStatus();
    
    if (!redisStatus) {
      logger.warn('Redis connection not available');
      return res.status(503).json({
        error: 'Service temporarily unavailable',
        message: 'Redis service is not available'
      });
    }
    
    // Test Redis connection
    await redisService.ping();
    next();
  } catch (error) {
    logger.error('Redis health check failed:', error);
    return res.status(503).json({
      error: 'Service temporarily unavailable',
      message: 'Redis service is not responding'
    });
  }
};

/**
 * Redis statistics middleware
 */
export const redisStatsMiddleware = async (req: Request, res: Response, next: NextFunction) => {
  try {
    // Add Redis stats to response headers
    const redisStatus = redisService.getConnectionStatus();
    res.set('X-Redis-Status', redisStatus ? 'connected' : 'disconnected');
    
    next();
  } catch (error) {
    logger.error('Redis stats middleware error:', error);
    next();
  }
};

/**
 * Cache invalidation middleware for non-GET requests
 */
export const cacheInvalidationMiddleware = (cachePatterns: string[]) => {
  return async (req: Request, res: Response, next: NextFunction) => {
    try {
      // Only invalidate cache for non-GET requests
      if (req.method === 'GET') {
        return next();
      }
      
      // Store original send method
      const originalSend = res.json;
      
      // Override send method to invalidate cache after successful response
      res.json = function(data: any) {
        // Invalidate related caches
        cachePatterns.forEach(async (pattern) => {
          try {
            await cacheService.invalidateDataCache(pattern);
          } catch (error) {
            logger.error(`Error invalidating cache pattern ${pattern}:`, error);
          }
        });
        
        // Call original send method
        return originalSend.call(this, data);
      };
      
      next();
    } catch (error) {
      logger.error('Cache invalidation middleware error:', error);
      next();
    }
  };
};

/**
 * User activity tracking middleware
 */
export const userActivityMiddleware = async (req: Request, res: Response, next: NextFunction) => {
  try {
    if (req.user?.id) {
      // Track user activity in Redis
      const activityKey = `user_activity:${req.user.id}`;
      const activityData = {
        lastEndpoint: req.originalUrl,
        lastMethod: req.method,
        lastAccess: new Date().toISOString(),
        userAgent: req.get('User-Agent'),
        ipAddress: req.ip
      };
      
      // Store activity data with 24-hour TTL
      await redisService.setObject(activityKey, activityData, 24 * 60 * 60);
      
      // Update user's last active time
      if (req.session) {
        await sessionService.updateSessionActivity(req.session.userId);
      }
    }
    
    next();
  } catch (error) {
    logger.error('User activity middleware error:', error);
    next();
  }
};

/**
 * Redis connection initialization middleware
 */
export const redisInitMiddleware = async (req: Request, res: Response, next: NextFunction) => {
  try {
    // Ensure Redis connection is established
    if (!redisService.getConnectionStatus()) {
      await redisService.connect();
    }
    next();
  } catch (error) {
    logger.error('Redis initialization middleware error:', error);
    // Continue without Redis if connection fails
    next();
  }
};

/**
 * Combined Redis middleware with configuration
 */
export const createRedisMiddleware = (config: Partial<RedisMiddlewareConfig> = {}) => {
  const defaultConfig: RedisMiddlewareConfig = {
    enableRateLimiting: true,
    enableSessionManagement: true,
    enableCaching: true,
    enableHealthCheck: true
  };
  
  const finalConfig = { ...defaultConfig, ...config };
  
  return [
    redisInitMiddleware,
    finalConfig.enableHealthCheck ? redisHealthCheck : (req: Request, res: Response, next: NextFunction) => next(),
    finalConfig.enableSessionManagement ? sessionMiddleware : (req: Request, res: Response, next: NextFunction) => next(),
    finalConfig.enableRateLimiting ? rateLimitMiddleware('api') : (req: Request, res: Response, next: NextFunction) => next(),
    redisStatsMiddleware
  ];
};

export default {
  rateLimitMiddleware,
  sessionMiddleware,
  cacheMiddleware,
  redisHealthCheck,
  redisStatsMiddleware,
  cacheInvalidationMiddleware,
  userActivityMiddleware,
  redisInitMiddleware,
  createRedisMiddleware
};
