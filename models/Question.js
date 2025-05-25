const mongoose = require('mongoose');

const mediaSchema = new mongoose.Schema({
  type: {
    type: String,
    enum: ['image', 'video', 'application', 'url'],
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
questionSchema.index({ 'subjects.name': 1 }); // Index only on subjects.name

// Ensure correctAnswer is valid
questionSchema.pre('validate', function(next) {
  if (this.options && (this.correctAnswer < 0 || this.correctAnswer >= this.options.length)) {
    next(new Error('Correct answer index is out of range'));
  } else {
    next();
  }
});

module.exports = mongoose.model('Question', questionSchema);