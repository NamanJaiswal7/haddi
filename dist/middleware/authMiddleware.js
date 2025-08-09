"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.isStudent = exports.isMasterAdmin = exports.isDistrictAdmin = exports.authenticateToken = void 0;
const jsonwebtoken_1 = __importDefault(require("jsonwebtoken"));
const client_1 = require("@prisma/client");
const prisma = new client_1.PrismaClient();
const authenticateToken = async (req, res, next) => {
    const authHeader = req.headers['authorization'];
    const token = authHeader && authHeader.split(' ')[1];
    if (!token) {
        return res.sendStatus(401); // Unauthorized
    }
    try {
        const payload = jsonwebtoken_1.default.verify(token, process.env.JWT_SECRET);
        const user = await prisma.user.findUnique({
            where: { id: payload.id }
        });
        if (!user) {
            return res.sendStatus(403); // Forbidden
        }
        req.user = user;
        next();
    }
    catch (error) {
        return res.sendStatus(403); // Forbidden
    }
};
exports.authenticateToken = authenticateToken;
const isDistrictAdmin = async (req, res, next) => {
    if (req.user?.role !== 'district_admin') {
        return res.status(403).json({ message: 'Forbidden: Access is restricted to district admins.' });
    }
    next();
};
exports.isDistrictAdmin = isDistrictAdmin;
const isMasterAdmin = async (req, res, next) => {
    if (req.user?.role !== 'master_admin') {
        return res.status(403).json({ message: 'Forbidden: Access is restricted to master admins.' });
    }
    next();
};
exports.isMasterAdmin = isMasterAdmin;
const isStudent = async (req, res, next) => {
    if (req.user?.role !== 'student') {
        return res.status(403).json({ message: 'Forbidden: Access is restricted to students.' });
    }
    next();
};
exports.isStudent = isStudent;
