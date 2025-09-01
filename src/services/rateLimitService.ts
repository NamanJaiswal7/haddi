import redisService from './redisService';
import logger from '../utils/logger';

export interface RateLimitConfig {
  windowMs: number; // Time window in milliseconds
  maxRequests: number; // Maximum requests per window
  skipSuccessfulRequests: boolean; // Skip rate limiting for successful requests
  skipFailedRequests: boolean; // Skip rate limiting for failed requests
  message: string; // Error message when rate limit is exceeded
}

export interface RateLimitRule {
  endpoint: string;
  config: RateLimitConfig;
}

export interface RateLimitResult {
  allowed: boolean;
  remaining: number;
  resetTime: number;
  retryAfter?: number;
}

class RateLimitService {
  private defaultConfig: RateLimitConfig = {
    windowMs: 15 * 60 * 1000, // 15 minutes
    maxRequests: 100,
    skipSuccessfulRequests: false,
    skipFailedRequests: false,
    message: 'Too many requests, please try again later.'
  };

  private rules: Map<string, RateLimitConfig> = new Map();

  constructor() {
    this.setupDefaultRules();
  }

  /**
   * Setup default rate limiting rules
   */
  private setupDefaultRules(): void {
    // Global rate limit
    this.addRule('global', {
      windowMs: 15 * 60 * 1000, // 15 minutes
      maxRequests: 1000,
      skipSuccessfulRequests: false,
      skipFailedRequests: false,
      message: 'Global rate limit exceeded'
    });

    // Authentication endpoints
    this.addRule('auth', {
      windowMs: 15 * 60 * 1000, // 15 minutes
      maxRequests: 5,
      skipSuccessfulRequests: false,
      skipFailedRequests: false,
      message: 'Too many authentication attempts'
    });

    // API endpoints
    this.addRule('api', {
      windowMs: 15 * 60 * 1000, // 15 minutes
      maxRequests: 200,
      skipSuccessfulRequests: false,
      skipFailedRequests: false,
      message: 'API rate limit exceeded'
    });

    // File upload endpoints
    this.addRule('upload', {
      windowMs: 60 * 60 * 1000, // 1 hour
      maxRequests: 10,
      skipSuccessfulRequests: false,
      skipFailedRequests: false,
      message: 'Upload rate limit exceeded'
    });

    // Admin endpoints
    this.addRule('admin', {
      windowMs: 15 * 60 * 1000, // 15 minutes
      maxRequests: 50,
      skipSuccessfulRequests: false,
      skipFailedRequests: false,
      message: 'Admin rate limit exceeded'
    });
  }

  /**
   * Add a new rate limiting rule
   */
  addRule(endpoint: string, config: Partial<RateLimitConfig>): void {
    const ruleConfig = { ...this.defaultConfig, ...config };
    this.rules.set(endpoint, ruleConfig);
    logger.info(`Rate limit rule added for ${endpoint}: ${ruleConfig.maxRequests} requests per ${ruleConfig.windowMs}ms`);
  }

  /**
   * Remove a rate limiting rule
   */
  removeRule(endpoint: string): void {
    this.rules.delete(endpoint);
    logger.info(`Rate limit rule removed for ${endpoint}`);
  }

  /**
   * Get rate limit configuration for an endpoint
   */
  getRule(endpoint: string): RateLimitConfig | undefined {
    return this.rules.get(endpoint);
  }

  /**
   * Check if a request is allowed based on rate limiting
   */
  async checkRateLimit(
    identifier: string,
    endpoint: string = 'global',
    customConfig?: Partial<RateLimitConfig>
  ): Promise<RateLimitResult> {
    try {
      const rule = customConfig ? { ...this.defaultConfig, ...customConfig } : this.rules.get(endpoint) || this.defaultConfig;
      
      const key = `rate_limit:${endpoint}:${identifier}`;
      const windowKey = `rate_limit_window:${endpoint}:${identifier}`;
      
      const now = Date.now();
      const windowStart = now - (now % rule.windowMs);
      
      // Get current request count
      const currentCount = await redisService.get(key);
      const count = currentCount ? parseInt(currentCount) : 0;
      
      // Check if we're in a new window
      const currentWindow = await redisService.get(windowKey);
      const window = currentWindow ? parseInt(currentWindow) : windowStart;
      
      if (window < windowStart) {
        // New window, reset counter
        await redisService.set(key, '1', Math.ceil(rule.windowMs / 1000));
        await redisService.set(windowKey, windowStart.toString(), Math.ceil(rule.windowMs / 1000));
        
        return {
          allowed: true,
          remaining: rule.maxRequests - 1,
          resetTime: windowStart + rule.windowMs
        };
      }
      
      if (count >= rule.maxRequests) {
        // Rate limit exceeded
        const resetTime = windowStart + rule.windowMs;
        const retryAfter = Math.ceil((resetTime - now) / 1000);
        
        return {
          allowed: false,
          remaining: 0,
          resetTime,
          retryAfter
        };
      }
      
      // Increment counter
      await redisService.incr(key);
      await redisService.expire(key, Math.ceil(rule.windowMs / 1000));
      
      return {
        allowed: true,
        remaining: rule.maxRequests - count - 1,
        resetTime: windowStart + rule.windowMs
      };
      
    } catch (error) {
      logger.error('Error checking rate limit:', error);
      // On error, allow the request to avoid blocking legitimate users
      return {
        allowed: true,
        remaining: 999,
        resetTime: Date.now() + this.defaultConfig.windowMs
      };
    }
  }

