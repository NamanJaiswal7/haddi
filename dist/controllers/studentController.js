"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.submitQuiz = exports.getStudentAllEvents = exports.getStudentUpcomingEvents = exports.markPdfRead = exports.markVideoWatched = exports.getStudentLevelContent = exports.getStudentNotificationCount = exports.getStudentNotifications = exports.getStudentLearningPath = exports.getStudentProfile = exports.getStudentDashboard = void 0;
const client_1 = require("../prisma/client");
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
        const currentLevel = currentLevelProgress?.course.level || "1";
        const spiritualProgress = Math.round((levelsCompleted / totalLevels) * 100);
        // Knowledge points (sum of scores from exam attempts)
        const examAttempts = await client_1.prisma.examAttempt.findMany({ where: { studentId: user.id, score: { not: null } } });
        const knowledgePoints = examAttempts.reduce((sum, a) => sum + (a.score || 0), 0);
        // Learning Path (all courses/levels)
        const courseWhere = user.classLevel ? { classLevel: user.classLevel } : {};
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
const getStudentProfile = async (req, res) => {
    const user = req.user;
    if (!user || user.role !== 'student') {
        return res.status(403).json({ message: 'Forbidden: Not a student.' });
    }
    try {
        const district = user.districtId ? await client_1.prisma.district.findUnique({ where: { id: user.districtId }, select: { name: true } }) : null;
        const progress = await client_1.prisma.studentProgress.findMany({
            where: { studentId: user.id },
            include: { course: { select: { level: true } } }
        });
        const levelsCompleted = progress.filter(p => p.status === 'completed' && p.qualified).length;
        const totalLevels = await client_1.prisma.course.count();
        const currentLevelProgress = progress.find(p => p.status === 'in_progress');
        const currentLevel = currentLevelProgress?.course.level || "1";
        const spiritualProgress = totalLevels ? Math.round((levelsCompleted / totalLevels) * 100) : 0;
        res.json({
            name: user.name,
            district: district?.name || null,
            classLevel: user.classLevel,
            currentLevel,
            levelsCompleted,
            spiritualProgress
        });
    }
    catch (error) {
        res.status(500).json({ message: 'Failed to fetch student profile', error });
    }
};
exports.getStudentProfile = getStudentProfile;
const getStudentLearningPath = async (req, res) => {
    const user = req.user;
    if (!user || user.role !== 'student') {
        return res.status(403).json({ message: 'Forbidden: Not a student.' });
    }
    try {
        const progress = await client_1.prisma.studentProgress.findMany({
            where: { studentId: user.id },
            include: { course: { select: { id: true, level: true } } }
        });
        const completedLevels = progress.filter(p => p.status === 'completed' && p.qualified).map(p => p.course.level);
        const inProgressLevel = progress.find(p => p.status === 'in_progress')?.course.level;
        const courseWhere = user.classLevel ? { classLevel: user.classLevel } : {};
        const courses = await client_1.prisma.course.findMany({
            where: courseWhere,
            orderBy: { level: 'asc' },
            include: { videos: true, pdfs: true, quizzes: true }
        });
        let maxUnlockedLevel = "1";
        if (completedLevels.length > 0) {
            // Convert to numbers for Math.max, then back to string
            const completedLevelsNum = completedLevels.map(l => Number(l)).filter(l => !isNaN(l));
            if (completedLevelsNum.length > 0) {
                maxUnlockedLevel = (Math.max(...completedLevelsNum) + 1).toString();
            }
        }
        else if (inProgressLevel) {
            maxUnlockedLevel = inProgressLevel;
        }
        const learningPath = courses.map(course => {
            const prog = progress.find(p => p.courseId === course.id);
            let status = 'locked';
            if (prog?.status === 'completed' && prog.qualified)
                status = 'completed';
            else if (prog?.status === 'in_progress')
                status = 'in_progress';
            else if (course.level === maxUnlockedLevel)
                status = 'in_progress';
            // Enable completed, in_progress, and next unlocked level
            let enabled = false;
            if (status === 'completed' || status === 'in_progress') {
                enabled = true;
            }
            else {
                const courseLevelNum = Number(course.level);
                const maxUnlockedLevelNum = Number(maxUnlockedLevel);
                if (!isNaN(courseLevelNum) && !isNaN(maxUnlockedLevelNum)) {
                    enabled = courseLevelNum === maxUnlockedLevelNum;
                }
                else {
                    enabled = course.level === maxUnlockedLevel;
                }
            }
            return {
                id: course.id,
                title: course.title,
                level: course.level,
                description: course.description,
                videosCount: course.videos.length,
                notesCount: course.pdfs.length,
                questionsCount: course.quizzes.reduce((sum, q) => sum + (q.numQuestions || 0), 0),
                status,
                enabled
            };
        });
        res.json({ learningPath });
    }
    catch (error) {
        res.status(500).json({ message: 'Failed to fetch learning path', error });
    }
};
exports.getStudentLearningPath = getStudentLearningPath;
const getStudentNotifications = async (req, res) => {
    const user = req.user;
    if (!user || user.role !== 'student') {
        return res.status(403).json({ message: 'Forbidden: Not a student.' });
    }
    try {
        const page = parseInt(req.query.page, 10) || 1;
        const pageSize = parseInt(req.query.pageSize, 10) || 20;
        const skip = (page - 1) * pageSize;
        const [notifications, totalCount] = await Promise.all([
            client_1.prisma.notificationRecipient.findMany({
                where: { userId: user.id },
                include: { notification: { select: { title: true, content: true, createdAt: true, type: true } } },
                orderBy: { notification: { createdAt: 'desc' } },
                skip,
                take: pageSize
            }),
            client_1.prisma.notificationRecipient.count({ where: { userId: user.id } })
        ]);
        const result = notifications.map(n => ({
            title: n.notification.title,
            content: n.notification.content,
            type: n.notification.type,
            createdAt: n.notification.createdAt,
        }));
        const totalPages = Math.ceil(totalCount / pageSize);
        res.json({ notifications: result, totalPages, currentPage: page });
    }
    catch (error) {
        res.status(500).json({ message: 'Failed to fetch notifications', error });
    }
};
exports.getStudentNotifications = getStudentNotifications;
/**
 * Get the count of unread notifications for the authenticated student
 * @route GET /api/student/notifications/count
 * @returns {Object} Object containing unreadCount
 */
