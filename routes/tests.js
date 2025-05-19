// tests.js - Test routes

const express = require('express');
const router = express.Router();
const {
  startTest,
  submitTest,
  getTestHistory,
  getTestResult
} = require('../controllers/testController');
const { protect } = require('../middleware/authMiddleware');

// All test routes require authentication
router.use(protect);

// Test routes
router.post('/start', startTest);
router.post('/submit', submitTest);
router.get('/history', getTestHistory);
router.get('/:id', getTestResult);

module.exports = router;