// TestSession.js - Model for student test sessions

const mongoose = require('mongoose');

const AnswerSchema = new mongoose.Schema({
  question: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Question',
    required: true
  },
  selectedAnswer: {
    type: Number,
    required: true,
    min: 0,
    max: 3
  },
  isCorrect: {
    type: Boolean,
    required: true
  }
});

const TestSessionSchema = new mongoose.Schema({
  student: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  questions: [{
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Question'
  }],
  answers: [AnswerSchema],
  filters: {
    tags: [String],
    difficulty: String,
    count: Number
  },
  score: {
    type: Number,
    default: 0
  },
  totalQuestions: {
    type: Number,
    required: true
  },
  completed: {
    type: Boolean,
    default: false
  },
  startedAt: {
    type: Date,
    default: Date.now
  },
  completedAt: {
    type: Date
  }
});

// Calculate score percentage
TestSessionSchema.virtual('scorePercentage').get(function() {
  if (this.totalQuestions === 0) return 0;
  return (this.score / this.totalQuestions) * 100;
});

// Configure to include virtuals when converting to JSON
TestSessionSchema.set('toJSON', { virtuals: true });
TestSessionSchema.set('toObject', { virtuals: true });

module.exports = mongoose.model('TestSession', TestSessionSchema);