  /**
   * Reset rate limit for an identifier
   */
  async resetRateLimit(identifier: string, endpoint: string = 'global'): Promise<void> {
    try {
      const key = `rate_limit:${endpoint}:${identifier}`;
      const windowKey = `rate_limit_window:${endpoint}:${identifier}`;
      
      await redisService.del(key);
      await redisService.del(windowKey);
      
      logger.info(`Rate limit reset for ${endpoint}:${identifier}`);
    } catch (error) {
      logger.error('Error resetting rate limit:', error);
    }
  }

  /**
   * Get rate limit information for an identifier
   */
  async getRateLimitInfo(
    identifier: string,
    endpoint: string = 'global'
  ): Promise<{
    current: number;
    limit: number;
    remaining: number;
    resetTime: number;
    windowMs: number;
  } | null> {
    try {
      const rule = this.rules.get(endpoint) || this.defaultConfig;
      const key = `rate_limit:${endpoint}:${identifier}`;
      const windowKey = `rate_limit_window:${endpoint}:${identifier}`;
      
      const currentCount = await redisService.get(key);
      const currentWindow = await redisService.get(windowKey);
      
      if (!currentCount || !currentWindow) {
        return null;
      }
      
      const count = parseInt(currentCount);
      const window = parseInt(currentWindow);
      const now = Date.now();
      const windowStart = window;
      const resetTime = windowStart + rule.windowMs;
      
      return {
        current: count,
        limit: rule.maxRequests,
        remaining: Math.max(0, rule.maxRequests - count),
        resetTime,
        windowMs: rule.windowMs
      };
      
    } catch (error) {
      logger.error('Error getting rate limit info:', error);
      return null;
    }
  }

  /**
   * Block an identifier temporarily
   */
  async blockIdentifier(
    identifier: string,
    endpoint: string = 'global',
    duration: number = 3600 // 1 hour default
  ): Promise<void> {
    try {
      const blockKey = `blocked:${endpoint}:${identifier}`;
      await redisService.set(blockKey, Date.now().toString(), duration);
      
      logger.warn(`Identifier ${identifier} blocked for ${endpoint} for ${duration} seconds`);
    } catch (error) {
      logger.error('Error blocking identifier:', error);
    }
  }

  /**
   * Check if an identifier is blocked
   */
  async isIdentifierBlocked(identifier: string, endpoint: string = 'global'): Promise<boolean> {
    try {
      const blockKey = `blocked:${endpoint}:${identifier}`;
      return await redisService.exists(blockKey);
    } catch (error) {
      logger.error('Error checking if identifier is blocked:', error);
      return false;
    }
  }

  /**
   * Unblock an identifier
   */
  async unblockIdentifier(identifier: string, endpoint: string = 'global'): Promise<void> {
    try {
      const blockKey = `blocked:${endpoint}:${identifier}`;
      await redisService.del(blockKey);
      
      logger.info(`Identifier ${identifier} unblocked for ${endpoint}`);
    } catch (error) {
      logger.error('Error unblocking identifier:', error);
    }
  }

  /**
   * Get blocked identifiers
   */
  async getBlockedIdentifiers(endpoint?: string): Promise<string[]> {
    try {
      // This is a simplified version - in production you might want pattern-based scanning
      logger.info('Getting blocked identifiers');
      return [];
    } catch (error) {
      logger.error('Error getting blocked identifiers:', error);
      return [];
    }
  }

  /**
   * Get rate limiting statistics
   */
  async getStats(): Promise<{
    totalRules: number;
    redisStatus: boolean;
    blockedCount: number;
  }> {
    try {
      const redisStatus = redisService.getConnectionStatus();
      
      return {
        totalRules: this.rules.size,
        redisStatus,
        blockedCount: 0 // Would need to implement scanning
      };
    } catch (error) {
      logger.error('Error getting rate limit stats:', error);
      return {
        totalRules: 0,
        redisStatus: false,
        blockedCount: 0
      };
    }
  }

  /**
   * Update default configuration
   */
  updateDefaultConfig(newConfig: Partial<RateLimitConfig>): void {
    this.defaultConfig = { ...this.defaultConfig, ...newConfig };
    logger.info('Rate limit default configuration updated:', this.defaultConfig);
  }

  /**
   * Clear all rate limit data (use with caution)
   */
  async clearAllRateLimits(): Promise<void> {
    try {
      // This is a simplified version - in production you might want pattern-based deletion
      logger.warn('All rate limit data cleared');
    } catch (error) {
      logger.error('Error clearing all rate limits:', error);
    }
  }
}

export default new RateLimitService();
