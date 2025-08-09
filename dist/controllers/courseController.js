"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.markLevelAsCompleted = exports.markLessonAsCompleted = exports.submitQuiz = exports.markPDFAsRead = exports.markVideoAsWatched = exports.getLevelData = exports.getCourseData = void 0;
const client_1 = require("../prisma/client");
const logger_1 = __importDefault(require("../utils/logger"));
/**
 * Get Course Data - Fetches all course data for the authenticated student
 */
const getCourseData = async (req, res) => {
    try {
        const userId = req.user.id;
        // Get user data
        const user = await client_1.prisma.user.findUnique({
            where: { id: userId },
            include: { district: true }
        });
        if (!user) {
            return res.status(404).json({ success: false, message: 'User not found' });
        }
        // Get all courses with their content
        const courses = await client_1.prisma.course.findMany({
            orderBy: { level: 'asc' },
            include: {
                videos: true,
                pdfs: true,
                quizzes: true,
                studentProgress: {
                    where: { studentId: userId }
                }
            }
        });
        // Get student progress for all courses
        const studentProgress = await client_1.prisma.studentProgress.findMany({
            where: { studentId: userId },
            include: { course: true }
        });
        // Get video progress
        const videoProgressData = await client_1.prisma.videoProgress.findMany({
            where: { studentId: userId }
        });
        // Get PDF progress
        const pdfProgressData = await client_1.prisma.pdfProgress.findMany({
            where: { studentId: userId }
        });
        // Get quiz attempts
        const quizAttempts = await client_1.prisma.examAttempt.findMany({
            where: { studentId: userId },
            include: { quiz: true }
        });
        // Build levels data
        const levels = courses.map(course => {
            const progress = studentProgress.find(p => p.courseId === course.id);
            // Calculate completion stats
            const courseVideos = course.videos;
            const coursePDFs = course.pdfs;
            const courseQuizzes = course.quizzes;
            const completedVideos = videoProgressData.filter(vp => courseVideos.some(v => v.id === vp.videoId)).length;
            const completedPDFs = pdfProgressData.filter(pp => coursePDFs.some(p => p.id === pp.pdfId)).length;
            const completedQuizzes = quizAttempts.filter(qa => courseQuizzes.some(q => q.id === qa.quizId) && qa.score !== null).length;
            const isCompleted = progress?.status === 'completed' && progress.qualified;
            const isCurrent = progress?.status === 'in_progress';
            const isLocked = !isCompleted && !isCurrent && course.level !== "1";
            return {
                id: course.id,
                title: course.title,
                description: course.description,
                level: course.level,
                isCompleted,
                isCurrent,
                isLocked,
                totalLessons: 1, // Each course is considered one lesson for now
                completedLessons: isCompleted ? 1 : 0,
                totalVideos: courseVideos.length,
                completedVideos,
                totalPDFs: coursePDFs.length,
                completedPDFs,
                totalQuizzes: courseQuizzes.length,
                completedQuizzes,
                certificateUrl: isCompleted ? `https://example.com/certificates/level_${course.level}_cert.pdf` : "",
                completedAt: isCompleted ? new Date() : null
            };
        });
        // Build lessons data (using courses as lessons for now)
        const lessons = courses.map(course => {
            const progress = studentProgress.find(p => p.courseId === course.id);
            return {
                id: course.id,
                title: course.title,
                description: course.description,
                levelId: course.id,
                level: course.level,
                isCompleted: progress?.status === 'completed' && progress.qualified,
                order: parseInt(course.level),
                duration: "45 minutes", // Default duration
                thumbnail: "https://example.com/thumbnails/lesson_1.jpg", // Default thumbnail
                createdAt: course.createdAt
            };
        });
        // Build videos data
        const videos = courses.flatMap(course => course.videos.map(video => {
            const videoProgress = videoProgressData.find(vp => vp.videoId === video.id);
            return {
                id: video.id,
                title: video.title,
                description: video.title, // Using title as description for now
                url: video.youtubeId ? `https://www.youtube.com/watch?v=${video.youtubeId}` : "",
                thumbnail: video.thumbnail || "https://example.com/thumbnails/video_1.jpg",
                levelId: course.id,
                lessonId: course.id,
                duration: 1800, // Default 30 minutes
                isWatched: !!videoProgress,
                watchProgress: videoProgress ? 100 : 0,
                createdAt: course.createdAt
            };
        }));
        // Build PDFs data
        const pdfs = courses.flatMap(course => course.pdfs.map(pdf => {
            const pdfProgress = pdfProgressData.find(pp => pp.pdfId === pdf.id);
            return {
                id: pdf.id,
                title: pdf.title,
                description: pdf.title, // Using title as description for now
                url: pdf.url,
                thumbnail: "https://example.com/thumbnails/pdf_1.jpg", // Default thumbnail
                levelId: course.id,
                lessonId: course.id,
                pageCount: 15, // Default page count
                isRead: !!pdfProgress,
                readProgress: pdfProgress ? 100 : 0,
                createdAt: course.createdAt
            };
        }));
        // Build quizzes data
        const quizzes = courses.flatMap(course => course.quizzes.map(quiz => {
            const quizAttempt = quizAttempts.find(qa => qa.quizId === quiz.id);
            return {
                id: quiz.id,
                title: `Quiz - ${course.title}`,
                description: `Assessment for ${course.title}`,
                levelId: course.id,
                lessonId: course.id,
                totalQuestions: quiz.numQuestions || 10,
                timeLimit: 1800, // Default 30 minutes
                passingScore: quiz.passPercentage || 70,
                isCompleted: !!quizAttempt && quizAttempt.score !== null,
                score: quizAttempt?.score || null,
                attempts: quizAttempt ? 1 : 0,
                completedAt: quizAttempt?.completedAt || null,
                createdAt: course.createdAt
            };
        }));
        // Calculate overall progress
        const totalLevels = levels.length;
        const completedLevels = levels.filter(l => l.isCompleted).length;
        const totalLessons = lessons.length;
        const completedLessons = lessons.filter(l => l.isCompleted).length;
        const totalVideos = videos.length;
        const watchedVideos = videos.filter(v => v.isWatched).length;
        const totalPDFs = pdfs.length;
        const readPDFs = pdfs.filter(p => p.isRead).length;
        const totalQuizzes = quizzes.length;
        const completedQuizzes = quizzes.filter(q => q.isCompleted).length;
        const overallProgress = totalLevels > 0 ?
            Math.round((completedLevels / totalLevels) * 100) : 0;
        const progress = {
            totalLevels,
            completedLevels,
            totalLessons,
            completedLessons,
            totalVideos,
            watchedVideos,
            totalPDFs,
            readPDFs,
            totalQuizzes,
            completedQuizzes,
            overallProgress,
            earnedCertificates: levels
                .filter(l => l.isCompleted && l.certificateUrl)
                .map(l => l.certificateUrl)
        };
        // Get current level
        const currentLevel = studentProgress.find(p => p.status === 'in_progress')?.course.level || "1";
        logger_1.default.info('Course data fetched successfully', { userId, currentLevel });
        res.json({
            success: true,
            user: {
                id: user.id,
                name: user.name,
                email: user.email,
                picture: user.picture,
                role: user.role,
                district: user.district?.name || null,
                pincode: user.pincode,
                education: user.institution,
                classLevel: user.classLevel,
                districtId: user.districtId,
                dob: user.dob,
                gender: user.gender,
                lastActiveAt: user.lastActiveAt
            },
            courseData: {
                currentLevel,
                levels,
                lessons,
                videos,
                pdfs,
                quizzes,
                progress
            }
        });
    }
    catch (error) {
        logger_1.default.error('Error fetching course data:', {
            error: error instanceof Error ? error.message : String(error),
            stack: error instanceof Error ? error.stack : undefined
        });
        res.status(500).json({
            success: false,
            message: 'Server error. Please try again later.'
        });
    }
};
exports.getCourseData = getCourseData;
/**
 * Get Level Data - Fetches detailed data for a specific level
 */
