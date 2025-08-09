import { Request, Response } from 'express';
import { prisma } from '../prisma/client';
import logger from '../utils/logger';

/**
 * Get Course Data - Fetches all course data for the authenticated student
 */
export const getCourseData = async (req: Request, res: Response) => {
  try {
    const userId = (req as any).user.id;

    // Get user data
    const user = await prisma.user.findUnique({
      where: { id: userId },
      include: { district: true }
    });

    if (!user) {
      return res.status(404).json({ success: false, message: 'User not found' });
    }

    // Get all courses with their content
    const courses = await prisma.course.findMany({
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
    const studentProgress = await prisma.studentProgress.findMany({
      where: { studentId: userId },
      include: { course: true }
    });

    // Get video progress
    const videoProgressData = await prisma.videoProgress.findMany({
      where: { studentId: userId }
    });

    // Get PDF progress
    const pdfProgressData = await prisma.pdfProgress.findMany({
      where: { studentId: userId }
    });

    // Get quiz attempts
    const quizAttempts = await prisma.examAttempt.findMany({
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
      
      const completedVideos = videoProgressData.filter(vp => 
        courseVideos.some(v => v.id === vp.videoId)
      ).length;
      
      const completedPDFs = pdfProgressData.filter(pp => 
        coursePDFs.some(p => p.id === pp.pdfId)
      ).length;
      
      const completedQuizzes = quizAttempts.filter(qa => 
        courseQuizzes.some(q => q.id === qa.quizId) && qa.score !== null
      ).length;

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
    const videos = courses.flatMap(course => 
      course.videos.map(video => {
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
      })
    );

    // Build PDFs data
    const pdfs = courses.flatMap(course => 
      course.pdfs.map(pdf => {
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
      })
    );

    // Build quizzes data
    const quizzes = courses.flatMap(course => 
      course.quizzes.map(quiz => {
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
      })
    );

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

    logger.info('Course data fetched successfully', { userId, currentLevel });

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
  } catch (error) {
    logger.error('Error fetching course data:', { 
      error: error instanceof Error ? error.message : String(error),
      stack: error instanceof Error ? error.stack : undefined
    });
    res.status(500).json({ 
      success: false, 
      message: 'Server error. Please try again later.' 
    });
  }
};

/**
 * Get Level Data - Fetches detailed data for a specific level
 */
export const getLevelData = async (req: Request, res: Response) => {
  try {
    const userId = (req as any).user.id;
    const { levelId } = req.params;

    // Get the specific course/level
    const course = await prisma.course.findUnique({
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
    const videoProgressData = await prisma.videoProgress.findMany({
      where: { 
        studentId: userId,
        videoId: { in: course.videos.map(v => v.id) }
      }
    });
    const pdfProgressData = await prisma.pdfProgress.findMany({
      where: { 
        studentId: userId,
        pdfId: { in: course.pdfs.map(p => p.id) }
      }
    });
    const quizAttempts = await prisma.examAttempt.findMany({
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

    logger.info('Level data fetched successfully', { userId, levelId });

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
  } catch (error) {
    logger.error('Error fetching level data:', { 
      error: error instanceof Error ? error.message : String(error),
      stack: error instanceof Error ? error.stack : undefined
    });
    res.status(500).json({ 
      success: false, 
      message: 'Server error. Please try again later.' 
    });
  }
};

/**
 * Mark Video as Watched
 */
export const markVideoAsWatched = async (req: Request, res: Response) => {
  try {
    const userId = (req as any).user.id;
    const { videoId } = req.params;

    if (!videoId) {
      return res.status(400).json({ success: false, message: 'Video ID is required' });
    }

    // Check if video exists
    const video = await prisma.courseVideo.findUnique({
      where: { id: videoId }
    });

    if (!video) {
      return res.status(404).json({ success: false, message: 'Video not found' });
    }

    // Create or update video progress
    await prisma.videoProgress.upsert({
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

    logger.info('Video marked as watched', { userId, videoId });

    res.json({
      success: true,
      message: 'Video marked as watched successfully'
    });
  } catch (error) {
    logger.error('Error marking video as watched:', { 
      error: error instanceof Error ? error.message : String(error),
      stack: error instanceof Error ? error.stack : undefined
    });
    res.status(500).json({ 
      success: false, 
      message: 'Server error. Please try again later.' 
    });
  }
};

/**
 * Mark PDF as Read
 */
export const markPDFAsRead = async (req: Request, res: Response) => {
  try {
    const userId = (req as any).user.id;
    const { pdfId } = req.params;

    if (!pdfId) {
      return res.status(400).json({ success: false, message: 'PDF ID is required' });
    }

    // Check if PDF exists
    const pdf = await prisma.coursePDF.findUnique({
      where: { id: pdfId }
    });

    if (!pdf) {
      return res.status(404).json({ success: false, message: 'PDF not found' });
    }

    // Create or update PDF progress
    await prisma.pdfProgress.upsert({
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

    logger.info('PDF marked as read', { userId, pdfId });

    res.json({
      success: true,
      message: 'PDF marked as read successfully'
    });
  } catch (error) {
    logger.error('Error marking PDF as read:', { 
      error: error instanceof Error ? error.message : String(error),
      stack: error instanceof Error ? error.stack : undefined
    });
    res.status(500).json({ 
      success: false, 
      message: 'Server error. Please try again later.' 
    });
  }
};

/**
 * Submit Quiz
 */
export const submitQuiz = async (req: Request, res: Response) => {
  try {
    const userId = (req as any).user.id;
    const { quizId } = req.params;
    const { answers } = req.body;

    if (!quizId) {
      return res.status(400).json({ success: false, message: 'Quiz ID is required' });
    }

    // Check if quiz exists
    const quiz = await prisma.quiz.findUnique({
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
    const quizAttempt = await prisma.examAttempt.create({
      data: {
        studentId: userId,
        quizId: quizId,
        startedAt: new Date(),
        completedAt: new Date(),
        passed: passed,
        score: score
      }
    });

    logger.info('Quiz submitted successfully', { userId, quizId, score, passed });

    res.json({
      success: true,
      score,
      totalQuestions,
      correctAnswers,
      passingScore,
      passed,
      message: 'Quiz completed successfully'
    });
  } catch (error) {
    logger.error('Error submitting quiz:', { 
      error: error instanceof Error ? error.message : String(error),
      stack: error instanceof Error ? error.stack : undefined
    });
    res.status(500).json({ 
      success: false, 
      message: 'Server error. Please try again later.' 
    });
  }
};

/**
 * Mark Lesson as Completed
 */
export const markLessonAsCompleted = async (req: Request, res: Response) => {
  try {
    const userId = (req as any).user.id;
    const { lessonId } = req.params;

    if (!lessonId) {
      return res.status(400).json({ success: false, message: 'Lesson ID is required' });
    }

    // Check if lesson/course exists
    const course = await prisma.course.findUnique({
      where: { id: lessonId }
    });

    if (!course) {
      return res.status(404).json({ success: false, message: 'Lesson not found' });
    }

    // Update or create student progress
    await prisma.studentProgress.upsert({
      where: {
        studentId_courseId: {
          studentId: userId,
          courseId: lessonId
        }
      },
      update: {
        status: 'completed' as any,
        qualified: true
      },
      create: {
        studentId: userId,
        courseId: lessonId,
        status: 'completed' as any,
        qualified: true
      }
    });

    logger.info('Lesson marked as completed', { userId, lessonId });

    res.json({
      success: true,
      message: 'Lesson marked as completed successfully'
    });
  } catch (error) {
    logger.error('Error marking lesson as completed:', { 
      error: error instanceof Error ? error.message : String(error),
      stack: error instanceof Error ? error.stack : undefined
    });
    res.status(500).json({ 
      success: false, 
      message: 'Server error. Please try again later.' 
    });
  }
};

/**
 * Mark Level as Completed
 */
export const markLevelAsCompleted = async (req: Request, res: Response) => {
  try {
    const userId = (req as any).user.id;
    const { levelId } = req.params;

    if (!levelId) {
      return res.status(400).json({ success: false, message: 'Level ID is required' });
    }

    // Check if level/course exists
    const course = await prisma.course.findUnique({
      where: { id: levelId }
    });

    if (!course) {
      return res.status(404).json({ success: false, message: 'Level not found' });
    }

    // Update student progress
    await prisma.studentProgress.upsert({
      where: {
        studentId_courseId: {
          studentId: userId,
          courseId: levelId
        }
      },
      update: {
        status: 'completed' as any,
        qualified: true
      },
      create: {
        studentId: userId,
        courseId: levelId,
        status: 'completed' as any,
        qualified: true
      }
    });

    const certificateUrl = `https://example.com/certificates/level_${course.level}_cert.pdf`;

    logger.info('Level marked as completed', { userId, levelId, certificateUrl });

    res.json({
      success: true,
      message: 'Level completed successfully',
      certificateUrl
    });
  } catch (error) {
    logger.error('Error marking level as completed:', { 
      error: error instanceof Error ? error.message : String(error),
      stack: error instanceof Error ? error.stack : undefined
    });
    res.status(500).json({ 
      success: false, 
      message: 'Server error. Please try again later.' 
    });
  }
}; 