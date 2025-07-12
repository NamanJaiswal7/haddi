"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
const courseController_1 = require("../controllers/courseController");
const authMiddleware_1 = require("../middleware/authMiddleware");
const asyncHandler_1 = require("../utils/asyncHandler");
const router = (0, express_1.Router)();
// This route is available to any authenticated user
router.use((0, asyncHandler_1.asyncHandler)(authMiddleware_1.authenticateToken));
/**
 * @route GET /api/levels
 * @description Get all unique course levels
 * @access Private
 */
router.get('/', (0, asyncHandler_1.asyncHandler)(courseController_1.getCourseLevels));
exports.default = router;
