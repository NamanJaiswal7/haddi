"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.studentSignIn = exports.getStudentDashboard = exports.studentRegister = exports.studentVerifyOtp = exports.studentSignUp = exports.logout = exports.loginAdmin = void 0;
const client_1 = require("../prisma/client");
const bcrypt_1 = __importDefault(require("bcrypt"));
const jsonwebtoken_1 = __importDefault(require("jsonwebtoken"));
const sendEmail_1 = require("../utils/sendEmail");
const otpStore_1 = require("../utils/otpStore");
const crypto_1 = __importDefault(require("crypto"));
const logger_1 = __importDefault(require("../utils/logger"));
const loginAdmin = async (req, res) => {
    const { email, password, role, districtId } = req.body;
    try {
        const user = await client_1.prisma.user.findUnique({
            where: { email },
            include: { district: true }
        });
        if (!user) {
            res.status(401).json({ message: 'Invalid credentials' });
            return;
        }
        // Check if user role matches the requested role
        if (user.role !== role) {
            res.status(401).json({ message: 'Invalid role for this user' });
            return;
        }
        // Validate role-specific requirements
        if (role === 'district_admin') {
            if (!user.districtId) {
                res.status(401).json({ message: 'District admin must be associated with a district' });
                return;
            }
            if (!user.district) {
                res.status(401).json({ message: 'District not found for this admin' });
                return;
            }
            // Strict district validation - check if requested districtId matches assigned district
            if (!districtId || user.districtId !== districtId) {
                res.status(401).json({ message: 'District admin can only access their assigned district' });
                return;
            }
            logger_1.default.info('District admin login attempt', { email, districtId: user.districtId, districtName: user.district.name });
        }
        else if (role === 'master_admin') {
            // Master admin can access everything
            logger_1.default.info('Master admin login attempt', { email });
        }
        else {
            res.status(401).json({ message: 'Invalid role specified' });
            return;
        }
        const isValid = await bcrypt_1.default.compare(password, user.passwordHash);
        if (!isValid) {
            logger_1.default.warn('Invalid password attempt', { email, role });
            res.status(401).json({ message: 'Invalid credentials' });
            return;
        }
        // Update lastActiveAt to track login time
        await client_1.prisma.user.update({
            where: { id: user.id },
            data: { lastActiveAt: new Date() }
        });
        const token = jsonwebtoken_1.default.sign({
            id: user.id,
            role: user.role,
            districtId: user.districtId // Include districtId in token for strict validation
        }, process.env.JWT_SECRET, {
            expiresIn: '7d',
        });
        logger_1.default.info('Admin login successful', { email, role, userId: user.id, districtId: user.districtId });
        res.json({
            token,
            user: {
                id: user.id,
                email: user.email,
                role: user.role,
                name: user.name,
                districtId: user.districtId,
                district: user.district ? { id: user.district.id, name: user.district.name } : null
            }
        });
    }
    catch (error) {
        logger_1.default.error('Login failed: %o', error);
        res.status(500).json({ message: 'Login failed', error });
    }
};
exports.loginAdmin = loginAdmin;
/**
 * Handles user logout.
 * In a stateless JWT setup, the primary responsibility for logout is on the client-side
 * (i.e., deleting the token). This endpoint is provided for semantic purposes and
 * to allow for future blacklist implementation if needed.
 */
