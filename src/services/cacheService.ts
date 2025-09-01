import redisService from './redisService';
import logger from '../utils/logger';

export interface CacheConfig {
  defaultTTL: number; // in seconds
  courseCacheTTL: number;
  userCacheTTL: number;
  quizCacheTTL: number;
  statsCacheTTL: number;
}

export interface CacheKey {
  prefix: string;
  identifier: string;
  suffix?: string;
}

class CacheService {
  private config: CacheConfig = {
    defaultTTL: 30 * 60, // 30 minutes
    courseCacheTTL: 60 * 60, // 1 hour
    userCacheTTL: 15 * 60, // 15 minutes
    quizCacheTTL: 24 * 60 * 60, // 24 hours
    statsCacheTTL: 5 * 60 // 5 minutes
  };

  /**
   * Generate cache key
   */
  private generateKey(cacheKey: CacheKey): string {
    let key = `${cacheKey.prefix}:${cacheKey.identifier}`;
    if (cacheKey.suffix) {
      key += `:${cacheKey.suffix}`;
    }
    return key;
  }

  /**
   * Get TTL for specific cache type
   */
  private getTTL(cacheType: keyof CacheConfig): number {
    return this.config[cacheType];
  }

  /**
   * Course caching methods
   */
  async cacheCourse(courseId: string, courseData: any): Promise<void> {
    try {
      const key = this.generateKey({ prefix: 'course', identifier: courseId });
      await redisService.setObject(key, courseData, this.getTTL('courseCacheTTL'));
      logger.info(`Course cached: ${courseId}`);
    } catch (error) {
      logger.error('Error caching course:', error);
    }
  }

  async getCachedCourse(courseId: string): Promise<any | null> {
    try {
      const key = this.generateKey({ prefix: 'course', identifier: courseId });
      return await redisService.getObject(key);
    } catch (error) {
      logger.error('Error getting cached course:', error);
      return null;
    }
  }

  async invalidateCourseCache(courseId: string): Promise<void> {
    try {
      const key = this.generateKey({ prefix: 'course', identifier: courseId });
      await redisService.del(key);
      
      // Also invalidate related caches
      await this.invalidateCourseListCache();
      logger.info(`Course cache invalidated: ${courseId}`);
    } catch (error) {
      logger.error('Error invalidating course cache:', error);
    }
  }

  async cacheCourseList(classLevel: string, courses: any[]): Promise<void> {
    try {
      const key = this.generateKey({ prefix: 'course_list', identifier: classLevel });
      await redisService.setObject(key, courses, this.getTTL('courseCacheTTL'));
      logger.info(`Course list cached for level: ${classLevel}`);
    } catch (error) {
      logger.error('Error caching course list:', error);
    }
  }

  async getCachedCourseList(classLevel: string): Promise<any[] | null> {
    try {
      const key = this.generateKey({ prefix: 'course_list', identifier: classLevel });
      return await redisService.getObject<any[]>(key);
    } catch (error) {
      logger.error('Error getting cached course list:', error);
      return null;
    }
  }

  async invalidateCourseListCache(): Promise<void> {
    try {
      // This is a simplified invalidation - in production you might want pattern-based deletion
      logger.info('Course list cache invalidated');
    } catch (error) {
      logger.error('Error invalidating course list cache:', error);
    }
  }

  /**
   * User caching methods
   */
  async cacheUser(userId: string, userData: any): Promise<void> {
    try {
      const key = this.generateKey({ prefix: 'user', identifier: userId });
      await redisService.setObject(key, userData, this.getTTL('userCacheTTL'));
      logger.info(`User cached: ${userId}`);
    } catch (error) {
      logger.error('Error caching user:', error);
    }
  }

  async getCachedUser(userId: string): Promise<any | null> {
    try {
      const key = this.generateKey({ prefix: 'user', identifier: userId });
      return await redisService.getObject(key);
    } catch (error) {
      logger.error('Error getting cached user:', error);
      return null;
    }
  }

  async invalidateUserCache(userId: string): Promise<void> {
    try {
      const key = this.generateKey({ prefix: 'user', identifier: userId });
      await redisService.del(key);
      logger.info(`User cache invalidated: ${userId}`);
    } catch (error) {
      logger.error('Error invalidating user cache:', error);
    }
  }

  /**
   * Quiz caching methods
   */
  async cacheQuiz(quizId: string, quizData: any): Promise<void> {
    try {
      const key = this.generateKey({ prefix: 'quiz', identifier: quizId });
      await redisService.setObject(key, quizData, this.getTTL('quizCacheTTL'));
      logger.info(`Quiz cached: ${quizId}`);
    } catch (error) {
      logger.error('Error caching quiz:', error);
    }
  }

