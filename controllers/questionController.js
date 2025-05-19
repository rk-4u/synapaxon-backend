const Question = require('../models/Question');

// @desc    Create a new question
// @route   POST /api/questions
// @access  Private
exports.createQuestion = async (req, res, next) => {
  try {
    const {
      questionText,
      options,
      correctAnswer,
      explanation,
      category,
      subject,
      topic,
      difficulty,
      tags,
      media,
      sourceUrl
    } = req.body;

    // Validation
    if (!questionText || !options || options.length !== 4 || correctAnswer === undefined || !explanation ||
        !category || !subject || !topic) {
      return res.status(400).json({
        success: false,
        message: 'Please provide all required fields'
      });
    }

    const question = await Question.create({
      questionText,
      options,
      correctAnswer,
      explanation,
      category,
      subject,
      topic,
      difficulty: difficulty || 'medium',
      tags: tags || [],
      media,
      sourceUrl: sourceUrl || '',
      createdBy: req.user.id,
      approved: true
    });

    res.status(201).json({
      success: true,
      data: question
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Get all questions with optional filtering
// @route   GET /api/questions
// @access  Private
exports.getQuestions = async (req, res, next) => {
  try {
    const query = { approved: true };

    // Filter by category
    if (req.query.category) {
      query.category = req.query.category;
    }

    // Filter by subject
    if (req.query.subject) {
      query.subject = req.query.subject;
    }

    // Filter by topics (can be a single or multiple values)
    if (req.query.topic) {
      const topics = Array.isArray(req.query.topic)
        ? req.query.topic
        : req.query.topic.split(',');
      query.topic = { $in: topics };
    }

    // Filter by tags
    if (req.query.tags) {
      const tags = req.query.tags.split(',');
      query.tags = { $in: tags };
    }

    // Filter by difficulty
    if (req.query.difficulty) {
      query.difficulty = req.query.difficulty;
    }

    // Filter by creator
    if (req.query.createdBy === 'me') {
      query.createdBy = req.user.id;
    }

    // Pagination
    const page = parseInt(req.query.page, 10) || 1;
    const limit = parseInt(req.query.limit, 10) || 10;
    const startIndex = (page - 1) * limit;

    const totalQuestions = await Question.countDocuments(query);
    const questions = await Question.find(query)
      .populate('createdBy', 'name')
      .skip(startIndex)
      .limit(limit)
      .sort({ createdAt: -1 });

    res.status(200).json({
      success: true,
      count: questions.length,
      total: totalQuestions,
      pagination: {
        current: page,
        pages: Math.ceil(totalQuestions / limit)
      },
      data: questions
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Get a single question by ID
// @route   GET /api/questions/:id
// @access  Private
exports.getQuestion = async (req, res, next) => {
  try {
    const question = await Question.findById(req.params.id)
      .populate('createdBy', 'name');

    if (!question) {
      return res.status(404).json({
        success: false,
        message: 'Question not found'
      });
    }

    res.status(200).json({
      success: true,
      data: question
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Get unique tags used in questions
// @route   GET /api/questions/tags
// @access  Private
exports.getTags = async (req, res, next) => {
  try {
    const tags = await Question.distinct('tags');

    res.status(200).json({
      success: true,
      count: tags.length,
      data: tags
    });
  } catch (error) {
    next(error);
  }
};
