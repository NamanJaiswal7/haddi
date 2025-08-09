import { Router } from 'express';
import {
    getDashboardStats,
    getDistrictPerformance,
    getAllStudents,
    getDistrictAdmins,
    createDistrictAdmin,
    updateDistrictAdmin,
    deleteDistrictAdmin,
    createGlobalEvent,
    getAllEvents,
    updateEvent,
    sendGlobalNotification,
    getAnalyticsData,
    addVideo,
    addNote,
    addQuiz,
    getAllCourses,
    setPassingMarks,
    getPassingMarks,
    getCourseLevels,
    setCourseLevels,
    updateVideo,
    updateNote,
    updateQuiz,
    deleteCourseLevel,
    updateCourseTitle,
    deleteVideo,
    deleteNote,
    deleteQuiz
} from '../controllers/masterAdminController';
import { authenticateToken, isMasterAdmin } from '../middleware/authMiddleware';
import { asyncHandler } from '../utils/asyncHandler';
import { upload } from '../middleware/uploadMiddleware';

const router = Router();

// All routes in this file are for Master Admins only
router.use(asyncHandler(authenticateToken));
router.use(asyncHandler(isMasterAdmin));

/**
 * @route GET /api/master-admin/stats
 * @description Get dashboard stats for the master admin
 * @access Private (Master Admin)
 */
router.get('/stats', asyncHandler(getDashboardStats));

/**
 * @route GET /api/master-admin/district-performance
 * @description Get performance overview for all districts
 * @access Private (Master Admin)
 */
router.get('/district-performance', asyncHandler(getDistrictPerformance));

/**
 * @route GET /api/master-admin/analytics
 * @description Get analytics data for the master admin dashboard
 * @access Private (Master Admin)
 */
router.get('/analytics', asyncHandler(getAnalyticsData));

/**
 * @route GET /api/master-admin/students
 * @description Get a paginated and filterable list of all students
 * @access Private (Master Admin)
 */
router.get('/students', asyncHandler(getAllStudents));

/**
 * @route GET /api/master-admin/district-admins
 * @description Get a list of all district admins
 * @access Private (Master Admin)
 */
router.get('/district-admins', asyncHandler(getDistrictAdmins));

/**
 * @route POST /api/master-admin/district-admins
 * @description Create a new district admin
 * @access Private (Master Admin)
 */
router.post('/district-admins', asyncHandler(createDistrictAdmin));

/**
 * @route PUT /api/master-admin/district-admins/:id
 * @description Update an existing district admin
 * @access Private (Master Admin)
 */
router.put('/district-admins/:id', asyncHandler(updateDistrictAdmin));

/**
 * @route DELETE /api/master-admin/district-admins/:id
 * @description Delete a district admin
 * @access Private (Master Admin)
 */
router.delete('/district-admins/:id', asyncHandler(deleteDistrictAdmin));

/**
 * @route GET /api/master-admin/events
 * @description Get a list of all global and district events
 * @access Private (Master Admin)
 */
router.get('/events', asyncHandler(getAllEvents));

/**
 * @route POST /api/master-admin/events
 * @description Create a new global event
 * @access Private (Master Admin)
 */
router.post('/events', asyncHandler(createGlobalEvent));

/**
 * @route PUT /api/master-admin/events/:id
 * @description Update an existing event
 * @access Private (Master Admin)
 */
router.put('/events/:id', asyncHandler(updateEvent));

/**
 * @route POST /api/master-admin/notifications
 * @description Send a notification to a targeted group of students
 * @access Private (Master Admin)
 */
router.post('/notifications', asyncHandler(sendGlobalNotification));

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
router.get('/courses/all', asyncHandler(getAllCourses));

/**
 * @route POST /api/master-admin/courses/videos
 * @description Add a new video to a course
 * @access Private (Master Admin)
 */
router.post('/courses/videos', asyncHandler(addVideo));

/**
 * @route POST /api/master-admin/courses/notes
 * @description Add a new PDF note to a course
 * @access Private (Master Admin)
 */
router.post('/courses/notes', upload.single('file'), asyncHandler(addNote));

/**
 * @route POST /api/master-admin/courses/quizzes
 * @description Add a new quiz to a course from an Excel file
 * @access Private (Master Admin)
 */
router.post('/courses/quiz', upload.single('file'), asyncHandler(addQuiz));

/**
 * @route POST /api/master-admin/courses/passing-marks
 * @description Set passing marks for a course
 * @access Private (Master Admin)
 */
router.post('/courses/passing-marks', asyncHandler(setPassingMarks));

/**
 * @route GET /api/master-admin/courses/passing-marks
 * @description Get passing marks for a course
 * @access Private (Master Admin)
 */
router.get('/courses/passing-marks', asyncHandler(getPassingMarks));

/**
 * @route GET /api/master-admin/course-levels
 * @description Get course levels for the master admin
 * @access Private (Master Admin)
 */
router.get('/course-levels', asyncHandler(getCourseLevels));

/**
 * @route POST /api/master-admin/course-levels
 * @description Set course levels for the master admin
 * @access Private (Master Admin)
 */
router.post('/course-levels', asyncHandler(setCourseLevels));

/**
 * @route PUT /api/master-admin/courses/videos/:id
 * @description Update a course video
 * @access Private (Master Admin)
 */
router.put('/courses/videos/:id', asyncHandler(updateVideo));

/**
 * @route DELETE /api/master-admin/courses/videos/:id
 * @description Delete a course video
 * @access Private (Master Admin)
 */
router.delete('/courses/videos/:id', asyncHandler(deleteVideo));

/**
 * @route PUT /api/master-admin/courses/notes/:id
 * @description Update a course note
 * @access Private (Master Admin)
 */
router.put('/courses/notes/:id', upload.single('file'), asyncHandler(updateNote));

/**
 * @route DELETE /api/master-admin/courses/notes/:id
 * @description Delete a course note
 * @access Private (Master Admin)
 */
router.delete('/courses/notes/:id', asyncHandler(deleteNote));

/**
 * @route PUT /api/master-admin/courses/quiz/:id
 * @description Update a quiz for a course
 * @access Private (Master Admin)
 */
router.put('/courses/quiz/:id', upload.single('file'), asyncHandler(updateQuiz));

/**
 * @route DELETE /api/master-admin/courses/quiz
 * @description Delete quizzes for a specific class and level
 * @access Private (Master Admin)
 */
router.delete('/courses/quiz', asyncHandler(deleteQuiz));

/**
 * @route PUT /api/master-admin/courses/title
 * @description Update the title of a course
 * @access Private (Master Admin)
 */
router.put('/courses/title', asyncHandler(updateCourseTitle));

/**
 * @route DELETE /api/master-admin/course-levels/:classLevel/:level
 * @description Delete all courses for a class and level, and update course levels
 * @access Private (Master Admin)
 */
router.delete('/course-levels/:classLevel/:level', asyncHandler(deleteCourseLevel));

export default router; 