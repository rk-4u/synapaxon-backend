// uploadController.js - New controller for file uploads
const fs = require('fs');
const path = require('path');

// @desc    Upload media file
// @route   POST /api/uploads
// @access  Private
exports.uploadMedia = async (req, res, next) => {
  try {
    // Check if file was uploaded
    if (!req.file) {
      return res.status(400).json({
        success: false,
        message: 'No file uploaded'
      });
    }

    // Return file information
    res.status(200).json({
      success: true,
      data: {
        filename: req.file.filename,
        originalname: req.file.originalname,
        mimetype: req.file.mimetype,
        size: req.file.size,
        path: `/uploads/${req.file.filename}` // URL path to access the file
      }
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Delete uploaded file
// @route   DELETE /api/uploads/:filename
// @access  Private
exports.deleteMedia = async (req, res, next) => {
  try {
    const filename = req.params.filename;
    const filePath = path.join(__dirname, '../uploads', filename);

    // Check if file exists
    if (!fs.existsSync(filePath)) {
      return res.status(404).json({
        success: false,
        message: 'File not found'
      });
    }

    // Delete file
    fs.unlinkSync(filePath);

    res.status(200).json({
      success: true,
      message: 'File deleted successfully'
    });
  } catch (error) {
    next(error);
  }
};