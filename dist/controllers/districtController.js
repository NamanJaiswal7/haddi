"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.getAllDistricts = void 0;
const client_1 = require("@prisma/client");
const prisma = new client_1.PrismaClient();
/**
 * Fetches a list of all districts.
 * Returns an array of objects with district id and name.
 */
const getAllDistricts = async (req, res) => {
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
    }
    catch (error) {
        console.error("Error fetching districts:", error);
        res.status(500).json({ message: 'Internal server error' });
    }
};
exports.getAllDistricts = getAllDistricts;
