import { Request, Response, NextFunction } from 'express';
import jwt from 'jsonwebtoken';
import { PrismaClient } from '@prisma/client';
import sessionService from '../services/sessionService';
import cacheService from '../services/cacheService';
import { logger } from '../utils/logger';

const prisma = new PrismaClient();

export const authenticateToken = async (req: Request, res: Response, next: NextFunction) => {
    const authHeader = req.headers['authorization'];
    const token = authHeader && authHeader.split(' ')[1];

    if (!token) {
        return res.sendStatus(401); // Unauthorized
    }

    try {
        // First check if token is blacklisted in Redis
        const isBlacklisted = await sessionService.isTokenBlacklisted(token);
        if (isBlacklisted) {
            logger.warn(`Blacklisted token attempt: ${token.substring(0, 10)}...`);
            return res.sendStatus(401); // Unauthorized
        }

        // Verify JWT token
        const payload = jwt.verify(token, process.env.JWT_SECRET!) as { 
            id: string; 
            role: string; 
            iat: number; 
            exp: number 
        };
        
        // Check if token is expired
        if (Date.now() >= payload.exp * 1000) {
            logger.warn(`Expired token attempt: ${token.substring(0, 10)}...`);
            return res.sendStatus(401); // Unauthorized
        }

        // Try to get user from cache first
        let user = await cacheService.getCachedUser(payload.id);
        
        if (!user) {
            // If not in cache, get from database
            user = await prisma.user.findUnique({
                where: { id: payload.id }
            });

            if (user) {
                // Cache user data
                await cacheService.cacheUser(payload.id, user);
            }
        }

        if (!user) {
            logger.warn(`User not found for token: ${token.substring(0, 10)}...`);
            return res.sendStatus(403); // Forbidden
        }

        // Check if user role matches token role
        if (user.role !== payload.role) {
            logger.warn(`Role mismatch for user ${user.id}: token role ${payload.role}, user role ${user.role}`);
            return res.sendStatus(403); // Forbidden
        }

        // Create or update session in Redis
        await sessionService.createSession(token, {
            userId: user.id,
            role: user.role,
            lastActive: new Date(),
            deviceInfo: req.get('User-Agent'),
            ipAddress: req.ip
        });

        // Update user's last active time
        await prisma.user.update({
            where: { id: user.id },
            data: { lastActiveAt: new Date() }
        });

        req.user = user;
        next();
    } catch (error) {
        if (error instanceof jwt.JsonWebTokenError) {
            logger.warn(`Invalid JWT token: ${error.message}`);
            return res.sendStatus(401); // Unauthorized
        }
        
        if (error instanceof jwt.TokenExpiredError) {
            logger.warn(`Expired JWT token: ${error.message}`);
            return res.sendStatus(401); // Unauthorized
        }

        logger.error('Authentication error:', error);
        return res.sendStatus(403); // Forbidden
    }
};

export const isDistrictAdmin = async (req: Request, res: Response, next: NextFunction) => {
    if (req.user?.role !== 'district_admin') {
        return res.status(403).json({ message: 'Forbidden: Access is restricted to district admins.' });
    }
    next();
};

export const isMasterAdmin = async (req: Request, res: Response, next: NextFunction) => {
    if (req.user?.role !== 'master_admin') {
        return res.status(403).json({ message: 'Forbidden: Access is restricted to master admins.' });
    }
    next();
};

export const isStudent = async (req: Request, res: Response, next: NextFunction) => {
    if (req.user?.role !== 'student') {
        return res.status(403).json({ message: 'Forbidden: Access is restricted to students.' });
    }
    next();
};

/**
 * Enhanced authentication with session validation
 */
export const authenticateTokenWithSession = async (req: Request, res: Response, next: NextFunction) => {
    const authHeader = req.headers['authorization'];
    const token = authHeader && authHeader.split(' ')[1];

    if (!token) {
        return res.sendStatus(401); // Unauthorized
    }

    try {
        // Check if token is blacklisted
        const isBlacklisted = await sessionService.isTokenBlacklisted(token);
        if (isBlacklisted) {
            logger.warn(`Blacklisted token attempt: ${token.substring(0, 10)}...`);
            return res.sendStatus(401); // Unauthorized
        }

        // Get session from Redis
        const session = await sessionService.getSession(token);
        if (!session) {
            logger.warn(`No session found for token: ${token.substring(0, 10)}...`);
            return res.sendStatus(401); // Unauthorized
        }

        // Verify JWT token
        const payload = jwt.verify(token, process.env.JWT_SECRET!) as { 
            id: string; 
            role: string; 
            iat: number; 
            exp: number 
        };

        // Check if session user ID matches token user ID
        if (session.userId !== payload.id) {
            logger.warn(`Session user ID mismatch: session ${session.userId}, token ${payload.id}`);
            return res.sendStatus(401); // Unauthorized
        }

        // Check if session role matches token role
        if (session.role !== payload.role) {
            logger.warn(`Session role mismatch: session ${session.role}, token ${payload.role}`);
            return res.sendStatus(401); // Unauthorized
        }

        // Get user from cache or database
        let user = await cacheService.getCachedUser(session.userId);
        
        if (!user) {
            user = await prisma.user.findUnique({
                where: { id: session.userId }
            });

            if (user) {
                await cacheService.cacheUser(session.userId, user);
            }
        }

        if (!user) {
            logger.warn(`User not found for session: ${session.userId}`);
            return res.sendStatus(403); // Forbidden
        }

        // Update session activity
        await sessionService.updateSessionActivity(token);

        req.user = user;
        req.session = session;
        next();
    } catch (error) {
        if (error instanceof jwt.JsonWebTokenError) {
            logger.warn(`Invalid JWT token: ${error.message}`);
            return res.sendStatus(401); // Unauthorized
        }
        
        if (error instanceof jwt.TokenExpiredError) {
            logger.warn(`Expired JWT token: ${error.message}`);
            return res.sendStatus(401); // Unauthorized
        }

        logger.error('Session authentication error:', error);
        return res.sendStatus(403); // Forbidden
    }
};

/**
 * Logout middleware - invalidates session and blacklists token
 */
export const logout = async (req: Request, res: Response, next: NextFunction) => {
    try {
        const authHeader = req.headers['authorization'];
        const token = authHeader && authHeader.split(' ')[1];

        if (token) {
            // Invalidate session
            await sessionService.invalidateSession(token);
            
            // Blacklist token
            await sessionService.blacklistToken(token, 'logout');
            
            logger.info(`User logged out: ${req.user?.id || 'unknown'}`);
        }

        next();
    } catch (error) {
        logger.error('Logout error:', error);
        next();
    }
};

/**
 * Force logout from all devices
 */
export const forceLogoutAllDevices = async (req: Request, res: Response, next: NextFunction) => {
    try {
        if (req.user?.id) {
            await sessionService.invalidateAllUserSessions(req.user.id);
            logger.info(`All sessions invalidated for user: ${req.user.id}`);
        }
        next();
    } catch (error) {
        logger.error('Force logout error:', error);
        next();
    }
}; 