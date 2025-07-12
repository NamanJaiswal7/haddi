"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
const districtAdminController_1 = require("../controllers/districtAdminController");
const authMiddleware_1 = require("../middleware/authMiddleware");
const asyncHandler_1 = require("../utils/asyncHandler");
const router = (0, express_1.Router)();
// All routes in this file are protected and require district admin role
router.use((0, asyncHandler_1.asyncHandler)(authMiddleware_1.authenticateToken));
router.use((0, asyncHandler_1.asyncHandler)(authMiddleware_1.isDistrictAdmin));
/**
 * @route GET /api/district-admin/stats
 * @description Get dashboard stats for the district admin
 * @access Private (District Admin)
 */
router.get('/stats', (0, asyncHandler_1.asyncHandler)(districtAdminController_1.getDashboardStats));
/**
 * @route GET /api/district-admin/students
 * @description Get student list for the district admin
 * @access Private (District Admin)
 */
router.get('/students', (0, asyncHandler_1.asyncHandler)(districtAdminController_1.getStudentList));
/**
 * @route GET /api/district-admin/analytics
 * @description Get analytics data for the district admin
 * @access Private (District Admin)
 */
router.get('/analytics', (0, asyncHandler_1.asyncHandler)(districtAdminController_1.getAnalyticsData));
/**
 * @route GET /api/district-admin/school-performance
 * @description Get a sortable/filterable list of school performance data
 * @access Private (District Admin)
 */
router.get('/school-performance', (0, asyncHandler_1.asyncHandler)(districtAdminController_1.getSchoolPerformance));
/**
 * @route POST /api/district-admin/events
 * @description Create a new event for the district
 * @access Private (District Admin)
 */
router.post('/events', (0, asyncHandler_1.asyncHandler)(districtAdminController_1.createEvent));
/**
 * @route GET /api/district-admin/events/upcoming
 * @description Get upcoming events for the district (next 45 days)
 * @access Private (District Admin)
 */
router.get('/events/upcoming', (0, asyncHandler_1.asyncHandler)(districtAdminController_1.getUpcomingEvents));
/**
 * @route PUT /api/district-admin/events/:id
 * @description Update an event for the district
 * @access Private (District Admin)
 */
router.put('/events/:id', (0, asyncHandler_1.asyncHandler)(districtAdminController_1.updateDistrictEvent));
/**
 * @route POST /api/district-admin/notifications
 * @description Send a notification to students in the district
 * @access Private (District Admin)
 */
router.post('/notifications', (0, asyncHandler_1.asyncHandler)(districtAdminController_1.sendNotification));
/**
 * @route GET /api/district-admin/schools
 * @description Get all schools in the district admin's district
 * @access Private (District Admin)
 */
router.get('/schools', (0, asyncHandler_1.asyncHandler)(districtAdminController_1.getDistrictSchools));
exports.default = router;
