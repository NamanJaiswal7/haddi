import { Router } from 'express';
import { getDashboardStats, getStudentList, getAnalyticsData, sendNotification, getDistrictSchools, getSchoolPerformance, createEvent, getUpcomingEvents, updateDistrictEvent } from '../controllers/districtAdminController';
import { authenticateToken, isDistrictAdmin } from '../middleware/authMiddleware';
import { asyncHandler } from '../utils/asyncHandler';

const router = Router();

// All routes in this file are protected and require district admin role
router.use(asyncHandler(authenticateToken));
router.use(asyncHandler(isDistrictAdmin));

/**
 * @route GET /api/district-admin/stats
 * @description Get dashboard stats for the district admin
 * @access Private (District Admin)
 */
router.get('/stats', asyncHandler(getDashboardStats));

/**
 * @route GET /api/district-admin/students
 * @description Get student list for the district admin
 * @access Private (District Admin)
 */
router.get('/students', asyncHandler(getStudentList));

/**
 * @route GET /api/district-admin/analytics
 * @description Get analytics data for the district admin
 * @access Private (District Admin)
 */
router.get('/analytics', asyncHandler(getAnalyticsData));

/**
 * @route GET /api/district-admin/school-performance
 * @description Get a sortable/filterable list of school performance data
 * @access Private (District Admin)
 */
router.get('/school-performance', asyncHandler(getSchoolPerformance));

/**
 * @route POST /api/district-admin/events
 * @description Create a new event for the district
 * @access Private (District Admin)
 */
router.post('/events', asyncHandler(createEvent));

/**
 * @route GET /api/district-admin/events/upcoming
 * @description Get upcoming events for the district (next 45 days)
 * @access Private (District Admin)
 */
router.get('/events/upcoming', asyncHandler(getUpcomingEvents));

/**
 * @route PUT /api/district-admin/events/:id
 * @description Update an event for the district
 * @access Private (District Admin)
 */
router.put('/events/:id', asyncHandler(updateDistrictEvent));

/**
 * @route POST /api/district-admin/notifications
 * @description Send a notification to students in the district
 * @access Private (District Admin)
 */
router.post('/notifications', asyncHandler(sendNotification));

/**
 * @route GET /api/district-admin/schools
 * @description Get all schools in the district admin's district
 * @access Private (District Admin)
 */
router.get('/schools', asyncHandler(getDistrictSchools));

export default router; 