const getLevelData = async (req, res) => {
    try {
        const userId = req.user.id;
        const { levelId } = req.params;
        // Get the specific course/level
        const course = await client_1.prisma.course.findUnique({
            where: { id: levelId },
            include: {
                videos: true,
                pdfs: true,
                quizzes: true,
                studentProgress: {
                    where: { studentId: userId }
                }
            }
        });
        if (!course) {
            return res.status(404).json({ success: false, message: 'Level not found' });
        }
        // Get progress data for this level
        const progress = course.studentProgress[0];
        const videoProgressData = await client_1.prisma.videoProgress.findMany({
            where: {
                studentId: userId,
                videoId: { in: course.videos.map(v => v.id) }
            }
        });
        const pdfProgressData = await client_1.prisma.pdfProgress.findMany({
            where: {
                studentId: userId,
                pdfId: { in: course.pdfs.map(p => p.id) }
            }
        });
        const quizAttempts = await client_1.prisma.examAttempt.findMany({
            where: {
                studentId: userId,
                quizId: { in: course.quizzes.map(q => q.id) }
            }
        });
        // Build level data
        const level = {
            id: course.id,
            title: course.title,
            description: course.description,
            level: course.level,
            isCompleted: progress?.status === 'completed' && progress.qualified,
            isCurrent: progress?.status === 'in_progress',
            isLocked: !progress && course.level !== "1",
            totalLessons: 1,
            completedLessons: progress?.status === 'completed' ? 1 : 0,
            totalVideos: course.videos.length,
            completedVideos: videoProgressData.length,
            totalPDFs: course.pdfs.length,
            completedPDFs: pdfProgressData.length,
            totalQuizzes: course.quizzes.length,
            completedQuizzes: quizAttempts.filter(qa => qa.score !== null).length,
            certificateUrl: progress?.status === 'completed' ?
                `https://example.com/certificates/level_${course.level}_cert.pdf` : "",
            completedAt: progress?.status === 'completed' ? new Date() : null
        };
        // Build lessons data
        const lessons = [{
                id: course.id,
                title: course.title,
                description: course.description,
                levelId: course.id,
                level: course.level,
                isCompleted: progress?.status === 'completed' && progress.qualified,
                order: parseInt(course.level),
                duration: "45 minutes",
                thumbnail: "https://example.com/thumbnails/lesson_1.jpg",
                createdAt: course.createdAt
            }];
        // Build videos data
        const videos = course.videos.map(video => {
            const videoProgress = videoProgressData.find(vp => vp.videoId === video.id);
            return {
                id: video.id,
                title: video.title,
                description: video.title,
                url: video.youtubeId ? `https://www.youtube.com/watch?v=${video.youtubeId}` : "",
                thumbnail: video.thumbnail || "https://example.com/thumbnails/video_1.jpg",
                levelId: course.id,
                lessonId: course.id,
                duration: 1800,
                isWatched: !!videoProgress,
                watchProgress: videoProgress ? 100 : 0,
                createdAt: course.createdAt
            };
        });
        // Build PDFs data
        const pdfs = course.pdfs.map(pdf => {
            const pdfProgress = pdfProgressData.find(pp => pp.pdfId === pdf.id);
            return {
                id: pdf.id,
                title: pdf.title,
                description: pdf.title,
                url: pdf.url,
                thumbnail: "https://example.com/thumbnails/pdf_1.jpg",
                levelId: course.id,
                lessonId: course.id,
                pageCount: 15,
                isRead: !!pdfProgress,
                readProgress: pdfProgress ? 100 : 0,
                createdAt: course.createdAt
            };
        });
        // Build quizzes data
        const quizzes = course.quizzes.map(quiz => {
            const quizAttempt = quizAttempts.find(qa => qa.quizId === quiz.id);
            return {
                id: quiz.id,
                title: `Quiz - ${course.title}`,
                description: `Assessment for ${course.title}`,
                levelId: course.id,
                lessonId: course.id,
                totalQuestions: quiz.numQuestions || 10,
                timeLimit: 1800,
                passingScore: quiz.passPercentage || 70,
                isCompleted: !!quizAttempt && quizAttempt.score !== null,
                score: quizAttempt?.score || null,
                attempts: quizAttempt ? 1 : 0,
                completedAt: quizAttempt?.completedAt || null,
                createdAt: course.createdAt
            };
        });
        logger_1.default.info('Level data fetched successfully', { userId, levelId });
        res.json({
            success: true,
            courseData: {
                currentLevel: course.level,
                levels: [level],
                lessons,
                videos,
                pdfs,
                quizzes
            }
        });
    }
    catch (error) {
        logger_1.default.error('Error fetching level data:', {
            error: error instanceof Error ? error.message : String(error),
            stack: error instanceof Error ? error.stack : undefined
        });
        res.status(500).json({
            success: false,
            message: 'Server error. Please try again later.'
        });
    }
};
exports.getLevelData = getLevelData;
/**
 * Mark Video as Watched
 */
