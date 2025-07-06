import multer from 'multer';

// Configure multer for memory storage, which is ideal for processing files
// before saving them permanently (e.g., parsing an Excel file).
const storage = multer.memoryStorage();

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

export const upload = multer({ 
    storage: storage,
    // limits: { fileSize: 1024 * 1024 * 5 } // e.g., 5MB limit
    // fileFilter: fileFilter 
}); 