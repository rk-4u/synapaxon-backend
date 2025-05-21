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

    // Required field validation
    if (!questionText) {
      return res.status(400).json({
        success: false,
        message: 'Question text is required'
      });
    }

    if (!explanation) {
      return res.status(400).json({
        success: false,
        message: 'Explanation is required'
      });
    }

    // Options validation (at least 2 options required)
    if (!options || !Array.isArray(options) || options.length < 2) {
      return res.status(400).json({
        success: false,
        message: 'At least 2 options are required'
      });
    }

    // Correct answer validation
    if (correctAnswer === undefined) {
      return res.status(400).json({
        success: false,
        message: 'Correct answer is required'
      });
    }

    // Validate that correctAnswer is a valid index in the options array
    if (correctAnswer < 0 || correctAnswer >= options.length) {
      return res.status(400).json({
        success: false,
        message: 'Correct answer must be a valid option index'
      });
    }

    // Category, subject, topic validation
    if (!category) {
      return res.status(400).json({
        success: false,
        message: 'Category is required'
      });
    }

    if (!subject) {
      return res.status(400).json({
        success: false,
        message: 'Subject is required'
      });
    }

    // Difficulty validation
    if (!difficulty) {
      return res.status(400).json({
        success: false,
        message: 'Difficulty is required'
      });
    }

    // Validate difficulty is one of the allowed values
    const allowedDifficulties = ['easy', 'medium', 'hard'];
    if (!allowedDifficulties.includes(difficulty)) {
      return res.status(400).json({
        success: false,
        message: 'Difficulty must be one of: easy, medium, hard'
      });
    }

    // Process media - ensure proper structure if media is provided
    let processedMedia = null;
    if (media) {
      processedMedia = {
        type: media.type || 'unknown',
        ...media
      };
    }

    // Create the question with all validated fields
    const question = await Question.create({
      questionText,
      options,
      correctAnswer,
      explanation,
      category,
      subject,
      topic, 
      difficulty,
      tags: tags || [],  // Optional - default to empty array
      media: processedMedia,  // Optional - structured media data
      sourceUrl: sourceUrl || '',  // Optional - default to empty string
      createdBy: req.user.id,
      approved: true  // Auto-approve for now
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