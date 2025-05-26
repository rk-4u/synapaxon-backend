// authController.js
const User = require('../models/User');
const passport = require('passport');
const jwt = require('jsonwebtoken');
const config = require('../config/config');

// @desc    Register student
// @route   POST /api/auth/register
// @access  Public
exports.register = async (req, res, next) => {
  try {
    const { name, email, password } = req.body;

    // Check if user already exists
    const existingUser = await User.findOne({ email });
    if (existingUser) {
      return res.status(400).json({
        success: false,
        message: 'Email already registered'
      });
    }

    // Create user
    const user = await User.create({
      name,
      email,
      password,
      role: 'student' // Enforce student role
    });

    // Generate JWT token
    sendTokenResponse(user, 201, res);
  } catch (error) {
    next(error);
  }
};

// @desc    Login user
// @route   POST /api/auth/login
// @access  Public
exports.login = async (req, res, next) => {
  try {
    const { email, password } = req.body;

    // Validate email & password
    if (!email || !password) {
      return res.status(400).json({
        success: false,
        message: 'Please provide email and password'
      });
    }

    // Check for user
    const user = await User.findOne({ email }).select('+password');
    if (!user) {
      return res.status(401).json({
        success: false,
        message: 'Invalid credentials'
      });
    }

    // Check if password matches
    const isMatch = await user.matchPassword(password);
    if (!isMatch) {
      return res.status(401).json({
        success: false,
        message: 'Invalid credentials'
      });
    }

    // Generate JWT token
    sendTokenResponse(user, 200, res);
  } catch (error) {
    next(error);
  }
};

// @desc    Get current logged in user
// @route   GET /api/auth/me
// @access  Private
exports.getMe = async (req, res, next) => {
  try {
    const user = await User.findById(req.user.id);
    res.status(200).json({
      success: true,
      data: user
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Initiate Google authentication
// @route   GET /api/auth/google
// @access  Public
exports.googleAuth = passport.authenticate('google', {
  scope: ['profile', 'email']
});

// @desc    Google authentication callback
// @route   GET /api/auth/google/callback
// @access  Public
exports.googleAuthCallback = (req, res, next) => {
  passport.authenticate('google', { session: false }, (err, user) => {
    if (err || !user) {
      return res.status(400).json({
        success: false,
        message: 'Google authentication failed'
      });
    }

    const token = jwt.sign({ id: user._id }, config.JWT_SECRET, { expiresIn: '1d' });
    const redirectUrl = `${
      process.env.FRONTEND_URL || 'http://localhost:5173'
    }/auth/callback?token=${token}&id=${user._id}&name=${encodeURIComponent(
      user.name
    )}&email=${encodeURIComponent(user.email)}&role=${user.role}&plan=${
      user.plan
    }`;
    res.redirect(redirectUrl);
  })(req, res, next);
};

// Helper function to get token from model and send response
const sendTokenResponse = (user, statusCode, res) => {
  const token = user.getSignedJwtToken();

  const responseData = {
    success: true,
    token,
    user: {
      id: user._id,
      name: user.name,
      email: user.email,
      role: user.role,
      plan: user.plan
    }
  };

  res.status(statusCode).json(responseData);
};