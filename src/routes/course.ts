import { Router } from 'express';
import { 
  getCourseData, 
  getLevelData, 
  markVideoAsWatched, 
  markPDFAsRead, 
  submitQuiz, 
  markLessonAsCompleted, 
  markLevelAsCompleted 
} from '../controllers/courseController';
import { authenticateToken } from '../middleware/authMiddleware';
import { asyncHandler } from '../utils/asyncHandler';

const router = Router();

// All routes require authentication only
router.use(asyncHandler(authenticateToken));

/**
 * @route GET /api/courses/data
 * @description Get all course data for the authenticated student
 * @access Private
 */
router.get('/data', asyncHandler(getCourseData));

/**
 * @route GET /api/courses/level/:levelId
 * @description Get detailed data for a specific level
 * @access Private
 */
router.get('/level/:levelId', asyncHandler(getLevelData));

/**
 * @route POST /api/courses/video/:videoId/watched
 * @description Mark a video as watched
 * @access Private
 */
router.post('/video/:videoId/watched', asyncHandler(markVideoAsWatched));

/**
 * @route POST /api/courses/pdf/:pdfId/read
 * @description Mark a PDF as read
 * @access Private
 */
router.post('/pdf/:pdfId/read', asyncHandler(markPDFAsRead));

/**
 * @route POST /api/courses/quiz/:quizId/submit
 * @description Submit quiz answers and get results
 * @access Private
 */
router.post('/quiz/:quizId/submit', asyncHandler(submitQuiz));

/**
 * @route POST /api/courses/lesson/:lessonId/complete
 * @description Mark a lesson as completed
 * @access Private
 */
router.post('/lesson/:lessonId/complete', asyncHandler(markLessonAsCompleted));

/**
 * @route POST /api/courses/level/:levelId/complete
 * @description Mark a level as completed and generate certificate
 * @access Private
 */
router.post('/level/:levelId/complete', asyncHandler(markLevelAsCompleted));

export default router; 