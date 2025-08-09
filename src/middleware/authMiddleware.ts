import { Request, Response, NextFunction } from 'express';
import jwt from 'jsonwebtoken';
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

export const authenticateToken = async (req: Request, res: Response, next: NextFunction) => {
    const authHeader = req.headers['authorization'];
    const token = authHeader && authHeader.split(' ')[1];

    if (!token) {
        return res.sendStatus(401); // Unauthorized
    }

    try {
        const payload = jwt.verify(token, process.env.JWT_SECRET!) as { id: string; role: string; iat: number; exp: number };
        
        const user = await prisma.user.findUnique({
            where: { id: payload.id }
        });

        if (!user) {
            return res.sendStatus(403); // Forbidden
        }

        req.user = user;
        next();
    } catch (error) {
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