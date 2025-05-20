// uploadMiddleware.js - Middleware for handling file uploads
const multer = require('multer');
const path = require('path');
const fs = require('fs');
const crypto = require('crypto');

// Ensure uploads directory exists
const uploadDir = path.join(__dirname, '../uploads');
if (!fs.existsSync(uploadDir)) {
  fs.mkdirSync(uploadDir, { recursive: true });
}

// Configure storage
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    cb(null, uploadDir);
  },
  filename: (req, file, cb) => {
    // Generate unique filename with original extension
    const fileExt = path.extname(file.originalname);
    const fileName = crypto.randomBytes(16).toString('hex') + fileExt;
    cb(null, fileName);
  }
});

// Filter files by type
const fileFilter = (req, file, cb) => {
  // Define allowed mime types
  const allowedMimeTypes = [
    // Images
    'image/jpeg', 
    'image/png', 
    'image/gif', 
    'image/svg+xml',
    
    // Videos
    'video/mp4', 
    'video/webm', 
    'video/ogg',
    
    // Documents
    'application/pdf',
    'application/msword',
    'application/vnd.openxmlformats-officedocument.wordprocessingml.document', // docx
    'application/vnd.ms-excel',
    'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet', // xlsx
    'application/vnd.ms-powerpoint',
    'application/vnd.openxmlformats-officedocument.presentationml.presentation', // pptx
    
    // Text
    'text/plain',
    'text/csv'
  ];

  if (allowedMimeTypes.includes(file.mimetype)) {
    cb(null, true);
  } else {
    cb(new Error('Invalid file type. Only images, videos, and documents are allowed.'), false);
  }
};

// Configure multer
const upload = multer({
  storage: storage,
  fileFilter: fileFilter,
  limits: {
    fileSize: 50 * 1024 * 1024, // 50MB max size
  }
});

module.exports = upload;