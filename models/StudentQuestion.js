const mongoose = require('mongoose');

const MediaSchema = new mongoose.Schema({
  filename: String,
  originalname: String,
  mimetype: String,
  size: Number,
  path: String
});

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
  options: [{
    text: {
      type: String,
      required: true
    },
    media: [MediaSchema] // Changed to array to support multiple media
  }],
  correctAnswer: {
    type: Number,
    required: function() {
      return this.options.length > 0;
    },
    validate: {
      validator: function(value) {
        return this.options.length === 0 || (value >= 0 && value < this.options.length);
      },
      message: 'Correct answer must be a valid option index'
    }
  },
  selectedAnswer: {
    type: Number,
    default: -1, // -1 means flagged/skipped
    min: -1
  },
  isCorrect: {
    type: Boolean,
    default: false
  },
  explanation: {
    type: String,
    required: true
  },
  explanationMedia: [MediaSchema], // Changed to array to support multiple media
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
    default: ''
  },
  answeredAt: {
    type: Date,
    default: Date.now,
    immutable: true
  },
  lastUpdatedAt: {
    type: Date,
    default: Date.now
  }
}, {
  timestamps: true
});

// Create a compound index for uniqueness
StudentQuestionSchema.index({ student: 1, question: 1, testSession: 1 }, { unique: true });

// Additional indexes for efficient querying
StudentQuestionSchema.index({ student: 1, isCorrect: 1 });
StudentQuestionSchema.index({ student: 1, selectedAnswer: 1 });
StudentQuestionSchema.index({ testSession: 1 });
StudentQuestionSchema.index({ category: 1, subject: 1, topic: 1 });

module.exports = mongoose.model('StudentQuestion', StudentQuestionSchema);