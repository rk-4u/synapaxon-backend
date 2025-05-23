const express = require('express');
const router = express.Router();
const { createTestSession, getTestSessions, getTestSessionById, updateTestSessionStatus } = require('../controllers/testSessionController');
const { protect } = require('../middleware/authMiddleware');

// All routes require authentication
router.use(protect);

// Test session routes
router.post('/', createTestSession);
router.get('/', getTestSessions);
router.get('/:testSessionId', getTestSessionById);
router.put('/:testSessionId', updateTestSessionStatus);

module.exports = router;