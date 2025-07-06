import { Router } from 'express';
import { authenticateToken } from '../middleware/authMiddleware';
import { asyncHandler } from '../utils/asyncHandler';
import { getStudentDashboard, getStudentProfile, getStudentLearningPath, getStudentNotifications, getStudentLevelContent, markVideoWatched, markPdfRead } from '../controllers/studentController';

const router = Router();

router.get('/dashboard', asyncHandler(authenticateToken), asyncHandler(getStudentDashboard));
router.get('/profile', asyncHandler(authenticateToken), asyncHandler(getStudentProfile));
router.get('/learning-path', asyncHandler(authenticateToken), asyncHandler(getStudentLearningPath));
router.get('/notifications', asyncHandler(authenticateToken), asyncHandler(getStudentNotifications));
router.get('/level-content', asyncHandler(authenticateToken), asyncHandler(getStudentLevelContent));
router.post('/mark-watched', asyncHandler(authenticateToken), asyncHandler(markVideoWatched));
router.post('/mark-pdf-read', asyncHandler(authenticateToken), asyncHandler(markPdfRead));

export default router; 