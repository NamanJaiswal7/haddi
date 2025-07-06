import { Router } from 'express';
import { getCourseLevels } from '../controllers/courseController';
import { authenticateToken } from '../middleware/authMiddleware';
import { asyncHandler } from '../utils/asyncHandler';

const router = Router();

// This route is available to any authenticated user
router.use(asyncHandler(authenticateToken));

/**
 * @route GET /api/levels
 * @description Get all unique course levels
 * @access Private
 */
router.get('/', asyncHandler(getCourseLevels));

export default router; 