const getStudentNotificationCount = async (req, res) => {
    const user = req.user;
    if (!user || user.role !== 'student') {
        return res.status(403).json({ message: 'Forbidden: Not a student.' });
    }
    try {
        const unreadCount = await client_1.prisma.notificationRecipient.count({
            where: {
                userId: user.id,
                isRead: false
            }
        });
        res.json({ unreadCount });
    }
    catch (error) {
        res.status(500).json({ message: 'Failed to fetch notification count', error });
    }
};
exports.getStudentNotificationCount = getStudentNotificationCount;
const getStudentLevelContent = async (req, res) => {
    const user = req.user;
    if (!user || user.role !== 'student') {
        return res.status(403).json({ message: 'Forbidden: Not a student.' });
    }
    const classLevel = req.query.classLevel || user.classLevel;
    const level = req.query.level;
    if (!classLevel || !level) {
        return res.status(400).json({ message: 'classLevel and level are required.' });
    }
    try {
        // Find all courses for this classLevel and level
        const courses = await client_1.prisma.course.findMany({
            where: { classLevel, level },
            include: {
                videos: true,
                pdfs: true,
                quizzes: { include: { questionBank: { include: { questions: true } } } },
            },
        });
        if (!courses || courses.length === 0)
            return res.status(404).json({ message: 'Course not found.' });
        // Aggregate all videos, pdfs, quizzes
        const allVideos = courses.flatMap(course => course.videos);
        const allPdfs = courses.flatMap(course => course.pdfs.filter(pdf => course.classLevel === classLevel && course.level === level));
        const allQuizzes = courses.flatMap(course => course.quizzes);
        // Sort videos and PDFs by creation date in ascending order (using id since CUIDs are time-ordered)
        const sortedVideos = allVideos.sort((a, b) => a.id.localeCompare(b.id));
        const sortedPdfs = allPdfs.sort((a, b) => a.id.localeCompare(b.id));
        // Fetch video progress for this student
        const videoProgress = sortedVideos.length > 0 ? await client_1.prisma.videoProgress.findMany({
            where: { studentId: user.id, videoId: { in: sortedVideos.map(v => v.id) } },
        }) : [];
        const videoProgressMap = Object.fromEntries(videoProgress.map(vp => [vp.videoId, vp]));
        // Fetch pdf progress for this student
        const pdfProgress = sortedPdfs.length > 0 ? await client_1.prisma.pdfProgress.findMany({
            where: { studentId: user.id, pdfId: { in: sortedPdfs.map(p => p.id) } },
        }) : [];
        const pdfProgressMap = Object.fromEntries(pdfProgress.map(pp => [pp.pdfId, pp]));
        // Fetch quiz attempts for this student
        const quizIds = allQuizzes.map(q => q.id);
        const examAttempts = quizIds.length > 0 ? await client_1.prisma.examAttempt.findMany({
            where: { studentId: user.id, quizId: { in: quizIds } },
            orderBy: { completedAt: 'desc' },
        }) : [];
        const examAttemptMap = Object.fromEntries(examAttempts.map(ea => [ea.quizId, ea]));
        // Find the student's max unlocked/in-progress level for their classLevel
        const progress = await client_1.prisma.studentProgress.findMany({
            where: { studentId: user.id },
            include: { course: { select: { level: true, classLevel: true } } }
        });
        const unlockedLevels = progress
            .filter(p => p.course.classLevel === classLevel && (p.status === 'in_progress' || (p.status === 'completed' && p.qualified)))
            .map(p => p.course.level);
        let maxUnlockedLevel = "1";
        if (unlockedLevels.length > 0) {
            const unlockedLevelsNum = unlockedLevels.map(l => Number(l.replace(/\D/g, ""))).filter(l => !isNaN(l));
            if (unlockedLevelsNum.length > 0) {
                maxUnlockedLevel = Math.max(...unlockedLevelsNum).toString();
            }
        }
        const requestedLevelNum = Number(level.replace(/\D/g, ""));
        const isPreviousLevel = requestedLevelNum < Number(maxUnlockedLevel);
        // Compose response
        const videos = sortedVideos.map(video => ({
            id: video.id,
            title: video.title,
            iframeSnippet: video.iframeSnippet,
            youtubeId: video.youtubeId,
            thumbnail: video.thumbnail,
            watched: !!videoProgressMap[video.id]?.watched,
            watchedAt: videoProgressMap[video.id]?.watchedAt || null,
        }));
        const pdfs = sortedPdfs.map(pdf => ({
            id: pdf.id,
            title: pdf.title,
            url: pdf.url,
            read: !!pdfProgressMap[pdf.id]?.read,
            readAt: pdfProgressMap[pdf.id]?.readAt || null,
        }));
        // Always show quizzes with attempt status, regardless of level
        const quizzes = allQuizzes.map(quiz => {
            const attempt = examAttemptMap[quiz.id];
            const isAttempted = !!attempt;
            // Calculate percentage if attempt exists
            let percentage = null;
            if (attempt && attempt.score !== null && quiz.numQuestions > 0) {
                percentage = Math.round((attempt.score / quiz.numQuestions) * 100);
            }
            // Calculate time spent if attempt exists
            let timeSpent = null;
            if (attempt && attempt.startedAt && attempt.completedAt) {
                timeSpent = Math.round((attempt.completedAt.getTime() - attempt.startedAt.getTime()) / 1000); // in seconds
            }
            return {
                id: quiz.id,
                numQuestions: quiz.numQuestions,
                passPercentage: quiz.passPercentage,
                attempted: isAttempted,
                isAttempted: isAttempted, // Additional clear field for attempt status
                // Attempt details (if attempted)
                score: attempt?.score ?? null,
                passed: attempt?.passed ?? null,
                percentage: percentage,
                timeSpent: timeSpent, // in seconds
                startedAt: attempt?.startedAt ?? null,
                completedAt: attempt?.completedAt ?? null,
                lastAttemptAt: attempt?.completedAt ?? null,
                // Quiz metadata
                totalQuestions: quiz.numQuestions,
                requiredPassPercentage: quiz.passPercentage,
                // Questions (always included)
                questions: quiz.questionBank?.questions?.map(q => ({
                    id: q.id,
                    question: q.question,
                    optionA: q.optionA,
                    optionB: q.optionB,
                    optionC: q.optionC,
                    optionD: q.optionD,
                })) || [],
            };
        });
        // Section completion status
        const allVideosWatched = videos.length > 0 && videos.every(v => v.watched);
        const allPdfsRead = pdfs.length > 0 && pdfs.every(p => p.read);
        const allQuizzesPassed = quizzes.length > 0 && quizzes.every(q => q.passed);
        res.json({
            courses: courses.map(c => ({ id: c.id, title: c.title, level: c.level, description: c.description })),
            videos,
            pdfs,
            quizzes,
            sectionStatus: {
                videos: allVideosWatched ? 'completed' : 'pending',
                pdfs: allPdfsRead ? 'completed' : 'pending',
                quizzes: allQuizzesPassed ? 'completed' : 'pending',
            },
        });
    }
    catch (error) {
        res.status(500).json({ message: 'Failed to fetch level content', error });
    }
};
exports.getStudentLevelContent = getStudentLevelContent;
const markVideoWatched = async (req, res) => {
    const user = req.user;
    if (!user || user.role !== 'student') {
        return res.status(403).json({ message: 'Forbidden: Not a student.' });
    }
    const { videoId } = req.body;
    if (!videoId) {
        return res.status(400).json({ message: 'videoId is required.' });
    }
    try {
        // Mark the video as watched (upsert)
        const watchedAt = new Date();
        await client_1.prisma.videoProgress.upsert({
            where: { studentId_videoId: { studentId: user.id, videoId } },
            update: { watched: true, watchedAt },
            create: { studentId: user.id, videoId, watched: true, watchedAt },
        });
        // Find the course for this video
        const video = await client_1.prisma.courseVideo.findUnique({ where: { id: videoId } });
        if (!video)
            return res.status(404).json({ message: 'Video not found.' });
        // Check if all videos in this course are watched
        const allVideos = await client_1.prisma.courseVideo.findMany({ where: { courseId: video.courseId } });
        const watchedVideos = await client_1.prisma.videoProgress.findMany({
            where: { studentId: user.id, videoId: { in: allVideos.map(v => v.id) }, watched: true },
        });
        const allWatched = allVideos.length > 0 && watchedVideos.length === allVideos.length;
        // If all videos are watched, update student progress for this course
        if (allWatched) {
            await client_1.prisma.studentProgress.upsert({
                where: { studentId_courseId: { studentId: user.id, courseId: video.courseId } },
                update: { status: 'completed', qualified: true },
                create: { studentId: user.id, courseId: video.courseId, status: 'completed', qualified: true },
            });
        }
        res.json({ message: 'Video marked as watched.', videoId, watchedAt });
    }
    catch (error) {
        res.status(500).json({ message: 'Failed to mark video as watched', error });
    }
};
exports.markVideoWatched = markVideoWatched;
const markPdfRead = async (req, res) => {
    const user = req.user;
    if (!user || user.role !== 'student') {
        return res.status(403).json({ message: 'Forbidden: Not a student.' });
    }
    const { pdfId } = req.body;
    if (!pdfId) {
        return res.status(400).json({ message: 'pdfId is required.' });
    }
    try {
        // Mark the PDF as read (upsert)
        const readAt = new Date();
        await client_1.prisma.pdfProgress.upsert({
            where: { studentId_pdfId: { studentId: user.id, pdfId } },
            update: { read: true, readAt },
            create: { studentId: user.id, pdfId, read: true, readAt },
        });
        // Find the course for this PDF
        const pdf = await client_1.prisma.coursePDF.findUnique({ where: { id: pdfId } });
        if (!pdf)
            return res.status(404).json({ message: 'PDF not found.' });
        // Check if all PDFs in this course are read
        const allPdfs = await client_1.prisma.coursePDF.findMany({ where: { courseId: pdf.courseId } });
        const readPdfs = await client_1.prisma.pdfProgress.findMany({
            where: { studentId: user.id, pdfId: { in: allPdfs.map(p => p.id) }, read: true },
        });
        const allRead = allPdfs.length > 0 && readPdfs.length === allPdfs.length;
        // If all PDFs are read, update student progress for this course
        if (allRead) {
            await client_1.prisma.studentProgress.upsert({
                where: { studentId_courseId: { studentId: user.id, courseId: pdf.courseId } },
                update: { status: 'completed', qualified: true },
                create: { studentId: user.id, courseId: pdf.courseId, status: 'completed', qualified: true },
            });
        }
        res.json({ message: 'PDF marked as read.', pdfId, readAt });
    }
    catch (error) {
        res.status(500).json({ message: 'Failed to mark PDF as read', error });
    }
};
exports.markPdfRead = markPdfRead;
/**
 * Get upcoming events for the student's district (next 45 days)
 * Returns events in ascending order by date
 */
