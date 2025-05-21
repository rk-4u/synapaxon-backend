// models/Category.js
const mongoose = require('mongoose');

const CategorySchema = new mongoose.Schema({
  name: {
    type: String,
    required: [true, 'Please add a category name'],
    unique: true,
    trim: true
  },
  createdAt: {
    type: Date,
    default: Date.now
  }
});

// Cascade delete subjects when a category is deleted
CategorySchema.pre('remove', async function(next) {
  try {
    // Import the Subject model here to avoid circular dependencies
    const Subject = require('./Subject');
    await Subject.deleteMany({ category: this._id });
    next();
  } catch (error) {
    next(error);
  }
});

module.exports = mongoose.model('Category', CategorySchema);