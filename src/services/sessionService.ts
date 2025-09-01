import redisService from './redisService';
import logger from '../utils/logger';

export interface UserSession {
  userId: string;
  role: string;
  lastActive: Date;
  deviceInfo?: string;
  ipAddress?: string;
}

export interface SessionConfig {
  sessionTTL: number; // in seconds
  maxSessionsPerUser: number;
  cleanupInterval: number; // in seconds
}

class SessionService {
  private config: SessionConfig = {
    sessionTTL: 24 * 60 * 60, // 24 hours default
    maxSessionsPerUser: 5, // max 5 active sessions per user
    cleanupInterval: 60 * 60 // 1 hour
  };

  constructor() {
    this.startCleanupTask();
  }

  /**
   * Store a new session for a user
   */
  async createSession(token: string, sessionData: UserSession): Promise<void> {
    try {
      const sessionKey = `session:${token}`;
      const userSessionsKey = `user_sessions:${sessionData.userId}`;
      
      // Store session data
      await redisService.setObject(sessionKey, sessionData, this.config.sessionTTL);
      
      // Add session to user's active sessions set
      await redisService.sadd(userSessionsKey, token);
      await redisService.expire(userSessionsKey, this.config.sessionTTL);
      
      // Store user info for quick access - use a different key prefix to avoid conflicts
      const userSessionKey = `user_session:${sessionData.userId}`;
      await redisService.hSet(userSessionKey, 'role', sessionData.role);
      await redisService.hSet(userSessionKey, 'lastActive', sessionData.lastActive.toISOString());
      await redisService.expire(userSessionKey, this.config.sessionTTL);
      
      logger.info(`Session created for user ${sessionData.userId}`);
    } catch (error) {
      logger.error('Error creating session:', error);
      throw error;
    }
  }

  /**
   * Get session data by token
   */
  async getSession(token: string): Promise<UserSession | null> {
    try {
      const sessionKey = `session:${token}`;
      return await redisService.getObject<UserSession>(sessionKey);
    } catch (error) {
      logger.error('Error getting session:', error);
      return null;
    }
  }

  /**
   * Check if a token is valid (not blacklisted)
   */
  async isTokenValid(token: string): Promise<boolean> {
    try {
      const sessionKey = `session:${token}`;
      return await redisService.exists(sessionKey);
    } catch (error) {
      logger.error('Error checking token validity:', error);
      return false;
    }
  }

  /**
   * Invalidate a session (logout)
   */
  async invalidateSession(token: string): Promise<void> {
    try {
      const sessionKey = `session:${token}`;
      const session = await this.getSession(token);
      
      if (session) {
        // Remove from user's active sessions
        const userSessionsKey = `user_sessions:${session.userId}`;
        await redisService.srem(userSessionsKey, token);
        
        // Delete session data
        await redisService.del(sessionKey);
        
        logger.info(`Session invalidated for user ${session.userId}`);
      }
    } catch (error) {
      logger.error('Error invalidating session:', error);
      throw error;
    }
  }

  /**
   * Invalidate all sessions for a user (force logout from all devices)
   */
  async invalidateAllUserSessions(userId: string): Promise<void> {
    try {
      const userSessionsKey = `user_sessions:${userId}`;
      const tokens = await redisService.smembers(userSessionsKey);
      
      // Delete all session data
      for (const token of tokens) {
        await redisService.del(`session:${token}`);
      }
      
      // Delete user sessions set
      await redisService.del(userSessionsKey);
      
      // Delete user session info - use the session-specific key
      await redisService.del(`user_session:${userId}`);
      
      logger.info(`All sessions invalidated for user ${userId}`);
    } catch (error) {
      logger.error('Error invalidating all user sessions:', error);
      throw error;
    }
  }