const getStudentUpcomingEvents = async (req, res) => {
    const user = req.user;
    if (!user || user.role !== 'student' || !user.districtId) {
        return res.status(403).json({ message: 'Access denied. Only students with a district can view events.' });
    }
    try {
        const now = new Date();
        const futureDate = new Date();
        futureDate.setDate(now.getDate() + 45);
        // Get events within the next 45 days, ordered by date (ascending)
        // Include both district-specific events and global events (where districtId is null)
        const events = await client_1.prisma.event.findMany({
            where: {
                OR: [
                    { districtId: user.districtId }, // District-specific events
                    { districtId: null } // Global events (created by master admin)
                ],
                date: {
                    gte: now, // Events from now
                    lte: futureDate // Up to 45 days from now
                }
            },
            include: {
                participants: true,
                district: true
            },
            orderBy: {
                date: 'asc' // Ascending order (earliest first)
            }
        });
        console.log(events);
        const formattedEvents = events.map(event => ({
            id: event.id,
            title: event.title,
            type: event.type,
            date: event.date.toISOString(),
            participants: event.participants?.length || 0,
            description: event.description,
            location: event.location,
            ctaName: event.ctaName,
            ctaLink: event.ctaLink,
            district: event.district?.name || 'Unknown',
            isUpcoming: event.date > now // Indicates if event is in the future
        }));
        res.status(200).json(formattedEvents);
    }
    catch (error) {
        console.error("Error fetching upcoming events:", error);
        res.status(500).json({ message: 'Internal server error' });
    }
};
exports.getStudentUpcomingEvents = getStudentUpcomingEvents;
/**
 * Get all events for the student's district
 * Includes both upcoming and past events, ordered by date (newest first)
 */
