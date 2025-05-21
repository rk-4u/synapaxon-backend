// routes/categories.js
const express = require('express');
const {
  getCategories,
  getCategory,
  createCategory,
  updateCategory,
  deleteCategory
} = require('../controllers/categoryController');

const { protect } = require('../middleware/authMiddleware');

const router = express.Router();

// Set up routes
router
  .route('/')
  .get(getCategories)
  .post(protect, createCategory);

router
  .route('/:id')
  .get(getCategory)
  .put(protect, updateCategory)
  .delete(protect, deleteCategory);

module.exports = router;