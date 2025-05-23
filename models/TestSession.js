const mongoose = require('mongoose');

const TestSessionSchema = new mongoose.Schema({
  student: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  questions: [{
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Question',
    required: true
  }],
  totalQuestions: {
    type: Number,
    required: true
  },
  totalOptions: {
    type: Number,
    required: true,
    default: 0
  },
  correctAnswers: {
    type: Number,
    default: 0
  },
  incorrectAnswers: {
    type: Number,
    default: 0
  },
  flaggedAnswers: {
    type: Number,
    default: 0
  },
  filters: {
    difficulty: String,
    count: Number
  },
  status: {
    type: String,
    enum: ['proceeding', 'succeeded', 'canceled'],
    default: 'proceeding'
  },
  startedAt: {
    type: Date,
    default: Date.now,
    immutable: true
  },
  completedAt: {
    type: Date
  }
}, {
  timestamps: true
});

// Prevent updates to completed or canceled sessions
TestSessionSchema.pre('findOneAndUpdate', async function(next) {
  const doc = await this.model.findOne(this.getQuery());
  if (doc && ['succeeded', 'canceled'].includes(doc.status)) {
    throw new Error('Cannot update a completed or canceled test session');
  }
  next();
});

// Calculate score percentage
TestSessionSchema.virtual('scorePercentage').get(function() {
  if (this.totalQuestions === 0) return 0;
  return (this.correctAnswers / this.totalQuestions) * 100;
});

// Configure to include virtuals
TestSessionSchema.set('toJSON', { virtuals: true });
TestSessionSchema.set('toObject', { virtuals: true });

// Indexes for efficient querying
TestSessionSchema.index({ student: 1 });
TestSessionSchema.index({ status: 1 });

module.exports = mongoose.model('TestSession', TestSessionSchema);