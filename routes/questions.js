const express = require('express');
const router = express.Router();
const {
  createQuestion,
  getQuestions,
  getQuestion,
  getTags,
  updateQuestion,
  deleteQuestion
} = require('../controllers/questionController');
const { protect } = require('../middleware/authMiddleware');

// All question routes require authentication
router.use(protect);

// Question routes
router.route('/')
  .post(createQuestion)
  .get(getQuestions);

router.get('/tags', getTags);
router.route('/:id')
  .get(getQuestion)
  .put(updateQuestion)
  .delete(deleteQuestion);

module.exports = router;