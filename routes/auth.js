const express = require('express');
const router = express.Router();
const { register, login, getMe, googleAuth, googleAuthCallback } = require('../controllers/authController');
const { protect } = require('../middleware/authMiddleware');

// Register and login routes
router.post('/register', register);
router.post('/login', login);

// Google authentication routes
router.get('/google', googleAuth);
router.get('/google/callback', googleAuthCallback);

// Protected routes
router.get('/me', protect, getMe);

module.exports = router;