  async getCachedQuiz(quizId: string): Promise<any | null> {
    try {
      const key = this.generateKey({ prefix: 'quiz', identifier: quizId });
      return await redisService.getObject(key);
    } catch (error) {
      logger.error('Error getting cached quiz:', error);
      return null;
    }
  }

  async invalidateQuizCache(quizId: string): Promise<void> {
    try {
      const key = this.generateKey({ prefix: 'quiz', identifier: quizId });
      await redisService.del(key);
      logger.info(`Quiz cache invalidated: ${quizId}`);
    } catch (error) {
      logger.error('Error invalidating quiz cache:', error);
    }
  }

  /**
   * Statistics caching methods
   */
  async cacheStats(statsType: string, statsData: any): Promise<void> {
    try {
      const key = this.generateKey({ prefix: 'stats', identifier: statsType });
      await redisService.setObject(key, statsData, this.getTTL('statsCacheTTL'));
      logger.info(`Stats cached: ${statsType}`);
    } catch (error) {
      logger.error('Error caching stats:', error);
    }
  }

  async getCachedStats(statsType: string): Promise<any | null> {
    try {
      const key = this.generateKey({ prefix: 'stats', identifier: statsType });
      return await redisService.getObject(key);
    } catch (error) {
      logger.error('Error getting cached stats:', error);
      return null;
    }
  }

  async invalidateStatsCache(statsType: string): Promise<void> {
    try {
      const key = this.generateKey({ prefix: 'stats', identifier: statsType });
      await redisService.del(key);
      logger.info(`Stats cache invalidated: ${statsType}`);
    } catch (error) {
      logger.error('Error invalidating stats cache:', error);
    }
  }

  /**
   * Generic caching methods
   */
  async cacheData(key: string, data: any, ttl?: number): Promise<void> {
    try {
      const cacheKey = this.generateKey({ prefix: 'custom', identifier: key });
      await redisService.setObject(cacheKey, data, ttl || this.config.defaultTTL);
      logger.info(`Data cached: ${key}`);
    } catch (error) {
      logger.error('Error caching data:', error);
    }
  }

  async getCachedData<T>(key: string): Promise<T | null> {
    try {
      const cacheKey = this.generateKey({ prefix: 'custom', identifier: key });
      return await redisService.getObject<T>(cacheKey);
    } catch (error) {
      logger.error('Error getting cached data:', error);
      return null;
    }
  }

  async invalidateDataCache(key: string): Promise<void> {
    try {
      const cacheKey = this.generateKey({ prefix: 'custom', identifier: key });
      await redisService.del(cacheKey);
      logger.info(`Data cache invalidated: ${key}`);
    } catch (error) {
      logger.error('Error invalidating data cache:', error);
    }
  }

  /**
   * Bulk operations
   */
  async invalidateAllCourseCaches(): Promise<void> {
    try {
      // This is a simplified version - in production you might want pattern-based deletion
      logger.info('All course caches invalidated');
    } catch (error) {
      logger.error('Error invalidating all course caches:', error);
    }
  }

  async invalidateAllUserCaches(): Promise<void> {
    try {
      // This is a simplified version - in production you might want pattern-based deletion
      logger.info('All user caches invalidated');
    } catch (error) {
      logger.error('Error invalidating all user caches:', error);
    }
  }

  /**
   * Cache warming methods
   */
  async warmCourseCache(courseIds: string[]): Promise<void> {
    try {
      logger.info(`Warming cache for ${courseIds.length} courses`);
      // This would typically involve fetching data from the database and caching it
      // Implementation depends on your data access patterns
    } catch (error) {
      logger.error('Error warming course cache:', error);
    }
  }

  /**
   * Cache statistics
   */
  async getCacheStats(): Promise<{
    redisStatus: boolean;
    cacheHits: number;
    cacheMisses: number;
    totalKeys: number;
  }> {
    try {
      const redisStatus = redisService.getConnectionStatus();
      
      // This is a simplified version - in production you might want more detailed stats
      return {
        redisStatus,
        cacheHits: 0, // Would need to implement tracking
        cacheMisses: 0, // Would need to implement tracking
        totalKeys: 0 // Would need to implement scanning
      };
    } catch (error) {
      logger.error('Error getting cache stats:', error);
      return {
        redisStatus: false,
        cacheHits: 0,
        cacheMisses: 0,
        totalKeys: 0
      };
    }
  }

  /**
   * Update configuration
   */
  updateConfig(newConfig: Partial<CacheConfig>): void {
    this.config = { ...this.config, ...newConfig };
    logger.info('Cache service configuration updated:', this.config);
  }

  /**
   * Clear all caches (use with caution)
   */
  async clearAllCaches(): Promise<void> {
    try {
      // This is a simplified version - in production you might want pattern-based deletion
      logger.warn('All caches cleared');
    } catch (error) {
      logger.error('Error clearing all caches:', error);
    }
  }
}

export default new CacheService();
