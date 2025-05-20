// uploads.js - New file for upload routes
const express = require('express');
const router = express.Router();
const { uploadMedia, deleteMedia } = require('../controllers/uploadController');
const { protect } = require('../middleware/authMiddleware');
const uploadMiddleware = require('../middleware/uploadMiddleware');

// All routes require authentication
router.use(protect);

// Upload media file
router.post('/', uploadMiddleware.single('media'), uploadMedia);

// Delete uploaded file
router.delete('/:filename', deleteMedia);

module.exports = router;