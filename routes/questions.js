const express = require('express');
const router = express.Router();
const {
  createQuestion,
  getQuestions,
  getQuestion,
  getTags,
  updateQuestion,
  deleteQuestion,
  getTotalQuestionsCount
} = require('../controllers/questionController');
const { protect, ensureAdmin } = require('../middleware/authMiddleware');

// All question routes require authentication
router.use(protect);

// Question routes
router.route('/')
  .post(createQuestion)
  .get(getQuestions);

// Get questions count by date (admin only)
router.get('/total', protect, ensureAdmin, getTotalQuestionsCount);

router.get('/tags', getTags);

router.route('/:id')
  .get(getQuestion)
  .put(updateQuestion)
  .delete(deleteQuestion);

module.exports = router;