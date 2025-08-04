"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
const masterAdminController_1 = require("../controllers/masterAdminController");
const authMiddleware_1 = require("../middleware/authMiddleware");
const asyncHandler_1 = require("../utils/asyncHandler");
const uploadMiddleware_1 = require("../middleware/uploadMiddleware");
const router = (0, express_1.Router)();
// All routes in this file are for Master Admins only
router.use((0, asyncHandler_1.asyncHandler)(authMiddleware_1.authenticateToken));
router.use((0, asyncHandler_1.asyncHandler)(authMiddleware_1.isMasterAdmin));
/**
 * @route GET /api/master-admin/stats
 * @description Get dashboard stats for the master admin
 * @access Private (Master Admin)
 */
router.get('/stats', (0, asyncHandler_1.asyncHandler)(masterAdminController_1.getDashboardStats));
/**
 * @route GET /api/master-admin/district-performance
 * @description Get performance overview for all districts
 * @access Private (Master Admin)
 */
router.get('/district-performance', (0, asyncHandler_1.asyncHandler)(masterAdminController_1.getDistrictPerformance));
/**
 * @route GET /api/master-admin/analytics
 * @description Get analytics data for the master admin dashboard
 * @access Private (Master Admin)
 */
router.get('/analytics', (0, asyncHandler_1.asyncHandler)(masterAdminController_1.getAnalyticsData));
/**
 * @route GET /api/master-admin/students
 * @description Get a paginated and filterable list of all students
 * @access Private (Master Admin)
 */
router.get('/students', (0, asyncHandler_1.asyncHandler)(masterAdminController_1.getAllStudents));
/**
 * @route GET /api/master-admin/district-admins
 * @description Get a list of all district admins
 * @access Private (Master Admin)
 */
router.get('/district-admins', (0, asyncHandler_1.asyncHandler)(masterAdminController_1.getDistrictAdmins));
/**
 * @route POST /api/master-admin/district-admins
 * @description Create a new district admin
 * @access Private (Master Admin)
 */
router.post('/district-admins', (0, asyncHandler_1.asyncHandler)(masterAdminController_1.createDistrictAdmin));
/**
 * @route PUT /api/master-admin/district-admins/:id
 * @description Update an existing district admin
 * @access Private (Master Admin)
 */
router.put('/district-admins/:id', (0, asyncHandler_1.asyncHandler)(masterAdminController_1.updateDistrictAdmin));
/**
 * @route DELETE /api/master-admin/district-admins/:id
 * @description Delete a district admin
 * @access Private (Master Admin)
 */
router.delete('/district-admins/:id', (0, asyncHandler_1.asyncHandler)(masterAdminController_1.deleteDistrictAdmin));
/**
 * @route GET /api/master-admin/events
 * @description Get a list of all global and district events
 * @access Private (Master Admin)
 */
router.get('/events', (0, asyncHandler_1.asyncHandler)(masterAdminController_1.getAllEvents));
/**
 * @route POST /api/master-admin/events
 * @description Create a new global event
 * @access Private (Master Admin)
 */
router.post('/events', (0, asyncHandler_1.asyncHandler)(masterAdminController_1.createGlobalEvent));
/**
 * @route PUT /api/master-admin/events/:id
 * @description Update an existing event
 * @access Private (Master Admin)
 */
router.put('/events/:id', (0, asyncHandler_1.asyncHandler)(masterAdminController_1.updateEvent));
/**
 * @route POST /api/master-admin/notifications
 * @description Send a notification to a targeted group of students
 * @access Private (Master Admin)
 */
router.post('/notifications', (0, asyncHandler_1.asyncHandler)(masterAdminController_1.sendGlobalNotification));
/**
 * =================================================================
 *                  COURSE CONTENT MANAGEMENT
 * =================================================================
 */
/**
 * @route GET /api/master-admin/courses/all
 * @description Get a list of all courses with filters
 * @access Private (Master Admin)
 */
router.get('/courses/all', (0, asyncHandler_1.asyncHandler)(masterAdminController_1.getAllCourses));
/**
 * @route POST /api/master-admin/courses/videos
 * @description Add a new video to a course
 * @access Private (Master Admin)
 */
router.post('/courses/videos', (0, asyncHandler_1.asyncHandler)(masterAdminController_1.addVideo));
/**
 * @route POST /api/master-admin/courses/notes
 * @description Add a new PDF note to a course
 * @access Private (Master Admin)
 */
router.post('/courses/notes', uploadMiddleware_1.upload.single('file'), (0, asyncHandler_1.asyncHandler)(masterAdminController_1.addNote));
/**
 * @route POST /api/master-admin/courses/quizzes
 * @description Add a new quiz to a course from an Excel file
 * @access Private (Master Admin)
 */
router.post('/courses/quiz', uploadMiddleware_1.upload.single('file'), (0, asyncHandler_1.asyncHandler)(masterAdminController_1.addQuiz));
/**
 * @route POST /api/master-admin/courses/passing-marks
 * @description Set passing marks for a course
 * @access Private (Master Admin)
 */
router.post('/courses/passing-marks', (0, asyncHandler_1.asyncHandler)(masterAdminController_1.setPassingMarks));
/**
 * @route GET /api/master-admin/courses/passing-marks
 * @description Get passing marks for a course
 * @access Private (Master Admin)
 */
router.get('/courses/passing-marks', (0, asyncHandler_1.asyncHandler)(masterAdminController_1.getPassingMarks));
/**
 * @route GET /api/master-admin/course-levels
 * @description Get course levels for the master admin
 * @access Private (Master Admin)
 */
router.get('/course-levels', (0, asyncHandler_1.asyncHandler)(masterAdminController_1.getCourseLevels));
/**
 * @route POST /api/master-admin/course-levels
 * @description Set course levels for the master admin
 * @access Private (Master Admin)
 */
router.post('/course-levels', (0, asyncHandler_1.asyncHandler)(masterAdminController_1.setCourseLevels));
/**
 * @route PUT /api/master-admin/courses/videos/:id
 * @description Update a course video
 * @access Private (Master Admin)
 */
router.put('/courses/videos/:id', (0, asyncHandler_1.asyncHandler)(masterAdminController_1.updateVideo));
/**
 * @route PUT /api/master-admin/courses/notes/:id
 * @description Update a course note
 * @access Private (Master Admin)
 */
router.put('/courses/notes/:id', uploadMiddleware_1.upload.single('file'), (0, asyncHandler_1.asyncHandler)(masterAdminController_1.updateNote));
/**
 * @route PUT /api/master-admin/courses/quiz/:id
 * @description Update a quiz for a course
 * @access Private (Master Admin)
 */
router.put('/courses/quiz/:id', uploadMiddleware_1.upload.single('file'), (0, asyncHandler_1.asyncHandler)(masterAdminController_1.updateQuiz));
/**
 * @route DELETE /api/master-admin/course-levels
 * @description Delete all courses for a class and level, and update course levels
 * @access Private (Master Admin)
 */
router.delete('/course-levels', (0, asyncHandler_1.asyncHandler)(masterAdminController_1.deleteCourseLevel));
exports.default = router;