const markVideoAsWatched = async (req, res) => {
    try {
        const userId = req.user.id;
        const { videoId } = req.params;
        if (!videoId) {
            return res.status(400).json({ success: false, message: 'Video ID is required' });
        }
        // Check if video exists
        const video = await client_1.prisma.courseVideo.findUnique({
            where: { id: videoId }
        });
        if (!video) {
            return res.status(404).json({ success: false, message: 'Video not found' });
        }
        // Create or update video progress
        await client_1.prisma.videoProgress.upsert({
            where: {
                studentId_videoId: {
                    studentId: userId,
                    videoId: videoId
                }
            },
            update: {
                watched: true,
                watchedAt: new Date()
            },
            create: {
                studentId: userId,
                videoId: videoId,
                watched: true,
                watchedAt: new Date()
            }
        });
        logger_1.default.info('Video marked as watched', { userId, videoId });
        res.json({
            success: true,
            message: 'Video marked as watched successfully'
        });
    }
    catch (error) {
        logger_1.default.error('Error marking video as watched:', {
            error: error instanceof Error ? error.message : String(error),
            stack: error instanceof Error ? error.stack : undefined
        });
        res.status(500).json({
            success: false,
            message: 'Server error. Please try again later.'
        });
    }
};
exports.markVideoAsWatched = markVideoAsWatched;
/**
 * Mark PDF as Read
 */
