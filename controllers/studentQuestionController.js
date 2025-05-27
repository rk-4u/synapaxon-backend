const Question = require('../models/Question');
const TestSession = require('../models/TestSession');
const StudentQuestion = require('../models/StudentQuestion');

// Helper function to validate media objects
const validateMedia = (media, fieldName) => {
  if (media && !Array.isArray(media)) {
    throw new Error(`${fieldName} must be an array`);
  }
  if (media) {
    for (const item of media) {
      if (!item.filename || !item.originalname || !item.mimetype || !item.path) {
        throw new Error(`Each ${fieldName.toLowerCase()} object must include filename, originalname, mimetype, and path`);
      }
      if (item.mimetype !== 'text/url' && item.size === undefined) {
        throw new Error(`Each ${fieldName.toLowerCase()} object must include size (except for URLs)`);
      }
    }
  }
};

// @desc    Submit/update answer for a specific question in a test session
// @route   POST /api/student-questions/submit
// @access  Private
exports.submitQuestionAnswer = async (req, res, next) => {
  try {
    const { testSessionId, questionId, selectedAnswer, subjects, topics } = req.body;

    // Validate required fields
    if (!testSessionId || !questionId || selectedAnswer === undefined) {
      return res.status(400).json({
        success: false,
        message: 'Please provide testSessionId, questionId, and selectedAnswer'
      });
    }

    // Validate subjects and topics (optional but recommended)
    if (subjects && (!Array.isArray(subjects) || subjects.some(s => typeof s !== 'string'))) {
      return res.status(400).json({
        success: false,
        message: 'Subjects must be an array of strings'
      });
    }
    if (topics && (!Array.isArray(topics) || topics.some(t => typeof t !== 'string'))) {
      return res.status(400).json({
        success: false,
        message: 'Topics must be an array of strings'
      });
    }

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
        message: 'Not authorized to submit answers for this test'
      });
    }

    if (['succeeded', 'canceled'].includes(testSession.status)) {
      return res.status(400).json({
        success: false,
        message: 'Cannot update answers for a completed or canceled test'
      });
    }

    if (!testSession.questions.includes(questionId)) {
      return res.status(400).json({
        success: false,
        message: 'Question does not belong to this test session'
      });
    }

    const question = await Question.findById(questionId);
    if (!question) {
      return res.status(404).json({
        success: false,
        message: 'Question not found'
      });
    }

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

    validateMedia(question.options.map(opt => opt.media).flat(), 'Option media');
    validateMedia(question.explanationMedia, 'Explanation media');

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
      subjects: subjects || [], // Use provided subjects, default to empty array
      topics: topics || [],     // Use provided topics, default to empty array
      lastUpdatedAt: Date.now()
    };

    if (!existingSubmission) {
      update.answeredAt = Date.now();
    }

    const studentQuestion = await StudentQuestion.findOneAndUpdate(
      { student: req.user._id, question: questionId, testSession: testSessionId },
      update,
      { new: true, upsert: true, setDefaultsOnInsert: true }
    );

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
    res.status(400).json({
      success: false,
      message: error.message
    });
  }
};

// @desc    Get all answered questions for a test session
// @route   GET /api/student-questions/test/:testSessionId
// @access  Private
exports.getTestQuestionAnswers = async (req, res, next) => {
  try {
    const { testSessionId } = req.params;

    if (!testSessionId) {
      return res.status(400).json({
        success: false,
        message: 'Please provide testSessionId'
      });
    }

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

// @desc    Get answer statistics for a student
// @route   GET /api/student-questions/stats
// @access  Private
exports.getStudentStats = async (req, res, next) => {
  try {
    const { category, subjects, topics } = req.query;

    const filter = { student: req.user._id };

    if (category) filter.category = category;
    if (subjects) {
      const subjectArray = Array.isArray(subjects) ? subjects : subjects.split(',');
      filter.subjects = { $in: subjectArray };
    }
    if (topics) {
      const topicArray = Array.isArray(topics) ? topics : topics.split(',');
      filter.topics = { $in: topicArray };
    }

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
    const filter = { student: req.user._id };

    if (req.query.category) filter.category = req.query.category;
    if (req.query.subjects) {
      const subjectArray = Array.isArray(req.query.subjects) ? req.query.subjects : req.query.subjects.split(',');
      filter.subjects = { $in: subjectArray };
    }
    if (req.query.topics) {
      const topicArray = Array.isArray(req.query.topics) ? req.query.topics : req.query.topics.split(',');
      filter.topics = { $in: topicArray };
    }
    if (req.query.isCorrect === 'true') filter.isCorrect = true;
    if (req.query.isCorrect === 'false') {
      filter.isCorrect = false;
      filter.selectedAnswer = { $ne: -1 };
    }
    if (req.query.flagged === 'true') filter.selectedAnswer = -1;
    if (req.query.testSession) filter.testSession = req.query.testSession;

    const history = await StudentQuestion.find(filter)
      .populate({
        path: 'question',
        select: 'questionText questionMedia'
      })
      .populate({
        path: 'testSession',
        select: 'startedAt status'
      })
      .select('options correctAnswer selectedAnswer isCorrect explanation explanationMedia category subjects topics answeredAt lastUpdatedAt')
      .sort({ lastUpdatedAt: -1 });

    res.status(200).json({
      success: true,
      count: history.length,
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

    if (!testSessionId) {
      return res.status(400).json({
        success: false,
        message: 'Please provide testSessionId'
      });
    }

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

    const questions = await StudentQuestion.find(query)
      .populate({
        path: 'question',
        select: 'questionText questionMedia'
      })
      .select('options correctAnswer selectedAnswer isCorrect explanation explanationMedia category subjects topics difficulty answeredAt lastUpdatedAt')
      .sort({ lastUpdatedAt: -1 });

    res.status(200).json({
      success: true,
      count: questions.length,
      data: questions
    });
  } catch (error) {
    next(error);
  }
};