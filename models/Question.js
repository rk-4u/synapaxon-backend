const mongoose = require('mongoose');

// Media schema for reusability
const MediaSchema = new mongoose.Schema({
  filename: String,     // Generated filename in the filesystem
  originalname: String, // Original filename uploaded by the user
  mimetype: String,     // MIME type of the file
  size: Number,         // File size in bytes
  path: String          // URL path to access the file
}, { _id: false });

// Option schema with media support
const OptionSchema = new mongoose.Schema({
  text: {
    type: String,
    required: [true, 'Option text is required']
  },
  media: {
    type: [MediaSchema], // Changed to array to support multiple media
    default: []          // Default to empty array
  }
}, { _id: false });

const QuestionSchema = new mongoose.Schema({
  questionText: {
    type: String,
    required: [true, 'Question text is required']
  },
  // Media for the question itself
  questionMedia: {
    type: [MediaSchema], // Changed to array to support multiple media
    default: []          // Default to empty array
  },
  // Enhanced options with media support
  options: {
    type: [OptionSchema],  // Using the option schema defined above
    validate: {
      validator: function(v) {
        // Optional: minimum of 0 options is allowed
        return Array.isArray(v);
      },
      message: 'Options must be an array'
    },
    default: []  // Default to an empty array
  },
  correctAnswer: {
    type: Number,
    validate: {
      validator: function(value) {
        // Only validate if there are options
        return this.options.length === 0 || (value >= 0 && value < this.options.length);
      },
      message: 'Correct answer must be a valid option index'
    },
    // Optional if there are no options
    required: function() {
      return this.options.length > 0;
    }
  },
  explanation: {
    type: String,
    required: [true, 'Explanation is required']
  },
  // Media for the explanation (already updated)
  explanationMedia: {
    type: [MediaSchema],
    default: []
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
    default: ''
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
  // Legacy media field - maintained for backward compatibility
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