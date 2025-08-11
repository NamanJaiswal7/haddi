"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
const authMiddleware_1 = require("../middleware/authMiddleware");
const asyncHandler_1 = require("../utils/asyncHandler");
const studentController_1 = require("../controllers/studentController");
const masterAdminController_1 = require("../controllers/masterAdminController");
const router = (0, express_1.Router)();
// All routes in this file require authentication
router.use((0, asyncHandler_1.asyncHandler)(authMiddleware_1.authenticateToken));
// Student dashboard and profile routes
router.get('/dashboard', (0, asyncHandler_1.asyncHandler)(studentController_1.getStudentDashboard));
router.get('/profile', (0, asyncHandler_1.asyncHandler)(studentController_1.getStudentProfile));
router.get('/learning-path', (0, asyncHandler_1.asyncHandler)(studentController_1.getStudentLearningPath));
router.get('/notifications', (0, asyncHandler_1.asyncHandler)(studentController_1.getStudentNotifications));
router.get('/notifications/count', (0, asyncHandler_1.asyncHandler)(studentController_1.getStudentNotificationCount));
router.get('/level-content', (0, asyncHandler_1.asyncHandler)(studentController_1.getStudentLevelContent));
router.post('/mark-watched', (0, asyncHandler_1.asyncHandler)(studentController_1.markVideoWatched));
router.post('/mark-pdf-read', (0, asyncHandler_1.asyncHandler)(studentController_1.markPdfRead));
// Event routes
router.get('/events/upcoming', (0, asyncHandler_1.asyncHandler)(studentController_1.getStudentUpcomingEvents));
router.get('/events/all', (0, asyncHandler_1.asyncHandler)(studentController_1.getStudentAllEvents));
// Quiz submission route
router.post('/submit-quiz', (0, asyncHandler_1.asyncHandler)(studentController_1.submitQuiz));
// Level schedules route (accessible to all authenticated users)
router.get('/level-schedules', (0, asyncHandler_1.asyncHandler)(masterAdminController_1.getLevelSchedules));
// Quiz validity route (for student's class)
router.get('/quiz-validity', (0, asyncHandler_1.asyncHandler)(studentController_1.getStudentQuizValidity));
// Random questions route (for student's level)
router.get('/level-content/random-questions', (0, asyncHandler_1.asyncHandler)(studentController_1.getStudentRandomQuestions));
exports.default = router;
