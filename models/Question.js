const mongoose = require('mongoose');

const QuestionSchema = new mongoose.Schema(
  {
    questionText: {
      type: String,
      required: true,
    },
    explanation: {
      type: String,
      required: true,
    },
    options: {
      type: [String],
      required: true,
      validate: [arrayLimit, '{PATH} must have 4 options'],
    },
    correctAnswer: {
      type: Number,
      required: true,
      min: 0,
      max: 3,
    },
    difficulty: {
      type: String,
      enum: ['easy', 'medium', 'hard'],
      default: 'medium',
    },
    category: {
      type: String,
      required: true,
      enum: ['Basic Sciences', 'Organ Systems', 'Clinical Specialties'],
    },
    subject: {
      type: String,
      required: true,
    },
    topic: {
      type: String,
      required: true,
    },
    media: {
      type: {
        type: String, // 'video', 'pdf'
        enum: ['video', 'pdf', 'url'],
      },
      url: String,
    },
    tags: [String],
    sourceUrl: String, // optional external resource
    createdBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
    },
    approved: {
      type: Boolean,
      default: true,
    },
  },
  {
    timestamps: true, // auto adds createdAt, updatedAt
  }
);

function arrayLimit(val) {
  return val.length === 4;
}

module.exports = mongoose.model('Question', QuestionSchema);
