import { Request, Response } from 'express';
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

/**
 * Fetches all unique course levels from the database.
 * This is useful for populating filter dropdowns on the frontend.
 */
export const getCourseLevels = async (req: Request, res: Response) => {
    try {
        const levels = await prisma.course.findMany({
            distinct: ['level'],
            select: {
                level: true,
            },
            orderBy: {
                level: 'asc',
            },
        });

        // Return an array of level numbers, e.g., [1, 2, 3, 4]
        const levelNumbers = levels.map(l => l.level);
        
        res.status(200).json(levelNumbers);
    } catch (error) {
        console.error("Error fetching course levels:", error);
        res.status(500).json({ message: 'Internal server error' });
    }
}; 