const getStudentAllEvents = async (req, res) => {
    const user = req.user;
    if (!user || user.role !== 'student' || !user.districtId) {
        return res.status(403).json({ message: 'Access denied. Only students with a district can view events.' });
    }
    try {
        const now = new Date();
        // Get all events, including both district-specific and global events, ordered by date (newest first)
        const events = await client_1.prisma.event.findMany({
            where: {
                OR: [
                    { districtId: user.districtId }, // District-specific events
                    { districtId: null } // Global events (created by master admin)
                ]
            },
            include: {
                participants: true,
                district: true
            },
            orderBy: {
                date: 'desc' // Most recent first
            }
        });
        const formattedEvents = events.map(event => ({
            id: event.id,
            title: event.title,
            type: event.type,
            date: event.date.toISOString(),
            participants: event.participants?.length || 0,
            district: event.district?.name || 'Unknown',
            description: event.description,
            location: event.location,
            ctaName: event.ctaName,
            ctaLink: event.ctaLink,
            isUpcoming: event.date > now, // Indicates if event is in the future
            isCompleted: event.date < now // Indicates if event is in the past
        }));
        res.status(200).json(formattedEvents);
    }
    catch (error) {
        console.error("Error fetching all events:", error);
        res.status(500).json({ message: 'Internal server error' });
    }
};
exports.getStudentAllEvents = getStudentAllEvents;
/**
 * Submit quiz answers and get results
 */