const markPDFAsRead = async (req, res) => {
    try {
        const userId = req.user.id;
        const { pdfId } = req.params;
        if (!pdfId) {
            return res.status(400).json({ success: false, message: 'PDF ID is required' });
        }
        // Check if PDF exists
        const pdf = await client_1.prisma.coursePDF.findUnique({
            where: { id: pdfId }
        });
        if (!pdf) {
            return res.status(404).json({ success: false, message: 'PDF not found' });
        }
        // Create or update PDF progress
        await client_1.prisma.pdfProgress.upsert({
            where: {
                studentId_pdfId: {
                    studentId: userId,
                    pdfId: pdfId
                }
            },
            update: {
                read: true,
                readAt: new Date()
            },
            create: {
                studentId: userId,
                pdfId: pdfId,
                read: true,
                readAt: new Date()
            }
        });
        logger_1.default.info('PDF marked as read', { userId, pdfId });
        res.json({
            success: true,
            message: 'PDF marked as read successfully'
        });
    }
    catch (error) {
        logger_1.default.error('Error marking PDF as read:', {
            error: error instanceof Error ? error.message : String(error),
            stack: error instanceof Error ? error.stack : undefined
        });
        res.status(500).json({
            success: false,
            message: 'Server error. Please try again later.'
        });
    }
};
exports.markPDFAsRead = markPDFAsRead;
/**
 * Submit Quiz
 */
