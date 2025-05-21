// studentQuestionController.js - Controller for tracking individual question submissions

const Question = require('../models/Question');
const TestSession = require('../models/TestSession');
const StudentQuestion = require('../models/StudentQuestion');

// @desc    Submit/update answer for a specific question in a test session
// @route   POST /api/student-questions/submit
// @access  Private
exports.submitQuestionAnswer = async (req, res, next) => {
  try {
    const { testSessionId, questionId, selectedAnswer } = req.body;

    // Validate required fields
    if (!testSessionId || !questionId || selectedAnswer === undefined) {
      return res.status(400).json({
        success: false,
        message: 'Please provide testSessionId, questionId, and selectedAnswer'
      });
    }

    // Find the test session
    const testSession = await TestSession.findById(testSessionId);
    if (!testSession) {
      return res.status(404).json({
        success: false,
        message: 'Test session not found'
      });
    }

    // Verify the user owns this test session
    if (testSession.student.toString() !== req.user._id.toString()) {
      return res.status(403).json({
        success: false,
        message: 'Not authorized to submit answers for this test'
      });
    }

    // Check if the test is already completed
    if (testSession.completed) {
      return res.status(400).json({
        success: false,
        message: 'Cannot update answers for a completed test'
      });
    }

    // Verify the question exists and belongs to this test session
    if (!testSession.questions.includes(questionId)) {
      return res.status(400).json({
        success: false,
        message: 'Question does not belong to this test session'
      });
    }

    // Get question details to validate answer and get metadata
    const question = await Question.findById(questionId);
    if (!question) {
      return res.status(404).json({
        success: false,
        message: 'Question not found'
      });
    }

    // If selectedAnswer is not -1 (skipped), validate it's within range
    let isCorrect = false;
    if (selectedAnswer !== -1) {
      if (selectedAnswer < 0 || selectedAnswer >= question.options.length) {
        return res.status(400).json({
          success: false,
          message: 'Invalid selectedAnswer value'
        });
      }
      
      // Check if answer is correct
      isCorrect = (selectedAnswer === question.correctAnswer);
    }

    // Find existing submission or create new one
    const studentQuestion = await StudentQuestion.findOneAndUpdate(
      { 
        student: req.user._id, 
        question: questionId, 
        testSession: testSessionId 
      },
      {
        selectedAnswer,
        isCorrect,
        category: question.category,
        subject: question.subject,
        topic: question.topic,
        lastUpdatedAt: Date.now()
      },
      { 
        new: true, 
        upsert: true,
        setDefaultsOnInsert: true
      }
    );

    res.status(200).json({
      success: true,
      data: {
        id: studentQuestion._id,
        isCorrect,
        selectedAnswer,
        // Don't return correctAnswer here to prevent cheating
      }
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Get all answered questions for a test session
// @route   GET /api/student-questions/test/:testSessionId
// @access  Private
exports.getTestQuestionAnswers = async (req, res, next) => {
  try {
    const { testSessionId } = req.params;

    // Validate testSessionId
    if (!testSessionId) {
      return res.status(400).json({
        success: false,
        message: 'Please provide testSessionId'
      });
    }

    // Check if test session exists and belongs to this user
    const testSession = await TestSession.findById(testSessionId);
    if (!testSession) {
      return res.status(404).json({
        success: false,
        message: 'Test session not found'
      });
    }

    if (testSession.student.toString() !== req.user._id.toString()) {
      return res.status(403).json({
        success: false,
        message: 'Not authorized to access this test session'
      });
    }

    // Get all answered questions for this test session
    const studentQuestions = await StudentQuestion.find({
      student: req.user._id,
      testSession: testSessionId
    }).select('question selectedAnswer isCorrect category subject topic');

    res.status(200).json({
      success: true,
      count: studentQuestions.length,
      data: studentQuestions
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Get answer statistics for a student
// @route   GET /api/student-questions/stats
// @access  Private
exports.getStudentStats = async (req, res, next) => {
  try {
    const { category, subject, topic } = req.query;
    
    // Build filter criteria
    const filter = { student: req.user._id };
    
    if (category) filter.category = category;
    if (subject) filter.subject = subject;
    if (topic) filter.topic = topic;

    // Get overall stats
    const totalAnswered = await StudentQuestion.countDocuments({
      ...filter,
      selectedAnswer: { $ne: -1 } // Exclude flagged/skipped questions
    });
    
    const correctAnswers = await StudentQuestion.countDocuments({
      ...filter,
      isCorrect: true
    });
    
    const flaggedQuestions = await StudentQuestion.countDocuments({
      ...filter,
      selectedAnswer: -1
    });

    // Get stats by category
    const categoryStats = await StudentQuestion.aggregate([
      { $match: { student: req.user._id, selectedAnswer: { $ne: -1 } } },
      { $group: {
          _id: "$category",
          total: { $sum: 1 },
          correct: { $sum: { $cond: ["$isCorrect", 1, 0] } }
        }
      },
      { $project: {
          category: "$_id",
          total: 1,
          correct: 1,
          percentage: { 
            $cond: [
              { $eq: ["$total", 0] },
              0,
              { $multiply: [{ $divide: ["$correct", "$total"] }, 100] }
            ]
          }
        }
      },
      { $sort: { category: 1 } }
    ]);

    res.status(200).json({
      success: true,
      data: {
        totalAnswered,
        correctAnswers,
        flaggedQuestions,
        accuracy: totalAnswered > 0 ? (correctAnswers / totalAnswered * 100) : 0,
        categoryStats
      }
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Get detailed question answer history for a student
// @route   GET /api/student-questions/history
// @access  Private
exports.getQuestionHistory = async (req, res, next) => {
  try {
    const page = parseInt(req.query.page, 10) || 1;
    const limit = parseInt(req.query.limit, 10) || 20;
    const skip = (page - 1) * limit;
    
    // Build filter
    const filter = { student: req.user._id };
    
    // Apply filters if provided
    if (req.query.category) filter.category = req.query.category;
    if (req.query.subject) filter.subject = req.query.subject;
    if (req.query.topic) filter.topic = req.query.topic;
    if (req.query.isCorrect === 'true') filter.isCorrect = true;
    if (req.query.isCorrect === 'false') filter.isCorrect = false;
    if (req.query.flagged === 'true') filter.selectedAnswer = -1;
    if (req.query.testSession) filter.testSession = req.query.testSession;

    // Get total count
    const total = await StudentQuestion.countDocuments(filter);
    
    // Get question history with pagination
    const history = await StudentQuestion.find(filter)
      .populate({
        path: 'question',
        select: 'questionText options'
      })
      .populate({
        path: 'testSession',
        select: 'startedAt'
      })
      .select('selectedAnswer isCorrect category subject topic answeredAt lastUpdatedAt')
      .sort({ lastUpdatedAt: -1 })
      .skip(skip)
      .limit(limit);
    
    res.status(200).json({
      success: true,
      count: history.length,
      total,
      pagination: {
        current: page,
        pages: Math.ceil(total / limit)
      },
      data: history
    });
  } catch (error) {
    next(error);
  }
};

// Add this function to studentQuestionController.js

// @desc    Get questions for a specific test session with filtering options
// @route   GET /api/student-questions/history/:testSessionId
// @access  Private
exports.getTestSessionQuestions = async (req, res, next) => {
  try {
    const { testSessionId } = req.params;
    const { filter } = req.query;
    
    // Validate testSessionId
    if (!testSessionId) {
      return res.status(400).json({
        success: false,
        message: 'Please provide testSessionId'
      });
    }
    
    // Check if test session exists and belongs to this user
    const testSession = await TestSession.findById(testSessionId);
    if (!testSession) {
      return res.status(404).json({
        success: false,
        message: 'Test session not found'
      });
    }
    
    if (testSession.student.toString() !== req.user._id.toString()) {
      return res.status(403).json({
        success: false,
        message: 'Not authorized to access this test session'
      });
    }
    
    // Build query
    const query = { 
      student: req.user._id,
      testSession: testSessionId
    };
    
    // Apply filter if provided
    if (filter === 'incorrect') {
      query.isCorrect = false;
      query.selectedAnswer = { $ne: -1 }; // Exclude flagged/skipped questions
    } else if (filter === 'correct') {
      query.isCorrect = true;
    } else if (filter === 'flagged') {
      query.selectedAnswer = -1; // Only include flagged/skipped questions
    }
    
    // Add pagination
    const page = parseInt(req.query.page, 10) || 1;
    const limit = parseInt(req.query.limit, 10) || 20;
    const skip = (page - 1) * limit;
    
    // Get total count
    const total = await StudentQuestion.countDocuments(query);
    
    // Get filtered questions
    const questions = await StudentQuestion.find(query)
      .populate({
        path: 'question',
        select: 'questionText options correctAnswer explanation category subject topic difficulty'
      })
      .select('selectedAnswer isCorrect answeredAt lastUpdatedAt')
      .sort({ lastUpdatedAt: -1 })
      .skip(skip)
      .limit(limit);
    
    res.status(200).json({
      success: true,
      count: questions.length,
      total,
      pagination: {
        current: page,
        pages: Math.ceil(total / limit)
      },
      data: questions
    });
  } catch (error) {
    next(error);
  }
};