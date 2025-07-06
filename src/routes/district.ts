import { Router } from 'express';
import { getAllDistricts } from '../controllers/districtController';
import { asyncHandler } from '../utils/asyncHandler';

const router = Router();

/**
 * @route GET /api/districts
 * @description Get a list of all districts
 * @access Private
 */
router.get('/', asyncHandler(getAllDistricts));

export default router; 