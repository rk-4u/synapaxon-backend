const express = require('express');
const router = express.Router();
const {
  submitQuestionAnswer,
  getTestQuestionAnswers,
  getStudentStats,
  getQuestionHistory,
  getTestSessionQuestions,
  getTotalQuestionsAnsweredCount
} = require('../controllers/studentQuestionController');
const { protect, ensureAdmin } = require('../middleware/authMiddleware');

// All routes require authentication
router.use(protect);

// Submit/update answer for a single question
router.post('/submit', submitQuestionAnswer);

// Get all answered questions for a specific test session
router.get('/test/:testSessionId', getTestQuestionAnswers);

// Get student statistics
router.get('/stats', getStudentStats);

// Get question history with support for subjects and topics arrays
router.get('/history', getQuestionHistory);

// Get test session questions with filter options
router.get('/history/:testSessionId', getTestSessionQuestions);

router.get('/total', protect, ensureAdmin, getTotalQuestionsAnsweredCount);


module.exports = router;