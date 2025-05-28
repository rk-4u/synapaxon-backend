// Question.js
const mongoose = require('mongoose');

const mediaSchema = new mongoose.Schema({
  type: {
    type: String,
    enum: ['image', 'video', 'raw', 'url'], // Add 'raw' for non-image/video files (e.g., PDF)
    required: true
  },
  path: {
    type: String,
    required: true
  },
  filename: {
    type: String,
    required: true
  },
  originalname: {
    type: String,
    required: true
  },
  mimetype: {
    type: String,
    required: true
  },
  size: {
    type: Number,
    required: function() { return this.mimetype !== 'text/url'; }
  }
});

// Helper to map Cloudinary resource_type to mediaSchema type
const mapCloudinaryType = (resourceType) => {
  if (resourceType === 'image') return 'image';
  if (resourceType === 'video') return 'video';
  if (resourceType === 'raw') return 'raw';
  return 'url';
};

// Update media validation in questionSchema
const optionSchema = new mongoose.Schema({
  text: {
    type: String,
    required: true,
    trim: true
  },
  media: [mediaSchema]
});

const questionSchema = new mongoose.Schema({
  questionText: {
    type: String,
    required: true,
    trim: true
  },
  questionMedia: [mediaSchema],
  options: {
    type: [optionSchema],
    required: true,
    validate: {
      validator: function(arr) {
        return arr.length >= 2;
      },
      message: 'At least two options are required'
    }
  },
  correctAnswer: {
    type: Number,
    required: true,
    min: 0
  },
  explanation: {
    type: String,
    required: true,
    trim: true
  },
  explanationMedia: [mediaSchema],
  category: {
    type: String,
    required: true,
    enum: ['Basic Sciences', 'Organ Systems', 'Clinical Specialties']
  },
  subjects: [{
    name: {
      type: String,
      required: true,
      trim: true
    },
    topics: [{
      type: String,
      trim: true
    }]
  }],
  difficulty: {
    type: String,
    required: true,
    enum: ['easy', 'medium', 'hard'],
    default: 'medium'
  },
  tags: [{
    type: String,
    trim: true
  }],
  sourceUrl: {
    type: String,
    trim: true
  },
  createdBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  approved: {
    type: Boolean,
    default: false
  }
}, {
  timestamps: true
});

// Indexes
questionSchema.index({ createdBy: 1 });
questionSchema.index({ category: 1 });
questionSchema.index({ 'subjects.name': 1 });

// Ensure correctAnswer is valid
questionSchema.pre('validate', function(next) {
  if (this.options && (this.correctAnswer < 0 || this.correctAnswer >= this.options.length)) {
    next(new Error('Correct answer index is out of range'));
  } else {
    next();
  }
});




// Question.js
// ... Existing imports and schemas ...

// Delete associated media files from Cloudinary before deleting the question
questionSchema.pre('deleteOne', { document: true, query: false }, async function(next) {
  try {
    const cloudinary = require('cloudinary').v2;
    const config = require('../config/config');
    
    cloudinary.config({
      cloud_name: config.CLOUDINARY_CLOUD_NAME,
      api_key: config.CLOUDINARY_API_KEY,
      api_secret: config.CLOUDINARY_API_SECRET
    });

    // Collect all media public IDs
    const mediaToDelete = [
      ...this.questionMedia,
      ...this.explanationMedia,
      ...this.options.flatMap(option => option.media)
    ].map(media => `synapaxon_uploads/${media.filename}`);

    if (mediaToDelete.length > 0) {
      await Promise.all(
        mediaToDelete.map(publicId =>
          cloudinary.uploader.destroy(publicId, { resource_type: 'auto' })
        )
      );
    }
    next();
  } catch (error) {
    next(error);
  }
});

module.exports = mongoose.model('Question', questionSchema);