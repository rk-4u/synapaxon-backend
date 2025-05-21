// StudentQuestion.js - Model for tracking individual question submissions by students

const mongoose = require('mongoose');

const StudentQuestionSchema = new mongoose.Schema({
  student: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  question: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Question',
    required: true
  },
  testSession: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'TestSession',
    required: true
  },
  selectedAnswer: {
    type: Number,
    default: -1,
    min: -1 // -1 means flagged/skipped
  },
  isCorrect: {
    type: Boolean,
    default: false
  },
  category: {
    type: String,
    required: true
  },
  subject: {
    type: String,
    required: true
  },
  topic: {
    type: String,
    required: true
  },
  answeredAt: {
    type: Date,
    default: Date.now
  },
  lastUpdatedAt: {
    type: Date,
    default: Date.now
  }
}, {
  timestamps: true
});

// Create a compound index to ensure uniqueness of student-question-testSession combination
StudentQuestionSchema.index({ student: 1, question: 1, testSession: 1 }, { unique: true });

// Additional indexes for efficient querying
StudentQuestionSchema.index({ student: 1, isCorrect: 1 });
StudentQuestionSchema.index({ student: 1, selectedAnswer: 1 });
StudentQuestionSchema.index({ testSession: 1 });

module.exports = mongoose.model('StudentQuestion', StudentQuestionSchema);