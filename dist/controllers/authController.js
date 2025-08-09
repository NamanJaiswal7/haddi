"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.completeRegistration = exports.mobileStudentSignIn = exports.studentGoogleSignUpComplete = exports.studentGoogleSignUp = exports.studentGoogleSignIn = exports.studentSignIn = exports.getStudentDashboard = exports.studentRegister = exports.studentVerifyOtp = exports.studentSignUp = exports.logout = exports.loginAdmin = void 0;
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
        logger_1.default.error('Login failed:', { error: error instanceof Error ? error.message : String(error), stack: error instanceof Error ? error.stack : undefined });
        res.status(500).json({ message: 'Login failed', error: error instanceof Error ? error.message : String(error) });
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
    try {
        const existingUser = await client_1.prisma.user.findUnique({ where: { email } });
        if (existingUser) {
            return res.status(409).json({ message: 'A user with this email already exists.' });
        }
        const otp = crypto_1.default.randomInt(100000, 999999).toString();
        (0, otpStore_1.setOtp)(email, otp);
        try {
            await (0, sendEmail_1.sendEmail)(email, 'Your OTP for Student Signup', `Your OTP is: ${otp}`);
            res.status(200).json({ message: 'OTP sent to email successfully.' });
        }
        catch (emailError) {
            // Email failed - log error and return appropriate response
            logger_1.default.error('Failed to send OTP email: %o', emailError);
            if (emailError.message && emailError.message.includes('Email service not configured')) {
                res.status(500).json({ message: 'Email service not configured.', error: 'Missing email credentials' });
            }
            else {
                res.status(500).json({ message: 'Failed to send OTP email.', error: 'Email service error' });
            }
        }
    }
    catch (error) {
        logger_1.default.error('Error in studentSignUp: %o', error);
        res.status(500).json({ message: 'Internal server error during signup.' });
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
        // Get district information
        const district = districtId ? await client_1.prisma.district.findUnique({ where: { id: districtId } }) : null;
        // For new users, all levels start as locked
        const courses = await client_1.prisma.course.findMany({
            orderBy: { level: 'asc' },
            include: { videos: true, notes: true, quizzes: true }
        });
        const learningPath = courses.map(course => ({
            id: course.id,
            title: course.title,
            level: course.level,
            description: course.description,
            videosCount: course.videos.length,
            notesCount: course.notes.length,
            questionsCount: course.quizzes.reduce((sum, q) => sum + q.numQuestions, 0),
            status: 'locked', // New users start with all levels locked
        }));
        // New users have no progress, notifications, or exam attempts initially
        const profile = {
            name: newUser.name,
            district: district?.name || null,
            role: newUser.role,
            currentLevel: 1,
            spiritualProgress: 0,
            levelsCompleted: 0,
            knowledgePoints: 0,
        };
        // Generate JWT token for automatic login
        const token = jsonwebtoken_1.default.sign({ id: newUser.id, role: newUser.role }, process.env.JWT_SECRET, { expiresIn: '7d' });
        res.status(201).json({
            message: 'Student account created successfully.',
            userId: newUser.id,
            token,
            profile,
            learningPath,
            messages: [], // New users have no messages initially
        });
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
const studentGoogleSignIn = async (req, res) => {
    const { email, name, googleId, picture } = req.body;
    try {
        // Validate required fields
        if (!email || !googleId) {
            return res.status(400).json({ message: 'Email and googleId are required' });
        }
        // Find user by email or googleId
        const user = await client_1.prisma.user.findFirst({
            where: {
                OR: [
                    { email },
                    { googleId }
                ]
            }
        });
        if (!user) {
            return res.status(401).json({ message: 'User not found. Please sign up first.' });
        }
        // Verify this is a student
        if (user.role !== 'student') {
            return res.status(403).json({ message: 'Access denied. Only students can use Google sign-in.' });
        }
        // Update user's Google information if it has changed
        if (user.googleId !== googleId || user.picture !== picture || user.name !== name) {
            await client_1.prisma.user.update({
                where: { id: user.id },
                data: {
                    googleId,
                    picture,
                    name: name || user.name,
                    lastActiveAt: new Date()
                }
            });
        }
        else {
            // Just update lastActiveAt
            await client_1.prisma.user.update({
                where: { id: user.id },
                data: { lastActiveAt: new Date() }
            });
        }
        // Fetch the updated user from database to ensure we have the latest data
        const updatedUser = await client_1.prisma.user.findUnique({
            where: { id: user.id }
        });
        if (!updatedUser) {
            return res.status(500).json({ message: 'Failed to fetch updated user data' });
        }
        // Generate JWT token
        const token = jsonwebtoken_1.default.sign({ id: updatedUser.id, role: updatedUser.role }, process.env.JWT_SECRET, { expiresIn: '7d' });
        logger_1.default.info('Google sign-in successful', { email, userId: updatedUser.id });
        res.json({
            token,
            user: {
                id: updatedUser.id,
                email: updatedUser.email,
                name: updatedUser.name,
                role: updatedUser.role,
                googleId: updatedUser.googleId,
                picture: updatedUser.picture,
                dob: updatedUser.dob,
                gender: updatedUser.gender,
                education: updatedUser.institution,
                classLevel: updatedUser.classLevel,
                districtId: updatedUser.districtId,
                pincode: updatedUser.pincode
            }
        });
    }
    catch (error) {
        logger_1.default.error('Google sign-in failed:', { error: error instanceof Error ? error.message : String(error), stack: error instanceof Error ? error.stack : undefined });
        res.status(500).json({ message: 'Google sign-in failed', error: error instanceof Error ? error.message : String(error) });
    }
};
exports.studentGoogleSignIn = studentGoogleSignIn;
const studentGoogleSignUp = async (req, res) => {
    const { email, name, googleId, picture } = req.body;
    try {
        // Validate required fields
        if (!email || !name || !googleId) {
            return res.status(400).json({ message: 'Email, name, and googleId are required' });
        }
        // Check if user already exists
        const existingUser = await client_1.prisma.user.findFirst({
            where: {
                OR: [
                    { email },
                    { googleId }
                ]
            }
        });
        if (existingUser) {
            return res.status(409).json({ message: 'A user with this email or Google ID already exists' });
        }
        // Create new student user
        const newUser = await client_1.prisma.user.create({
            data: {
                email,
                name,
                googleId,
                picture,
                passwordHash: '', // Empty password hash for Google users
                mobile: `temp_${Date.now()}@student.com`, // Placeholder mobile number
                role: 'student',
                lastActiveAt: new Date()
            }
        });
        // After creating the user, robustly unlock all level 1 courses for the user
        const level1Courses = await client_1.prisma.course.findMany({
            where: {
                classLevel: newUser.classLevel || undefined,
                OR: [
                    { level: "1" },
                    { level: { equals: "Level 1" } },
                    { level: { contains: "1" } },
                    { level: { startsWith: "Level 1" } }
                ]
            }
        });
        for (const course of level1Courses) {
            await client_1.prisma.studentProgress.upsert({
                where: {
                    studentId_courseId: {
                        studentId: newUser.id,
                        courseId: course.id
                    }
                },
                update: {},
                create: {
                    studentId: newUser.id,
                    courseId: course.id,
                    status: "in_progress"
                }
            });
        }
        // Generate JWT token
        const token = jsonwebtoken_1.default.sign({ id: newUser.id, role: newUser.role }, process.env.JWT_SECRET, { expiresIn: '7d' });
        logger_1.default.info('Google sign-up successful', { email, userId: newUser.id });
        res.status(201).json({
            token,
            user: {
                id: newUser.id,
                email: newUser.email,
                name: newUser.name,
                role: newUser.role,
                googleId: newUser.googleId,
                picture: newUser.picture,
                districtId: newUser.districtId
            }
        });
    }
    catch (error) {
        logger_1.default.error('Google sign-up failed: %o', error);
        res.status(500).json({ message: 'Google sign-up failed', error });
    }
};
exports.studentGoogleSignUp = studentGoogleSignUp;
const studentGoogleSignUpComplete = async (req, res) => {
    const { email, name, googleId, picture, dob, gender, education, classLevel, districtId, pincode } = req.body;
    try {
        // Validate required fields
        if (!email || !name || !googleId) {
            return res.status(400).json({ message: 'Email, name, and googleId are required' });
        }
        // Check if user already exists
        const existingUser = await client_1.prisma.user.findFirst({
            where: {
                OR: [
                    { email },
                    { googleId }
                ]
            }
        });
        if (existingUser) {
            return res.status(409).json({ message: 'A user with this email or Google ID already exists' });
        }
        // Validate district if provided
        if (districtId) {
            const district = await client_1.prisma.district.findUnique({
                where: { id: districtId }
            });
            if (!district) {
                return res.status(400).json({ message: 'Invalid district ID' });
            }
        }
        // Validate gender enum
        if (gender && !['male', 'female', 'other'].includes(gender)) {
            return res.status(400).json({ message: 'Invalid gender value' });
        }
        // Validate education enum
        if (education && !['high_school', 'senior_secondary', 'college', 'working', 'other'].includes(education)) {
            return res.status(400).json({ message: 'Invalid education value' });
        }
        // Create new student user with complete information
        const newUser = await client_1.prisma.user.create({
            data: {
                email,
                name,
                googleId,
                picture,
                passwordHash: '', // Empty password hash for Google users
                mobile: `temp_${Date.now()}@student.com`, // Placeholder mobile number
                dob: dob ? new Date(dob) : undefined,
                gender: gender, // Cast to enum type
                institution: education, // Cast to enum type
                classLevel,
                districtId,
                pincode,
                role: 'student',
                lastActiveAt: new Date()
            }
        });
        // Fetch the user from database to ensure we have the latest data
        const userFromDb = await client_1.prisma.user.findUnique({
            where: { id: newUser.id }
        });
        if (!userFromDb) {
            return res.status(500).json({ message: 'Failed to fetch created user data' });
        }
        // Generate JWT token
        const token = jsonwebtoken_1.default.sign({ id: userFromDb.id, role: userFromDb.role }, process.env.JWT_SECRET, { expiresIn: '7d' });
        logger_1.default.info('Google sign-up complete successful', { email, userId: userFromDb.id });
        res.status(201).json({
            token,
            user: {
                id: userFromDb.id,
                email: userFromDb.email,
                name: userFromDb.name,
                role: userFromDb.role,
                googleId: userFromDb.googleId,
                picture: userFromDb.picture,
                dob: userFromDb.dob,
                gender: userFromDb.gender,
                education: userFromDb.institution,
                classLevel: userFromDb.classLevel,
                districtId: userFromDb.districtId,
                pincode: userFromDb.pincode
            }
        });
        // After creating the user, robustly unlock all level 1 courses for the user
        const level1Courses = await client_1.prisma.course.findMany({
            where: {
                classLevel: userFromDb.classLevel || undefined,
                OR: [
                    { level: "1" },
                    { level: { equals: "Level 1" } },
                    { level: { contains: "1" } },
                    { level: { startsWith: "Level 1" } }
                ]
            }
        });
        for (const course of level1Courses) {
            await client_1.prisma.studentProgress.upsert({
                where: {
                    studentId_courseId: {
                        studentId: userFromDb.id,
                        courseId: course.id
                    }
                },
                update: {},
                create: {
                    studentId: userFromDb.id,
                    courseId: course.id,
                    status: "in_progress"
                }
            });
        }
    }
    catch (error) {
        logger_1.default.error('Google sign-up complete failed: %o', error);
        res.status(500).json({ message: 'Google sign-up complete failed', error });
    }
};
exports.studentGoogleSignUpComplete = studentGoogleSignUpComplete;
/**
 * Mobile app signin endpoint that returns comprehensive student data
 * Supports both email/password and Google signin
 */
const mobileStudentSignIn = async (req, res) => {
    const { email, password, googleId, name, picture } = req.body;
    try {
        let user;
        let isGoogleSignIn = false;
        // Handle Google signin
        if (googleId) {
            isGoogleSignIn = true;
            if (!email) {
                return res.status(400).json({ message: 'Email is required for Google signin' });
            }
            user = await client_1.prisma.user.findFirst({
                where: {
                    OR: [
                        { email },
                        { googleId }
                    ]
                }
            });
            if (!user) {
                return res.status(401).json({ message: 'User not found. Please sign up first.' });
            }
            if (user.role !== 'student') {
                return res.status(403).json({ message: 'Access denied. Only students can use mobile signin.' });
            }
            // Update user's Google information if it has changed
            if (user.googleId !== googleId || user.picture !== picture || user.name !== name) {
                await client_1.prisma.user.update({
                    where: { id: user.id },
                    data: {
                        googleId,
                        picture,
                        name: name || user.name,
                        lastActiveAt: new Date()
                    }
                });
            }
            else {
                await client_1.prisma.user.update({
                    where: { id: user.id },
                    data: { lastActiveAt: new Date() }
                });
            }
        }
        else {
            // Handle email/password signin
            if (!email || !password) {
                return res.status(400).json({ message: 'Email and password are required' });
            }
            user = await client_1.prisma.user.findUnique({ where: { email } });
            if (!user || user.role !== 'student') {
                return res.status(401).json({ message: 'Invalid credentials' });
            }
            const isValid = await bcrypt_1.default.compare(password, user.passwordHash);
            if (!isValid) {
                return res.status(401).json({ message: 'Invalid credentials' });
            }
            await client_1.prisma.user.update({
                where: { id: user.id },
                data: { lastActiveAt: new Date() }
            });
        }
        // Fetch updated user data
        const updatedUser = await client_1.prisma.user.findUnique({
            where: { id: user.id }
        });
        if (!updatedUser) {
            return res.status(500).json({ message: 'Failed to fetch user data' });
        }
        // Generate JWT token
        const token = jsonwebtoken_1.default.sign({ id: updatedUser.id, role: updatedUser.role }, process.env.JWT_SECRET, { expiresIn: '7d' });
        // Fetch comprehensive student data
        const district = updatedUser.districtId ? await client_1.prisma.district.findUnique({
            where: { id: updatedUser.districtId }
        }) : null;
        // Progress data
        const progress = await client_1.prisma.studentProgress.findMany({
            where: { studentId: updatedUser.id },
            include: { course: true }
        });
        const levelsCompleted = progress.filter(p => p.status === 'completed' && p.qualified).length;
        const totalLevels = await client_1.prisma.course.count();
        const currentLevelProgress = progress.find(p => p.status === 'in_progress');
        const currentLevel = currentLevelProgress?.course.level || "1";
        const spiritualProgress = totalLevels ? Math.round((levelsCompleted / totalLevels) * 100) : 0;
        // Knowledge points
        const examAttempts = await client_1.prisma.examAttempt.findMany({
            where: { studentId: updatedUser.id, score: { not: null } }
        });
        const knowledgePoints = examAttempts.reduce((sum, a) => sum + (a.score || 0), 0);
        // Learning Path
        const courseWhere = updatedUser.classLevel ? { classLevel: updatedUser.classLevel } : {};
        const courses = await client_1.prisma.course.findMany({
            where: courseWhere,
            orderBy: { level: 'asc' },
            include: { videos: true, pdfs: true, quizzes: true }
        });
        const learningPath = courses.map(course => {
            const prog = progress.find(p => p.courseId === course.id);
            return {
                id: course.id,
                title: course.title,
                level: course.level,
                description: course.description,
                videosCount: course.videos.length,
                notesCount: course.pdfs.length,
                questionsCount: course.quizzes.reduce((sum, q) => sum + (q.numQuestions || 0), 0),
                status: prog?.status === 'completed' && prog.qualified ? 'completed' :
                    prog?.status === 'in_progress' ? 'in_progress' : 'locked',
            };
        });
        // Recent notifications
        const notifications = await client_1.prisma.notificationRecipient.findMany({
            where: { userId: updatedUser.id },
            include: { notification: true },
            orderBy: { notification: { createdAt: 'desc' } },
            take: 5
        });
        const messages = notifications.map(n => ({
            id: n.notification.id,
            title: n.notification.title,
            content: n.notification.content,
            type: n.notification.type,
            createdAt: n.notification.createdAt,
            isRead: n.isRead,
        }));
        // Recent Activity (simplified for now)
        const recentActivities = [
            {
                id: 'activity_1',
                type: 'lesson_completed',
                title: 'Completed Lesson 3',
                subtitle: 'Bhagavad Gita Chapter 1',
                icon: 'play',
                color: 'green',
                timestamp: new Date(Date.now() - 2 * 60 * 60 * 1000) // 2 hours ago
            },
            {
                id: 'activity_2',
                type: 'quiz_scored',
                title: 'Scored 85% in Quiz',
                subtitle: 'Level 1 Assessment',
                icon: 'quiz',
                color: 'orange',
                timestamp: new Date(Date.now() - 24 * 60 * 60 * 1000) // 1 day ago
            },
            {
                id: 'activity_3',
                type: 'certificate_earned',
                title: 'Earned Certificate',
                subtitle: 'Level 1 Completion',
                icon: 'trophy',
                color: 'orange',
                timestamp: new Date(Date.now() - 3 * 24 * 60 * 60 * 1000) // 3 days ago
            }
        ];
        // Quick Actions
        const quickActions = [
            {
                id: 'take_quiz',
                title: 'Take Quiz',
                subtitle: 'Test your knowledge',
                icon: 'quiz',
                color: 'orange',
                action: 'navigate_to_quiz'
            },
            {
                id: 'download',
                title: 'Download',
                subtitle: 'Study materials',
                icon: 'download',
                color: 'orange',
                action: 'download_materials'
            },
            {
                id: 'certificates',
                title: 'Certificates',
                subtitle: 'View achievements',
                icon: 'trophy',
                color: 'green',
                action: 'view_certificates'
            },
            {
                id: 'support',
                title: 'Support',
                subtitle: 'Get help',
                icon: 'help',
                color: 'orange',
                action: 'contact_support'
            }
        ];
        // Upcoming events
        const now = new Date();
        const futureDate = new Date();
        futureDate.setDate(now.getDate() + 45);
        const events = await client_1.prisma.event.findMany({
            where: {
                OR: [
                    { districtId: updatedUser.districtId },
                    { districtId: null }
                ],
                date: {
                    gte: now,
                    lte: futureDate
                }
            },
            include: {
                participants: true,
                district: true
            },
            orderBy: { date: 'asc' },
            take: 10
        });
        const upcomingEvents = events.map(event => ({
            id: event.id,
            title: event.title,
            type: event.type,
            date: event.date.toISOString(),
            participants: event.participants?.length || 0,
            description: event.description,
            location: event.location,
            ctaName: event.ctaName,
            ctaLink: event.ctaLink,
            district: event.district?.name || 'Global',
            isUpcoming: event.date > now
        }));
        // Current level content
        const currentCourse = courses.find(c => c.level === currentLevel);
        let currentLevelContent = null;
        if (currentCourse) {
            currentLevelContent = {
                id: currentCourse.id,
                title: currentCourse.title,
                level: currentCourse.level,
                description: currentCourse.description,
                videos: currentCourse.videos.map(v => ({
                    id: v.id,
                    title: v.title,
                    youtubeId: v.youtubeId,
                    thumbnail: v.thumbnail,
                    iframeSnippet: v.iframeSnippet
                })),
                notes: currentCourse.pdfs.map(p => ({
                    id: p.id,
                    title: p.title,
                    url: p.url
                })),
                quizzes: currentCourse.quizzes.map(q => ({
                    id: q.id,
                    title: `Quiz - ${currentCourse.title}`,
                    numQuestions: q.numQuestions,
                    passPercentage: q.passPercentage
                }))
            };
        }
        logger_1.default.info('Mobile signin successful', {
            email,
            userId: updatedUser.id,
            method: isGoogleSignIn ? 'google' : 'email'
        });
        res.json({
            success: true,
            token,
            user: {
                id: updatedUser.id,
                email: updatedUser.email,
                name: updatedUser.name,
                role: updatedUser.role,
                googleId: updatedUser.googleId,
                picture: updatedUser.picture,
                dob: updatedUser.dob,
                gender: updatedUser.gender,
                education: updatedUser.institution,
                classLevel: updatedUser.classLevel,
                districtId: updatedUser.districtId,
                district: district?.name || null,
                pincode: updatedUser.pincode,
                lastActiveAt: updatedUser.lastActiveAt
            },
            dashboard: {
                currentLevel,
                spiritualProgress,
                levelsCompleted,
                totalLevels,
                knowledgePoints,
                learningPath,
                messages,
                upcomingEvents,
                currentLevelContent,
                recentActivities,
                quickActions
            }
        });
    }
    catch (error) {
        logger_1.default.error('Mobile signin failed:', {
            error: error instanceof Error ? error.message : String(error),
            stack: error instanceof Error ? error.stack : undefined
        });
        res.status(500).json({
            success: false,
            message: 'Mobile signin failed',
            error: error instanceof Error ? error.message : String(error)
        });
    }
};
exports.mobileStudentSignIn = mobileStudentSignIn;
const completeRegistration = async (req, res) => {
    const { email, googleId, name, picture, dateOfBirth, gender, educationLevel, classLevel, district, mobileNumber, pincode } = req.body;
    try {
        // Validate required fields
        if (!email || !googleId || !name) {
            return res.status(400).json({ message: 'Email, googleId, and name are required' });
        }
        // Check if user already exists
        const existingUser = await client_1.prisma.user.findFirst({
            where: {
                OR: [
                    { email },
                    { googleId }
                ]
            }
        });
        if (existingUser) {
            return res.status(409).json({ message: 'A user with this email or Google ID already exists' });
        }
        // Find district by name
        let districtId = null;
        if (district) {
            const districtRecord = await client_1.prisma.district.findFirst({
                where: { name: { equals: district, mode: 'insensitive' } }
            });
            if (!districtRecord) {
                return res.status(400).json({ message: 'Invalid district name' });
            }
            districtId = districtRecord.id;
        }
        // Validate gender enum
        const validGenders = ['male', 'female', 'other'];
        const normalizedGender = gender?.toLowerCase();
        if (normalizedGender && !validGenders.includes(normalizedGender)) {
            return res.status(400).json({ message: 'Invalid gender value. Must be one of: male, female, other' });
        }
        // Map education level to enum
        const educationMap = {
            'high school': 'high_school',
            'senior secondary': 'senior_secondary',
            'college': 'college',
            'working': 'working',
            'other': 'other'
        };
        const normalizedEducation = educationLevel?.toLowerCase();
        const education = educationMap[normalizedEducation || ''] || 'high_school';
        // Create new student user with complete information
        const newUser = await client_1.prisma.user.create({
            data: {
                email,
                name,
                googleId,
                picture,
                passwordHash: '', // Empty password hash for Google users
                mobile: mobileNumber || null,
                dob: dateOfBirth ? new Date(dateOfBirth) : undefined,
                gender: normalizedGender,
                institution: education,
                classLevel,
                districtId,
                pincode,
                role: 'student',
                lastActiveAt: new Date()
            }
        });
        // Fetch the user from database to ensure we have the latest data
        const userFromDb = await client_1.prisma.user.findUnique({
            where: { id: newUser.id },
            include: { district: true }
        });
        if (!userFromDb) {
            return res.status(500).json({ message: 'Failed to fetch created user data' });
        }
        // Generate JWT token
        const token = jsonwebtoken_1.default.sign({ id: userFromDb.id, role: userFromDb.role }, process.env.JWT_SECRET, { expiresIn: '7d' });
        // Fetch comprehensive student data for dashboard
        const progress = await client_1.prisma.studentProgress.findMany({
            where: { studentId: userFromDb.id },
            include: { course: true }
        });
        const levelsCompleted = progress.filter(p => p.status === 'completed' && p.qualified).length;
        const totalLevels = await client_1.prisma.course.count();
        const currentLevelProgress = progress.find(p => p.status === 'in_progress');
        const currentLevel = currentLevelProgress?.course.level || "1";
        const spiritualProgress = totalLevels ? Math.round((levelsCompleted / totalLevels) * 100) : 0;
        // Knowledge points
        const examAttempts = await client_1.prisma.examAttempt.findMany({
            where: { studentId: userFromDb.id, score: { not: null } }
        });
        const knowledgePoints = examAttempts.reduce((sum, a) => sum + (a.score || 0), 0);
        // Learning Path
        const courseWhere = userFromDb.classLevel ? { classLevel: userFromDb.classLevel } : {};
        const courses = await client_1.prisma.course.findMany({
            where: courseWhere,
            orderBy: { level: 'asc' },
            include: { videos: true, pdfs: true, quizzes: true }
        });
        const learningPath = courses.map(course => {
            const prog = progress.find(p => p.courseId === course.id);
            return {
                id: course.id,
                title: course.title,
                level: course.level,
                description: course.description,
                videosCount: course.videos.length,
                notesCount: course.pdfs.length,
                questionsCount: course.quizzes.reduce((sum, q) => sum + (q.numQuestions || 0), 0),
                status: prog?.status === 'completed' && prog.qualified ? 'completed' :
                    prog?.status === 'in_progress' ? 'in_progress' : 'locked',
            };
        });
        // Recent notifications
        const notifications = await client_1.prisma.notificationRecipient.findMany({
            where: { userId: userFromDb.id },
            include: { notification: true },
            orderBy: { notification: { createdAt: 'desc' } },
            take: 5
        });
        const messages = notifications.map(n => ({
            id: n.notification.id,
            title: n.notification.title,
            content: n.notification.content,
            type: n.notification.type,
            createdAt: n.notification.createdAt,
            isRead: n.isRead,
        }));
        // Recent Activity (simplified for new users)
        const recentActivities = [
            {
                id: 'welcome_activity',
                type: 'welcome',
                title: 'Welcome to Haddi!',
                subtitle: 'Start your spiritual journey',
                icon: 'star',
                color: 'orange',
                timestamp: new Date()
            }
        ];
        // Quick Actions
        const quickActions = [
            {
                id: 'take_quiz',
                title: 'Take Quiz',
                subtitle: 'Test your knowledge',
                icon: 'quiz',
                color: 'orange',
                action: 'navigate_to_quiz'
            },
            {
                id: 'download',
                title: 'Download',
                subtitle: 'Study materials',
                icon: 'download',
                color: 'orange',
                action: 'download_materials'
            },
            {
                id: 'certificates',
                title: 'Certificates',
                subtitle: 'View achievements',
                icon: 'trophy',
                color: 'green',
                action: 'view_certificates'
            },
            {
                id: 'support',
                title: 'Support',
                subtitle: 'Get help',
                icon: 'help',
                color: 'orange',
                action: 'contact_support'
            }
        ];
        // Upcoming events
        const now = new Date();
        const futureDate = new Date();
        futureDate.setDate(now.getDate() + 45);
        const events = await client_1.prisma.event.findMany({
            where: {
                OR: [
                    { districtId: userFromDb.districtId },
                    { districtId: null }
                ],
                date: {
                    gte: now,
                    lte: futureDate
                }
            },
            include: {
                participants: true,
                district: true
            },
            orderBy: { date: 'asc' },
            take: 10
        });
        const upcomingEvents = events.map(event => ({
            id: event.id,
            title: event.title,
            type: event.type,
            date: event.date.toISOString(),
            participants: event.participants?.length || 0,
            description: event.description,
            location: event.location,
            ctaName: event.ctaName,
            ctaLink: event.ctaLink,
            district: event.district?.name || 'Global',
            isUpcoming: event.date > now
        }));
        logger_1.default.info('Mobile registration complete successful', { email, userId: userFromDb.id });
        res.status(201).json({
            success: true,
            token,
            user: {
                id: userFromDb.id,
                email: userFromDb.email,
                name: userFromDb.name,
                role: userFromDb.role,
                googleId: userFromDb.googleId,
                picture: userFromDb.picture,
                dob: userFromDb.dob,
                gender: userFromDb.gender,
                education: userFromDb.institution,
                classLevel: userFromDb.classLevel,
                districtId: userFromDb.districtId,
                district: userFromDb.district?.name || null,
                pincode: userFromDb.pincode,
                lastActiveAt: userFromDb.lastActiveAt
            },
            dashboard: {
                currentLevel,
                spiritualProgress,
                levelsCompleted,
                totalLevels,
                knowledgePoints,
                learningPath,
                messages,
                upcomingEvents,
                recentActivities,
                quickActions
            }
        });
    }
    catch (error) {
        logger_1.default.error('Mobile registration complete failed:', {
            error: error instanceof Error ? error.message : String(error),
            stack: error instanceof Error ? error.stack : undefined
        });
        res.status(500).json({
            success: false,
            message: 'Mobile registration complete failed',
            error: error instanceof Error ? error.message : String(error)
        });
    }
};
exports.completeRegistration = completeRegistration;
