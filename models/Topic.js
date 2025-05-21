// models/Topic.js
const mongoose = require('mongoose');

const TopicSchema = new mongoose.Schema({
  name: {
    type: String,
    required: [true, 'Please add a topic name'],
    trim: true
  },
  subject: {
    type: mongoose.Schema.ObjectId,
    ref: 'Subject',
    required: true
  },
  createdAt: {
    type: Date,
    default: Date.now
  }
});

// Create compound index for uniqueness - topic names can repeat but only in different subjects
TopicSchema.index({ name: 1, subject: 1 }, { unique: true });

module.exports = mongoose.model('Topic', TopicSchema);