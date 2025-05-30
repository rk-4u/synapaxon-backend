const User = require('../models/User');
const passport = require('passport');
const jwt = require('jsonwebtoken');
const config = require('../config/config');
const mongoose = require('mongoose');

// @desc    Register student
// @route   POST /api/auth/register
// @access  Public
exports.register = async (req, res, next) => {
  try {
    const { name, email, password } = req.body;

    const existingUser = await User.findOne({ email });
    if (existingUser) {
      return res.status(400).json({
        success: false,
        message: 'Email already registered'
      });
    }

    const user = await User.create({
      name,
      email,
      password,
      role: 'student'
    });

    sendTokenResponse(user, 201, res);
  } catch (error) {
    console.error('Error in register:', error);
    next(error);
  }
};

// @desc    Login user
// @route   POST /api/auth/login
// @access  Public
exports.login = async (req, res, next) => {
  try {
    const { email, password } = req.body;

    if (!email || !password) {
      return res.status(400).json({
        success: false,
        message: 'Please provide email and password'
      });
    }

    const user = await User.findOne({ email }).select('+password');
    if (!user) {
      return res.status(401).json({
        success: false,
        message: 'Invalid credentials'
      });
    }

    const isMatch = await user.matchPassword(password);
    if (!isMatch) {
      return res.status(401).json({
        success: false,
        message: 'Invalid credentials'
      });
    }

    sendTokenResponse(user, 200, res);
  } catch (error) {
    console.error('Error in login:', error);
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
    console.error('Error in getMe:', error);
    next(error);
  }
};

// @desc    Get all users (admin only)
// @route   GET /api/auth/users
// @access  Private/Admin
exports.getAllUsers = async (req, res, next) => {
  try {
    const users = await User.find().select('-password');
    res.status(200).json({
      success: true,
      count: users.length,
      data: users
    });
  } catch (error) {
    console.error('Error in getAllUsers:', error);
    next(error);
  }
};

// @desc    Update user plan and role (admin only)
// @route   PUT /api/auth/users/:id
// @access  Private/Admin
exports.updateUser = async (req, res, next) => {
  try {
    const { plan, role } = req.body;
    const { id } = req.params;

    if (!mongoose.Types.ObjectId.isValid(id)) {
      return res.status(400).json({
        success: false,
        message: 'Invalid user ID'
      });
    }

    if (!plan && !role) {
      return res.status(400).json({
        success: false,
        message: 'Please provide plan or role to update'
      });
    }

    const validPlans = ['free', 'pro', 'premium'];
    const validRoles = ['student', 'admin'];
    
    if (plan && !validPlans.includes(plan)) {
      return res.status(400).json({
        success: false,
        message: 'Invalid plan value'
      });
    }

    if (role && !validRoles.includes(role)) {
      return res.status(400).json({
        success: false,
        message: 'Invalid role value'
      });
    }

    const user = await User.findById(id);
    if (!user) {
      return res.status(404).json({
        success: false,
        message: 'User not found'
      });
    }

    if (plan) user.plan = plan;
    if (role) user.role = role;

    await user.save();

    res.status(200).json({
      success: true,
      data: {
        id: user._id,
        name: user.name,
        email: user.email,
        role: user.role,
        plan: user.plan
      }
    });
  } catch (error) {
    console.error('Error in updateUser:', error);
    next(error);
  }
};

// @desc    Delete user (admin only)
// @route   DELETE /api/auth/users/:id
// @access  Private/Admin
exports.deleteUser = async (req, res, next) => {
  try {
    const { id } = req.params;

    if (!mongoose.Types.ObjectId.isValid(id)) {
      return res.status(400).json({
        success: false,
        message: 'Invalid user ID'
      });
    }

    const user = await User.findById(id);
    if (!user) {
      return res.status(404).json({
        success: false,
        message: 'User not found'
      });
    }

    await user.deleteOne();

    res.status(200).json({
      success: true,
      message: 'User deleted successfully'
    });
  } catch (error) {
    console.error('Error in deleteUser:', error);
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



// @desc    Get total user count (admin only)
// @route   GET /api/auth/users/count
// @access  Private/Admin
exports.getUsersCount = async (req, res, next) => {
  try {
    const count = await User.countDocuments();
    res.status(200).json({
      success: true,
      count,
    });
  } catch (error) {
    console.error('Error in getUsersCount:', error);
    next(error);
  }
};


// @desc    Get users by plan (admin only)
// @route   GET /api/auth/users/plans
// @access  Private/Admin
exports.getUsersByPlans = async (req, res, next) => {
  try {
    const plans = await User.aggregate([
      {
        $group: {
          _id: '$plan',
          count: { $sum: 1 },
        },
      },
      {
        $project: {
          _id: 0,
          plan: '$_id',
          count: 1,
        },
      },
    ]);
    const result = plans.reduce((acc, { plan, count }) => ({ ...acc, [plan]: count }), {});
    res.status(200).json({
      success: true,
      data: result,
    });
  } catch (error) {
    console.error('Error in getUsersByPlans:', error);
    next(error);
  }
};