"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = __importDefault(require("express"));
const cors_1 = __importDefault(require("cors"));
const dotenv_1 = __importDefault(require("dotenv"));
const auth_1 = __importDefault(require("./routes/auth"));
const districtAdmin_1 = __importDefault(require("./routes/districtAdmin"));
const course_1 = __importDefault(require("./routes/course"));
const masterAdmin_1 = __importDefault(require("./routes/masterAdmin"));
const district_1 = __importDefault(require("./routes/district"));
const student_1 = __importDefault(require("./routes/student"));
const requestLogger_1 = require("./middleware/requestLogger");
dotenv_1.default.config();
const app = (0, express_1.default)();
// CORS configuration for development
const corsOptions = {
    origin: function (origin, callback) {
        // Allow requests with no origin (like mobile apps or curl requests)
        if (!origin)
            return callback(null, true);
        const allowedOrigins = [
            'http://localhost:3000',
            'http://localhost:5173',
            'http://localhost:4173',
            'http://localhost:8080',
            'http://127.0.0.1:3000',
            'http://127.0.0.1:5173',
            'http://127.0.0.1:4173',
            'http://127.0.0.1:8080',
            'https://facevalue-rej5-namanjaiswal7s-projects.vercel.app',
            'https://facevalue-rej5-git-main-namanjaiswal7s-projects.vercel.app',
            'https://facevalue-rej5.vercel.app'
        ];
        if (allowedOrigins.indexOf(origin) !== -1) {
            callback(null, true);
        }
        else {
            console.log('CORS blocked origin:', origin);
            callback(new Error('Not allowed by CORS'));
        }
    },
    credentials: true,
    optionsSuccessStatus: 200 // Some legacy browsers (IE11, various SmartTVs) choke on 204
};
app.use((0, cors_1.default)(corsOptions));
app.use(express_1.default.json());
app.use(requestLogger_1.requestLogger);
// Health check endpoint for Docker
app.get('/health', (req, res) => {
    res.status(200).json({
        status: 'healthy',
        timestamp: new Date().toISOString(),
        uptime: process.uptime()
    });
});
// Define API routes here
app.use('/api/auth', auth_1.default);
app.use('/api/district-admin', districtAdmin_1.default);
app.use('/api/courses', course_1.default);
app.use('/api/master-admin', masterAdmin_1.default);
app.use('/api/districts', district_1.default);
app.use('/api/student', student_1.default);
exports.default = app;