const submitQuiz = async (req, res) => {
    const user = req.user;
    if (!user || user.role !== 'student') {
        return res.status(403).json({ message: 'Forbidden: Not a student.' });
    }
    const { levelId, classId, totalQuestions, answers, timeSpent } = req.body;
    if (!levelId || !classId || !totalQuestions || !answers || !Array.isArray(answers)) {
        return res.status(400).json({ message: 'Missing required fields: levelId, classId, totalQuestions, answers' });
    }
    try {
        // Find the course for the specified class and level
        const course = await client_1.prisma.course.findFirst({
            where: {
                classLevel: classId,
                level: levelId
            },
            include: {
                quizzes: {
                    include: {
                        questionBank: {
                            include: {
                                questions: true
                            }
                        }
                    }
                }
            }
        });
        if (!course) {
            return res.status(404).json({ message: 'Course not found for the specified class and level.' });
        }
        if (course.quizzes.length === 0) {
            return res.status(404).json({ message: 'No quiz found for this course.' });
        }
        // Use the first quiz (assuming one quiz per course)
        const quiz = course.quizzes[0];
        if (!quiz) {
            return res.status(404).json({ message: 'Quiz not found for this course.' });
        }
        // Validate that answers array length matches totalQuestions
        if (answers.length !== totalQuestions) {
            return res.status(400).json({ message: 'Number of answers does not match total questions.' });
        }
        // Calculate score by comparing selected options with correct answers
        let correctAnswersCount = 0;
        const questions = quiz.questionBank.questions;
        for (const answer of answers) {
            const question = questions.find(q => q.id === answer.questionId);
            if (question && question.correctOption === answer.selectedOption) {
                correctAnswersCount++;
            }
        }
        const score = correctAnswersCount;
        // Get passing marks set by master admin for this class and level
        const passingMarkRecord = await client_1.prisma.passingMark.findUnique({
            where: {
                classId_levelId: {
                    classId: classId,
                    levelId: levelId
                }
            }
        });
        if (!passingMarkRecord) {
            return res.status(404).json({ message: 'Passing marks not configured for this class and level.' });
        }
        const requiredPassingMarks = passingMarkRecord.passingMarks;
        // Calculate percentage
        const percentage = (score / totalQuestions) * 100;
        // Determine if passed based on master admin's passing marks
        const isPassed = percentage >= requiredPassingMarks;
        // Calculate XP earned (10 XP for passing, 5 for attempting)
        const xpEarned = isPassed ? 10 : 5;
        // Check if certificate eligible (passing with 80% or higher)
        const certificateEligible = percentage >= 80;
        // Create exam attempt record
        const examAttempt = await client_1.prisma.examAttempt.create({
            data: {
                studentId: user.id,
                quizId: quiz.id,
                startedAt: new Date(),
                completedAt: new Date(),
                passed: isPassed,
                score: score
            }
        });
        // Update student progress if passed
        if (isPassed) {
            await client_1.prisma.studentProgress.upsert({
                where: {
                    studentId_courseId: {
                        studentId: user.id,
                        courseId: course.id
                    }
                },
                update: {
                    status: 'completed',
                    qualified: true,
                    attemptId: examAttempt.id
                },
                create: {
                    studentId: user.id,
                    courseId: course.id,
                    status: 'completed',
                    qualified: true,
                    attemptId: examAttempt.id
                }
            });
        }
        res.json({
            success: true,
            message: "Quiz submitted successfully",
            data: {
                quizId: quiz.id,
                levelId,
                classId,
                score,
                totalQuestions,
                percentage,
                passed: isPassed,
                timeSpent,
                certificateEligible,
                xpEarned,
                submittedAt: examAttempt.completedAt
            }
        });
    }
    catch (error) {
        console.error('Error submitting quiz:', error);
        res.status(500).json({ message: 'Failed to submit quiz', error: 'Internal server error' });
    }
};
exports.submitQuiz = submitQuiz;
