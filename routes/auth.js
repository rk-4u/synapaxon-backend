const express = require('express');
const router = express.Router();
const { register, login, getMe, googleAuth, googleAuthCallback, getAllUsers, updateUser, deleteUser, getUsersCount , getUsersByPlans} = require('../controllers/authController');
const { protect, ensureAdmin } = require('../middleware/authMiddleware');

// Register and login routes
router.post('/register', register);
router.post('/login', login);

// Google authentication routes
router.get('/google', googleAuth);
router.get('/google/callback', googleAuthCallback);

// Protected routes
router.get('/me', protect, getMe);

// Admin routes
router.get('/users', protect, ensureAdmin, getAllUsers);
router.put('/users/:id', protect, ensureAdmin, updateUser);
router.delete('/users/:id', protect, ensureAdmin, deleteUser);
router.get('/users/count', protect, ensureAdmin, getUsersCount);
router.get('/users/plans', protect, ensureAdmin, getUsersByPlans);

module.exports = router;