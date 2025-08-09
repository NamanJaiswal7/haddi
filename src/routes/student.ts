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
  submitQuiz
} from '../controllers/studentController';

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

export default router; 