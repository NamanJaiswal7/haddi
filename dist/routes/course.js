"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
const courseController_1 = require("../controllers/courseController");
const authMiddleware_1 = require("../middleware/authMiddleware");
const asyncHandler_1 = require("../utils/asyncHandler");
const router = (0, express_1.Router)();
// All routes require authentication only
router.use((0, asyncHandler_1.asyncHandler)(authMiddleware_1.authenticateToken));
/**
 * @route GET /api/courses/data
 * @description Get all course data for the authenticated student
 * @access Private
 */
router.get('/data', (0, asyncHandler_1.asyncHandler)(courseController_1.getCourseData));
/**
 * @route GET /api/courses/level/:levelId
 * @description Get detailed data for a specific level
 * @access Private
 */
router.get('/level/:levelId', (0, asyncHandler_1.asyncHandler)(courseController_1.getLevelData));
/**
 * @route POST /api/courses/video/:videoId/watched
 * @description Mark a video as watched
 * @access Private
 */
router.post('/video/:videoId/watched', (0, asyncHandler_1.asyncHandler)(courseController_1.markVideoAsWatched));
/**
 * @route POST /api/courses/pdf/:pdfId/read
 * @description Mark a PDF as read
 * @access Private
 */
router.post('/pdf/:pdfId/read', (0, asyncHandler_1.asyncHandler)(courseController_1.markPDFAsRead));
/**
 * @route POST /api/courses/quiz/:quizId/submit
 * @description Submit quiz answers and get results
 * @access Private
 */
router.post('/quiz/:quizId/submit', (0, asyncHandler_1.asyncHandler)(courseController_1.submitQuiz));
/**
 * @route POST /api/courses/lesson/:lessonId/complete
 * @description Mark a lesson as completed
 * @access Private
 */
router.post('/lesson/:lessonId/complete', (0, asyncHandler_1.asyncHandler)(courseController_1.markLessonAsCompleted));
/**
 * @route POST /api/courses/level/:levelId/complete
 * @description Mark a level as completed and generate certificate
 * @access Private
 */
router.post('/level/:levelId/complete', (0, asyncHandler_1.asyncHandler)(courseController_1.markLevelAsCompleted));
exports.default = router;
