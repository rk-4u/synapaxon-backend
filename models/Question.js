// Question.js - Updated Question model
const mongoose = require('mongoose');

const QuestionSchema = new mongoose.Schema({
  questionText: {
    type: String,
    required: [true, 'Question text is required']
  },
  options: {
    type: [String],
    validate: {
      validator: function(v) {
        return Array.isArray(v) && v.length >= 2;
      },
      message: 'At least 2 options are required'
    },
    required: [true, 'Options are required']
  },
  correctAnswer: {
    type: Number,
    required: [true, 'Correct answer is required'],
    validate: {
      validator: function(value) {
        return value >= 0 && value < this.options.length;
      },
      message: 'Correct answer must be a valid option index'
    }
  },
  explanation: {
    type: String,
    required: [true, 'Explanation is required']
  },
  category: {
    type: String,
    required: [true, 'Category is required']
  },
  subject: {
    type: String,
    required: [true, 'Subject is required']
  },
  topic: {
    type: String,
    default: []
  },
  difficulty: {
    type: String,
    enum: ['easy', 'medium', 'hard'],
    required: [true, 'Difficulty is required']
  },
  tags: {
    type: [String],
    default: []
  },
  media: {
    type: mongoose.Schema.Types.Mixed,
    default: null
  },
  sourceUrl: {
    type: String,
    default: ''
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

// Index for searching
QuestionSchema.index({ category: 1, subject: 1, topic: 1 });
QuestionSchema.index({ tags: 1 });
QuestionSchema.index({ difficulty: 1 });

module.exports = mongoose.model('Question', QuestionSchema);