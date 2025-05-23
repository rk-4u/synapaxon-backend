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

    // Verify user owns this test session
    if (testSession.student.toString() !== req.user._id.toString()) {
      return res.status(403).json({
        success: false,
        message: 'Not authorized to submit answers for this test'
      });
    }

    // Check if test is completed or canceled
    if (['succeeded', 'canceled'].includes(testSession.status)) {
      return res.status(400).json({
        success: false,
        message: 'Cannot update answers for a completed or canceled test'
      });
    }

    // Verify question exists and belongs to this test session
    if (!testSession.questions.includes(questionId)) {
      return res.status(400).json({
        success: false,
        message: 'Question does not belong to this test session'
      });
    }

    // Get question details
    const question = await Question.findById(questionId);
    if (!question) {
      return res.status(404).json({
        success: false,
        message: 'Question not found'
      });
    }

    // Validate selectedAnswer
    let isCorrect = false;
    if (selectedAnswer !== -1) {
      if (selectedAnswer < 0 || selectedAnswer >= question.options.length) {
        return res.status(400).json({
          success: false,
          message: 'Invalid selectedAnswer value'
        });
      }
      isCorrect = (selectedAnswer === question.correctAnswer);
    }

    // Update test session counters
    const existingSubmission = await StudentQuestion.findOne({
      student: req.user._id,
      question: questionId,
      testSession: testSessionId
    });

    const update = {
      selectedAnswer,
      isCorrect,
      options: question.options,
      correctAnswer: question.correctAnswer,
      explanation: question.explanation,
      explanationMedia: question.explanationMedia,
      category: question.category,
      subject: question.subject,
      topic: question.topic,
      lastUpdatedAt: Date.now()
    };

    if (!existingSubmission) {
      update.answeredAt = Date.now();
    }

    // Update or create submission
    const studentQuestion = await StudentQuestion.findOneAndUpdate(
      { student: req.user._id, question: questionId, testSession: testSessionId },
      update,
      { new: true, upsert: true, setDefaultsOnInsert: true }
    );

    // Update test session counters
    const studentQuestions = await StudentQuestion.find({ testSession: testSessionId });
    const correctAnswers = studentQuestions.filter(q => q.isCorrect).length;
    const incorrectAnswers = studentQuestions.filter(q => !q.isCorrect && q.selectedAnswer !== -1).length;
    const flaggedAnswers = studentQuestions.filter(q => q.selectedAnswer === -1).length;

    await TestSession.findByIdAndUpdate(testSessionId, {
      correctAnswers,
      incorrectAnswers,
      flaggedAnswers,
      totalOptions: studentQuestions.reduce((sum, q) => sum + q.options.length, 0)
    });

    res.status(200).json({
      success: true,
      data: {
        id: studentQuestion._id,
        isCorrect,
        selectedAnswer
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

    // Check if test session exists and belongs to user
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

    // Get all answered questions
    const studentQuestions = await StudentQuestion.find({
      student: req.user._id,
      testSession: testSessionId
    }).populate({
      path: 'question',
      select: 'questionText questionMedia'
    });

    res.status(200).json({
      success: true,
      count: studentQuestions.length,
      data: studentQuestions
    });
  } catch (error) {
    next(error);
  }
};

// ... (other imports and code remain unchanged)

// @desc    Get answer statistics for a student
// @route   GET /api/student-questions/stats
// @access  Private
exports.getStudentStats = async (req, res, next) => {
  try {
    const { category, subject, topic } = req.query;
    
    // Build filter
    const filter = { student: req.user._id };
    
    if (category) filter.category = category;
    if (subject) filter.subject = subject;
    if (topic) filter.topic = topic;

    // Get stats
    const totalAnswered = await StudentQuestion.countDocuments({
      ...filter,
      selectedAnswer: { $ne: -1 }
    });
    
    const correctAnswers = await StudentQuestion.countDocuments({
      ...filter,
      isCorrect: true
    });
    
    const incorrectAnswers = await StudentQuestion.countDocuments({
      ...filter,
      isCorrect: false,
      selectedAnswer: { $ne: -1 }
    });
    
    const flaggedAnswers = await StudentQuestion.countDocuments({
      ...filter,
      selectedAnswer: -1
    });

    // Get category stats
    const categoryStats = await StudentQuestion.aggregate([
      { $match: { student: req.user._id, selectedAnswer: { $ne: -1 } } },
      {
        $group: {
          _id: "$category",
          total: { $sum: 1 },
          correct: { $sum: { $cond: ["$isCorrect", 1, 0] } },
          incorrect: { $sum: { $cond: [{ $and: [{ $eq: ["$isCorrect", false] }, { $ne: ["$selectedAnswer", -1] }] }, 1, 0] } }
        }
      },
      {
        $project: {
          category: "$_id",
          total: 1,
          correct: 1,
          incorrect: 1,
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
        incorrectAnswers,
        flaggedAnswers,
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
    
    if (req.query.category) filter.category = req.query.category;
    if (req.query.subject) filter.subject = req.query.subject;
    if (req.query.topic) filter.topic = req.query.topic;
    if (req.query.isCorrect === 'true') filter.isCorrect = true;
    if (req.query.isCorrect === 'false') {
      filter.isCorrect = false;
      filter.selectedAnswer = { $ne: -1 };
    }
    if (req.query.flagged === 'true') filter.selectedAnswer = -1;
    if (req.query.testSession) filter.testSession = req.query.testSession;

    // Get total count
    const total = await StudentQuestion.countDocuments(filter);
    
    // Get history with pagination
    const history = await StudentQuestion.find(filter)
      .populate({
        path: 'question',
        select: 'questionText questionMedia'
      })
      .populate({
        path: 'testSession',
        select: 'startedAt status'
      })
      .select('options correctAnswer selectedAnswer isCorrect explanation explanationMedia category subject topic answeredAt lastUpdatedAt')
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
    
    // Check test session
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
    
    if (filter === 'incorrect') {
      query.isCorrect = false;
      query.selectedAnswer = { $ne: -1 };
    } else if (filter === 'correct') {
      query.isCorrect = true;
    } else if (filter === 'flagged') {
      query.selectedAnswer = -1;
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
        select: 'questionText questionMedia'
      })
      .select('options correctAnswer selectedAnswer isCorrect explanation explanationMedia category subject topic difficulty answeredAt lastUpdatedAt')
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