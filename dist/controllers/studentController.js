"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.markPdfRead = exports.markVideoWatched = exports.getStudentLevelContent = exports.getStudentNotifications = exports.getStudentLearningPath = exports.getStudentProfile = exports.getStudentDashboard = void 0;
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
            // Compare as numbers if possible, else as strings
            let enabled = false;
            const courseLevelNum = Number(course.level);
            const maxUnlockedLevelNum = Number(maxUnlockedLevel);
            if (!isNaN(courseLevelNum) && !isNaN(maxUnlockedLevelNum)) {
                enabled = courseLevelNum <= maxUnlockedLevelNum;
            }
            else {
                enabled = course.level <= maxUnlockedLevel;
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
        // Fetch video progress for this student
        const videoProgress = allVideos.length > 0 ? await client_1.prisma.videoProgress.findMany({
            where: { studentId: user.id, videoId: { in: allVideos.map(v => v.id) } },
        }) : [];
        const videoProgressMap = Object.fromEntries(videoProgress.map(vp => [vp.videoId, vp]));
        // Fetch pdf progress for this student
        const pdfProgress = allPdfs.length > 0 ? await client_1.prisma.pdfProgress.findMany({
            where: { studentId: user.id, pdfId: { in: allPdfs.map(p => p.id) } },
        }) : [];
        const pdfProgressMap = Object.fromEntries(pdfProgress.map(pp => [pp.pdfId, pp]));
        // Fetch quiz attempts for this student
        const quizIds = allQuizzes.map(q => q.id);
        const examAttempts = quizIds.length > 0 ? await client_1.prisma.examAttempt.findMany({
            where: { studentId: user.id, quizId: { in: quizIds } },
            orderBy: { completedAt: 'desc' },
        }) : [];
        const examAttemptMap = Object.fromEntries(examAttempts.map(ea => [ea.quizId, ea]));
        // Compose response
        const videos = allVideos.map(video => ({
            id: video.id,
            title: video.title,
            iframeSnippet: video.iframeSnippet,
            youtubeId: video.youtubeId,
            thumbnail: video.thumbnail,
            watched: !!videoProgressMap[video.id]?.watched,
            watchedAt: videoProgressMap[video.id]?.watchedAt || null,
        }));
        const pdfs = allPdfs.map(pdf => ({
            id: pdf.id,
            title: pdf.title,
            url: pdf.url,
            read: !!pdfProgressMap[pdf.id]?.read,
            readAt: pdfProgressMap[pdf.id]?.readAt || null,
        }));
        const quizzes = allQuizzes.map(quiz => {
            const attempt = examAttemptMap[quiz.id];
            return {
                id: quiz.id,
                numQuestions: quiz.numQuestions,
                attempted: !!attempt,
                score: attempt?.score ?? null,
                passed: attempt?.passed ?? null,
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
