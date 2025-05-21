// models/Subject.js
const mongoose = require('mongoose');

const SubjectSchema = new mongoose.Schema({
  name: {
    type: String,
    required: [true, 'Please add a subject name'],
    trim: true
  },
  category: {
    type: mongoose.Schema.ObjectId,
    ref: 'Category',
    required: true
  },
  createdAt: {
    type: Date,
    default: Date.now
  }
});

// Create compound index for uniqueness - subject names can repeat but only in different categories
SubjectSchema.index({ name: 1, category: 1 }, { unique: true });

// Cascade delete topics when a subject is deleted
SubjectSchema.pre('remove', async function(next) {
  try {
    // Import the Topic model here to avoid circular dependencies
    const Topic = require('./Topic');
    await Topic.deleteMany({ subject: this._id });
    next();
  } catch (error) {
    next(error);
  }
});

module.exports = mongoose.model('Subject', SubjectSchema);