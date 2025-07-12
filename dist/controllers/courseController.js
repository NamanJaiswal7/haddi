"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.getCourseLevels = void 0;
const client_1 = require("@prisma/client");
const prisma = new client_1.PrismaClient();
/**
 * Fetches all unique course levels from the database.
 * This is useful for populating filter dropdowns on the frontend.
 */
const getCourseLevels = async (req, res) => {
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
    }
    catch (error) {
        console.error("Error fetching course levels:", error);
        res.status(500).json({ message: 'Internal server error' });
    }
};
exports.getCourseLevels = getCourseLevels;
