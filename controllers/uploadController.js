// uploadController.js
const cloudinary = require('cloudinary').v2;
const config = require('../config/config');

// Configure Cloudinary
cloudinary.config({
  cloud_name: config.CLOUDINARY_CLOUD_NAME,
  api_key: config.CLOUDINARY_API_KEY,
  api_secret: config.CLOUDINARY_API_SECRET
});

// @desc    Upload single media file
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

    // Upload to Cloudinary
    const result = await new Promise((resolve, reject) => {
      const stream = cloudinary.uploader.upload_stream(
        {
          resource_type: 'auto', // Detects file type (image, video, etc.)
          public_id: `uploads/${req.file.originalname.split('.')[0]}_${Date.now()}`,
          folder: 'synapaxon_uploads'
        },
        (error, result) => {
          if (error) return reject(error);
          resolve(result);
        }
      );
      stream.end(req.file.buffer);
    });

    // Map Cloudinary response to match existing format
    const fileData = {
      filename: result.public_id.split('/').pop(), // Extract filename from public_id
      originalname: req.file.originalname,
      mimetype: req.file.mimetype,
      size: result.bytes,
      path: result.secure_url // Use Cloudinary's secure URL
    };

    res.status(200).json({
      success: true,
      data: fileData
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Upload multiple media files
// @route   POST /api/uploads/multiple
// @access  Private
exports.uploadMultipleMedia = async (req, res, next) => {
  try {
    // Check if files were uploaded
    if (!req.files || req.files.length === 0) {
      return res.status(400).json({
        success: false,
        message: 'No files uploaded'
      });
    }

    // Process all uploaded files
    const uploadedFiles = await Promise.all(
      req.files.map(async (file) => {
        const result = await new Promise((resolve, reject) => {
          const stream = cloudinary.uploader.upload_stream(
            {
              resource_type: 'auto',
              public_id: `uploads/${file.originalname.split('.')[0]}_${Date.now()}`,
              folder: 'synapaxon_uploads'
            },
            (error, result) => {
              if (error) return reject(error);
              resolve(result);
            }
          );
          stream.end(file.buffer);
        });

        return {
          filename: result.public_id.split('/').pop(),
          originalname: file.originalname,
          mimetype: file.mimetype,
          size: result.bytes,
          path: result.secure_url
        };
      })
    );

    res.status(200).json({
      success: true,
      count: uploadedFiles.length,
      data: uploadedFiles
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
    const publicId = `synapaxon_uploads/${filename}`;

    // Delete file from Cloudinary
    await cloudinary.uploader.destroy(publicId, { resource_type: 'auto' });

    res.status(200).json({
      success: true,
      message: 'File deleted successfully'
    });
  } catch (error) {
    if (error.http_code === 404) {
      return res.status(404).json({
        success: false,
        message: 'File not found'
      });
    }
    next(error);
  }
};