  /**
   * Update session activity
   */
  async updateSessionActivity(token: string): Promise<void> {
    try {
      const sessionKey = `session:${token}`;
      const session = await this.getSession(token);
      
      if (session) {
        session.lastActive = new Date();
        await redisService.setObject(sessionKey, session, this.config.sessionTTL);
        
        // Update user last active - use the session-specific key
        const userSessionKey = `user_session:${session.userId}`;
        await redisService.hSet(userSessionKey, 'lastActive', session.lastActive.toISOString());
        await redisService.expire(userSessionKey, this.config.sessionTTL);
      }
    } catch (error) {
      logger.error('Error updating session activity:', error);
    }
  }

  /**
   * Get all active sessions for a user
   */
  async getUserActiveSessions(userId: string): Promise<UserSession[]> {
    try {
      const userSessionsKey = `user_sessions:${userId}`;
      const tokens = await redisService.smembers(userSessionsKey);
      
      const sessions: UserSession[] = [];
      for (const token of tokens) {
        const session = await this.getSession(token);
        if (session) {
          sessions.push(session);
        }
      }
      
      return sessions.sort((a, b) => b.lastActive.getTime() - a.lastActive.getTime());
    } catch (error) {
      logger.error('Error getting user active sessions:', error);
      return [];
    }
  }

  /**
   * Get user info from cache
   */
  async getUserInfo(userId: string): Promise<{ role: string; lastActive: string } | null> {
    try {
      const userSessionKey = `user_session:${userId}`;
      const role = await redisService.hGet(userSessionKey, 'role');
      const lastActive = await redisService.hGet(userSessionKey, 'lastActive');
      
      if (role && lastActive) {
        return { role, lastActive };
      }
      return null;
    } catch (error) {
      logger.error('Error getting user info:', error);
      return null;
    }
  }

  /**
   * Blacklist a token (for logout or security purposes)
   */
  async blacklistToken(token: string, reason: string = 'logout'): Promise<void> {
    try {
      const blacklistKey = `blacklist:${token}`;
      const blacklistData = {
        reason,
        timestamp: new Date().toISOString(),
        expiresAt: new Date(Date.now() + this.config.sessionTTL * 1000).toISOString()
      };
      
      await redisService.setObject(blacklistKey, blacklistData, this.config.sessionTTL);
      logger.info(`Token blacklisted: ${reason}`);
    } catch (error) {
      logger.error('Error blacklisting token:', error);
      throw error;
    }
  }

  /**
   * Check if a token is blacklisted
   */
  async isTokenBlacklisted(token: string): Promise<boolean> {
    try {
      const blacklistKey = `blacklist:${token}`;
      return await redisService.exists(blacklistKey);
    } catch (error) {
      logger.error('Error checking token blacklist:', error);
      return false;
    }
  }

  /**
   * Get session statistics
   */
  async getSessionStats(): Promise<{
    totalActiveSessions: number;
    totalUsers: number;
    redisStatus: boolean;
  }> {
    try {
      const redisStatus = redisService.getConnectionStatus();
      
      // This is a simplified version - in production you might want more detailed stats
      return {
        totalActiveSessions: 0, // Would need to implement scanning logic
        totalUsers: 0, // Would need to implement scanning logic
        redisStatus
      };
    } catch (error) {
      logger.error('Error getting session stats:', error);
      return {
        totalActiveSessions: 0,
        totalUsers: 0,
        redisStatus: false
      };
    }
  }

  /**
   * Clean up expired sessions
   */
  private async cleanupExpiredSessions(): Promise<void> {
    try {
      // This is a placeholder for cleanup logic
      // In production, you might want to implement a more sophisticated cleanup
      logger.info('Session cleanup task executed');
    } catch (error) {
      logger.error('Error during session cleanup:', error);
    }
  }

  /**
   * Start the cleanup task
   */
  private startCleanupTask(): void {
    setInterval(() => {
      this.cleanupExpiredSessions();
    }, this.config.cleanupInterval * 1000);
  }

  /**
   * Update configuration
   */
  updateConfig(newConfig: Partial<SessionConfig>): void {
    this.config = { ...this.config, ...newConfig };
    logger.info('Session service configuration updated:', this.config);
  }
}

export default new SessionService();
