// studentQuestions.js - Updated routes file with the new endpoint

const express = require('express');
const router = express.Router();
const {
  submitQuestionAnswer,
  getTestQuestionAnswers,
  getStudentStats,
  getQuestionHistory,
  getTestSessionQuestions // Add the new controller function
} = require('../controllers/studentQuestionController');
const { protect } = require('../middleware/authMiddleware');

// All routes require authentication
router.use(protect);

// Submit/update answer for a single question
router.post('/submit', submitQuestionAnswer);

// Get all answered questions for a specific test session
router.get('/test/:testSessionId', getTestQuestionAnswers);

// Get student statistics
router.get('/stats', getStudentStats);

// Get question history
router.get('/history', getQuestionHistory);

// Get test session questions with filter options (new endpoint)
router.get('/history/:testSessionId', getTestSessionQuestions);

module.exports = router;