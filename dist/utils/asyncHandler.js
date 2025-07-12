"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.asyncHandler = void 0;
const asyncHandler = (execution) => (req, res, next) => {
    execution(req, res, next).catch(next);
};
exports.asyncHandler = asyncHandler;
