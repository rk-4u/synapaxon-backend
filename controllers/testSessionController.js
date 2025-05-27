const TestSession = require('../models/TestSession');
const Question = require('../models/Question');

// @desc    Create a new test session with full question details
// @route   POST /api/tests
// @access  Private
exports.createTestSession = async (req, res, next) => {
  try {
    const { questionIds, difficulty, count } = req.body;

    if (!questionIds || !Array.isArray(questionIds) || questionIds.length === 0) {
      return res.status(400).json({
        success: false,
        message: 'Please provide an array of question IDs'
      });
    }

    const questions = await Question.find({ 
      _id: { $in: questionIds },
      approved: true
    }).select('questionText questionMedia options category subjects topics difficulty tags sourceUrl createdBy');

    if (questions.length !== questionIds.length) {
      return res.status(400).json({
        success: false,
        message: 'One or more questions not found or not approved'
      });
    }

    const totalOptions = questions.reduce((sum, q) => sum + q.options.length, 0);

    const testSession = await TestSession.create({
      student: req.user._id,
      questions: questionIds,
      totalQuestions: questionIds.length,
      totalOptions,
      filters: { difficulty, count },
      status: 'proceeding'
    });

    const response = {
      _id: testSession._id,
      student: testSession.student,
      questions: questions.map(q => ({
        _id: q._id,
        questionText: q.questionText,
        questionMedia: q.questionMedia,
        options: q.options,
        category: q.category,
        subjects: q.subjects,
        topics: q.topics,
        difficulty: q.difficulty,
        tags: q.tags,
        sourceUrl: q.sourceUrl,
        createdBy: q.createdBy
      })),
      totalQuestions: testSession.totalQuestions,
      totalOptions: testSession.totalOptions,
      correctAnswers: testSession.correctAnswers,
      incorrectAnswers: testSession.incorrectAnswers,
      flaggedAnswers: testSession.flaggedAnswers,
      filters: testSession.filters,
      status: testSession.status,
      startedAt: testSession.startedAt,
      createdAt: testSession.createdAt,
      updatedAt: testSession.updatedAt,
      __v: testSession.__v,
      scorePercentage: testSession.scorePercentage
    };

    res.status(201).json({
      success: true,
      data: response
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Get test sessions for a student
// @route   GET /api/tests
// @access  Private
exports.getTestSessions = async (req, res, next) => {
  try {
    const page = parseInt(req.query.page, 10) || 1;
    const limit = parseInt(req.query.limit, 10) || 10;
    const skip = (page - 1) * limit;

    const filter = { student: req.user._id };
    if (req.query.status) {
      filter.status = req.query.status;
    }

    const total = await TestSession.countDocuments(filter);
    const testSessions = await TestSession.find(filter)
      .select('totalQuestions totalOptions correctAnswers incorrectAnswers flaggedAnswers status startedAt completedAt scorePercentage')
      .sort({ startedAt: -1 })
      .skip(skip)
      .limit(limit);

    res.status(200).json({
      success: true,
      count: testSessions.length,
      total,
      pagination: {
        current: page,
        pages: Math.ceil(total / limit)
      },
      data: testSessions
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Get a specific test session by ID
// @route   GET /api/tests/:testSessionId
// @access  Private
exports.getTestSessionById = async (req, res, next) => {
  try {
    const { testSessionId } = req.params;

    if (!testSessionId) {
      return res.status(400).json({
        success: false,
        message: 'Please provide a testSessionId'
      });
    }

    const testSession = await TestSession.findById(testSessionId)
      .populate({
        path: 'questions',
        select: 'questionText questionMedia options category subjects topics difficulty tags sourceUrl createdBy',
        match: { approved: true }
      });

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

    const response = {
      _id: testSession._id,
      student: testSession.student,
      questions: testSession.questions,
      totalQuestions: testSession.totalQuestions,
      totalOptions: testSession.totalOptions,
      correctAnswers: testSession.correctAnswers,
      incorrectAnswers: testSession.incorrectAnswers,
      flaggedAnswers: testSession.flaggedAnswers,
      filters: testSession.filters,
      status: testSession.status,
      startedAt: testSession.startedAt,
      completedAt: testSession.completedAt,
      createdAt: testSession.createdAt,
      updatedAt: testSession.updatedAt,
      __v: testSession.__v,
      scorePercentage: testSession.scorePercentage
    };

    res.status(200).json({
      success: true,
      data: response
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Complete or cancel a test session
// @route   PUT /api/tests/:testSessionId
// @access  Private
exports.updateTestSessionStatus = async (req, res, next) => {
  try {
    const { testSessionId } = req.params;
    const { status } = req.body;

    if (!testSessionId) {
      return res.status(400).json({
        success: false,
        message: 'Please provide testSessionId'
      });
    }

    if (!['succeeded', 'canceled'].includes(status)) {
      return res.status(400).json({
        success: false,
        message: 'Status must be either succeeded or canceled'
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
        message: 'Not authorized to update this test session'
      });
    }

    if (['succeeded', 'canceled'].includes(testSession.status)) {
      return res.status(400).json({
        success: false,
        message: 'Cannot update a completed or canceled test session'
      });
    }

    testSession.status = status;
    testSession.completedAt = Date.now();
    await testSession.save();

    res.status(200).json({
      success: true,
      data: testSession
    });
  } catch (error) {
    next(error);
  }
};