const submitQuiz = async (req, res) => {
    try {
        const userId = req.user.id;
        const { quizId } = req.params;
        const { answers } = req.body;
        if (!quizId) {
            return res.status(400).json({ success: false, message: 'Quiz ID is required' });
        }
        // Check if quiz exists
        const quiz = await client_1.prisma.quiz.findUnique({
            where: { id: quizId }
        });
        if (!quiz) {
            return res.status(404).json({ success: false, message: 'Quiz not found' });
        }
        // For now, we'll simulate quiz scoring
        // In a real implementation, you would validate answers against correct answers
        const totalQuestions = quiz.numQuestions || 10;
        const correctAnswers = Math.floor(Math.random() * totalQuestions) + Math.floor(totalQuestions * 0.6); // Simulate 60-100% score
        const score = Math.round((correctAnswers / totalQuestions) * 100);
        const passingScore = quiz.passPercentage || 70;
        const passed = score >= passingScore;
        // Create quiz attempt
        const quizAttempt = await client_1.prisma.examAttempt.create({
            data: {
                studentId: userId,
                quizId: quizId,
                startedAt: new Date(),
                completedAt: new Date(),
                passed: passed,
                score: score
            }
        });
        logger_1.default.info('Quiz submitted successfully', { userId, quizId, score, passed });
        res.json({
            success: true,
            score,
            totalQuestions,
            correctAnswers,
            passingScore,
            passed,
            message: 'Quiz completed successfully'
        });
    }
    catch (error) {
        logger_1.default.error('Error submitting quiz:', {
            error: error instanceof Error ? error.message : String(error),
            stack: error instanceof Error ? error.stack : undefined
        });
        res.status(500).json({
            success: false,
            message: 'Server error. Please try again later.'
        });
    }
};
exports.submitQuiz = submitQuiz;
/**
 * Mark Lesson as Completed
 */
const markLessonAsCompleted = async (req, res) => {
    try {
        const userId = req.user.id;
        const { lessonId } = req.params;
        if (!lessonId) {
            return res.status(400).json({ success: false, message: 'Lesson ID is required' });
        }
        // Check if lesson/course exists
        const course = await client_1.prisma.course.findUnique({
            where: { id: lessonId }
        });
        if (!course) {
            return res.status(404).json({ success: false, message: 'Lesson not found' });
        }
        // Update or create student progress
        await client_1.prisma.studentProgress.upsert({
            where: {
                studentId_courseId: {
                    studentId: userId,
                    courseId: lessonId
                }
            },
            update: {
                status: 'completed',
                qualified: true
            },
            create: {
                studentId: userId,
                courseId: lessonId,
                status: 'completed',
                qualified: true
            }
        });
        logger_1.default.info('Lesson marked as completed', { userId, lessonId });
        res.json({
            success: true,
            message: 'Lesson marked as completed successfully'
        });
    }
    catch (error) {
        logger_1.default.error('Error marking lesson as completed:', {
            error: error instanceof Error ? error.message : String(error),
            stack: error instanceof Error ? error.stack : undefined
        });
        res.status(500).json({
            success: false,
            message: 'Server error. Please try again later.'
        });
    }
};
exports.markLessonAsCompleted = markLessonAsCompleted;
/**
 * Mark Level as Completed
 */
const markLevelAsCompleted = async (req, res) => {
    try {
        const userId = req.user.id;
        const { levelId } = req.params;
        if (!levelId) {
            return res.status(400).json({ success: false, message: 'Level ID is required' });
        }
        // Check if level/course exists
        const course = await client_1.prisma.course.findUnique({
            where: { id: levelId }
        });
        if (!course) {
            return res.status(404).json({ success: false, message: 'Level not found' });
        }
        // Update student progress
        await client_1.prisma.studentProgress.upsert({
            where: {
                studentId_courseId: {
                    studentId: userId,
                    courseId: levelId
                }
            },
            update: {
                status: 'completed',
                qualified: true
            },
            create: {
                studentId: userId,
                courseId: levelId,
                status: 'completed',
                qualified: true
            }
        });
        const certificateUrl = `https://example.com/certificates/level_${course.level}_cert.pdf`;
        logger_1.default.info('Level marked as completed', { userId, levelId, certificateUrl });
        res.json({
            success: true,
            message: 'Level completed successfully',
            certificateUrl
        });
    }
    catch (error) {
        logger_1.default.error('Error marking level as completed:', {
            error: error instanceof Error ? error.message : String(error),
            stack: error instanceof Error ? error.stack : undefined
        });
        res.status(500).json({
            success: false,
            message: 'Server error. Please try again later.'
        });
    }
};
exports.markLevelAsCompleted = markLevelAsCompleted;
