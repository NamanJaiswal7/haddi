import { Request, Response } from 'express';
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

/**
 * Fetches a list of all districts.
 * Returns an array of objects with district id and name.
 */
export const getAllDistricts = async (req: Request, res: Response) => {
    try {
        const districts = await prisma.district.findMany({
            select: {
                id: true,
                name: true,
            },
            orderBy: {
                name: 'asc',
            },
        });
        res.status(200).json(districts);
    } catch (error) {
        console.error("Error fetching districts:", error);
        res.status(500).json({ message: 'Internal server error' });
    }
}; 