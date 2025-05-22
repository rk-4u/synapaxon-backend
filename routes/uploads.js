// uploads.js - Enhanced routes for upload functionality
const express = require('express');
const router = express.Router();
const { 
  uploadMedia, 
  uploadMultipleMedia, 
  deleteMedia 
} = require('../controllers/uploadController');
const { protect } = require('../middleware/authMiddleware');
const uploadMiddleware = require('../middleware/uploadMiddleware');

// All routes require authentication
router.use(protect);

// Upload single media file
router.post('/', uploadMiddleware.single('media'), uploadMedia);

// Upload multiple media files
router.post('/multiple', uploadMiddleware.array('media', 10), uploadMultipleMedia);

// Delete uploaded file
router.delete('/:filename', deleteMedia);

module.exports = router;