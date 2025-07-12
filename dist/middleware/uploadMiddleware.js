"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.upload = void 0;
const multer_1 = __importDefault(require("multer"));
// Configure multer for memory storage, which is ideal for processing files
// before saving them permanently (e.g., parsing an Excel file).
const storage = multer_1.default.memoryStorage();
// We can add file type filters if needed, for now we'll accept any file.
// For example, to accept only PDFs:
/*
const fileFilter = (req, file, cb) => {
    if (file.mimetype === 'application/pdf') {
        cb(null, true);
    } else {
        cb(new Error('Not a PDF file!'), false);
    }
};
*/
exports.upload = (0, multer_1.default)({
    storage: storage,
    // limits: { fileSize: 1024 * 1024 * 5 } // e.g., 5MB limit
    // fileFilter: fileFilter 
});
