import { Router } from 'express';
import { authenticateToken } from '../middleware/authMiddleware';
import { asyncHandler } from '../utils/asyncHandler';
import { 
  getStudentDashboard, 
  getStudentProfile, 
  getStudentLearningPath, 
  getStudentNotifications, 
  getStudentNotificationCount,
  getStudentLevelContent, 
  markVideoWatched, 
  markPdfRead,
  getStudentUpcomingEvents,
  getStudentAllEvents,
  submitQuiz,
  getStudentQuizValidity,
  getStudentRandomQuestions,
  getStudentNotes
} from '../controllers/studentController';
import { getLevelSchedules } from '../controllers/masterAdminController';

const router = Router();

// All routes in this file require authentication
router.use(asyncHandler(authenticateToken));

// Student dashboard and profile routes
router.get('/dashboard', asyncHandler(getStudentDashboard));
router.get('/profile', asyncHandler(getStudentProfile));
router.get('/learning-path', asyncHandler(getStudentLearningPath));
router.get('/notifications', asyncHandler(getStudentNotifications));
router.get('/notifications/count', asyncHandler(getStudentNotificationCount));
router.get('/level-content', asyncHandler(getStudentLevelContent));
router.post('/mark-watched', asyncHandler(markVideoWatched));
router.post('/mark-pdf-read', asyncHandler(markPdfRead));

// Event routes
router.get('/events/upcoming', asyncHandler(getStudentUpcomingEvents));
router.get('/events/all', asyncHandler(getStudentAllEvents));

// Quiz submission route
router.post('/submit-quiz', asyncHandler(submitQuiz));

// Level schedules route (accessible to all authenticated users)
router.get('/level-schedules', asyncHandler(getLevelSchedules));

// Quiz validity route (for student's class)
router.get('/quiz-validity', asyncHandler(getStudentQuizValidity));

// Random questions route (for student's level)
router.get('/level-content/random-questions', asyncHandler(getStudentRandomQuestions));

// Notes route (for student's level)
router.get('/notes', asyncHandler(getStudentNotes));

export default router; 