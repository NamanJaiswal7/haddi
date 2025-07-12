"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
const districtController_1 = require("../controllers/districtController");
const asyncHandler_1 = require("../utils/asyncHandler");
const router = (0, express_1.Router)();
/**
 * @route GET /api/districts
 * @description Get a list of all districts
 * @access Private
 */
router.get('/', (0, asyncHandler_1.asyncHandler)(districtController_1.getAllDistricts));
exports.default = router;