const logout = (req, res) => {
    res.status(200).json({ message: "Logout successful. Please clear the token on the client." });
};
exports.logout = logout;
const studentSignUp = async (req, res) => {
    const { email } = req.body;
    if (!email) {
        return res.status(400).json({ message: 'Email is required.' });
    }
    const existingUser = await client_1.prisma.user.findUnique({ where: { email } });
    if (existingUser) {
        return res.status(409).json({ message: 'A user with this email already exists.' });
    }
    const otp = crypto_1.default.randomInt(100000, 999999).toString();
    (0, otpStore_1.setOtp)(email, otp);
    try {
        await (0, sendEmail_1.sendEmail)(email, 'Your OTP for Student Signup', `Your OTP is: ${otp}`);
        res.status(200).json({ message: 'OTP sent to email.' });
    }
    catch (err) {
        res.status(500).json({ message: 'Failed to send OTP email.', error: err });
    }
};
exports.studentSignUp = studentSignUp;
const studentVerifyOtp = async (req, res) => {
    const { email, otp } = req.body;
    if (!email || !otp) {
        logger_1.default.warn('OTP verification failed: missing email or otp', { email });
        return res.status(400).json({ message: 'Email and OTP are required.' });
    }
    if (!(await (0, otpStore_1.verifyOtp)(email, otp))) {
        logger_1.default.info('OTP verification failed for email: %s', email);
        return res.status(400).json({ message: 'Invalid or expired OTP.' });
    }
    logger_1.default.info('OTP verified for email: %s', email);
    res.status(200).json({ message: 'OTP verified. You can now register.' });
};
exports.studentVerifyOtp = studentVerifyOtp;
const studentRegister = async (req, res) => {
    const { email, name, password, dob, gender, institution, classLevel, districtId, pincode } = req.body;
    if (!email || !password || !name) {
        return res.status(400).json({ message: 'Required fields missing.' });
    }
    const existingUser = await client_1.prisma.user.findUnique({ where: { email } });
    if (existingUser) {
        return res.status(409).json({ message: 'A user with this email already exists.' });
    }
    const passwordHash = await bcrypt_1.default.hash(password, 10);
    try {
        const newUser = await client_1.prisma.user.create({
            data: {
                name,
                email,
                passwordHash,
                mobile: `temp_${Date.now()}@student.com`, // Placeholder mobile number
                dob: dob ? new Date(dob) : undefined,
                gender,
                institution,
                classLevel,
                districtId,
                pincode,
                role: 'student',
            },
        });
        res.status(201).json({ message: 'Student account created successfully.', userId: newUser.id });
    }
    catch (err) {
        res.status(500).json({ message: 'Failed to create student account.', error: err });
    }
};
exports.studentRegister = studentRegister;
const getStudentDashboard = async (req, res) => {
    const user = req.user;
    if (!user || user.role !== 'student') {
        return res.status(403).json({ message: 'Forbidden: Not a student.' });
    }
    try {
        // Profile & district
        const district = user.districtId ? await client_1.prisma.district.findUnique({ where: { id: user.districtId } }) : null;
        // Progress
        const progress = await client_1.prisma.studentProgress.findMany({
            where: { studentId: user.id },
            include: { course: true }
        });
        const levelsCompleted = progress.filter(p => p.status === 'completed' && p.qualified).length;
        const totalLevels = await client_1.prisma.course.count();
        const currentLevelProgress = progress.find(p => p.status === 'in_progress');
        const currentLevel = currentLevelProgress?.course.level || 1;
        const spiritualProgress = Math.round((levelsCompleted / totalLevels) * 100);
        // Knowledge points (sum of scores from exam attempts)
        const examAttempts = await client_1.prisma.examAttempt.findMany({ where: { studentId: user.id, score: { not: null } } });
        const knowledgePoints = examAttempts.reduce((sum, a) => sum + (a.score || 0), 0);
        // Learning Path (all courses/levels)
        const courses = await client_1.prisma.course.findMany({ orderBy: { level: 'asc' }, include: { videos: true, notes: true, quizzes: true } });
        const learningPath = courses.map(course => {
            const prog = progress.find(p => p.courseId === course.id);
            return {
                id: course.id,
                title: course.title,
                level: course.level,
                description: course.description,
                videosCount: course.videos.length,
                notesCount: course.notes.length,
                questionsCount: course.quizzes.reduce((sum, q) => sum + q.numQuestions, 0),
                status: prog?.status === 'completed' && prog.qualified ? 'completed' : prog?.status === 'in_progress' ? 'in_progress' : 'locked',
            };
        });
        // Messages (last 3 notifications)
        const notifications = await client_1.prisma.notificationRecipient.findMany({
            where: { userId: user.id },
            include: { notification: true },
            orderBy: { notification: { createdAt: 'desc' } },
            take: 3
        });
        const messages = notifications.map(n => ({
            title: n.notification.title,
            content: n.notification.content,
            createdAt: n.notification.createdAt,
        }));
        res.json({
            profile: {
                name: user.name,
                district: district?.name || null,
                role: user.role,
                currentLevel,
                spiritualProgress,
                levelsCompleted,
                knowledgePoints,
            },
            learningPath,
            messages,
        });
    }
    catch (error) {
        res.status(500).json({ message: 'Failed to fetch dashboard data', error });
    }
};
exports.getStudentDashboard = getStudentDashboard;
const studentSignIn = async (req, res) => {
    const { email, password } = req.body;
    try {
        const user = await client_1.prisma.user.findUnique({ where: { email } });
        if (!user || user.role !== 'student') {
            return res.status(401).json({ message: 'Unauthorized' });
        }
        const isValid = await bcrypt_1.default.compare(password, user.passwordHash);
        if (!isValid) {
            return res.status(401).json({ message: 'Invalid credentials' });
        }
        // Update lastActiveAt to track login time
        await client_1.prisma.user.update({
            where: { id: user.id },
            data: { lastActiveAt: new Date() }
        });
        const token = jsonwebtoken_1.default.sign({ id: user.id, role: user.role }, process.env.JWT_SECRET, { expiresIn: '7d' });
        res.json({
            token,
            user: {
                id: user.id,
                email: user.email,
                role: user.role,
                name: user.name,
                districtId: user.districtId,
            }
        });
    }
    catch (error) {
        res.status(500).json({ message: 'Login failed', error });
    }
};
exports.studentSignIn = studentSignIn;
