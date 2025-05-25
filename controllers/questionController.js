const Question = require('../models/Question');

// @desc    Create a new question
// @route   POST /api/questions
// @access  Private
exports.createQuestion = async (req, res, next) => {
  try {
    const {
      questionText,
      questionMedia,
      options,
      correctAnswer,
      explanation,
      explanationMedia,
      category,
      subjects,
      difficulty,
      tags,
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

    // Options validation
    if (!Array.isArray(options)) {
      return res.status(400).json({
        success: false,
        message: 'Options must be an array'
      });
    }

    if (options.length > 0) {
      if (correctAnswer === undefined) {
        return res.status(400).json({
          success: false,
          message: 'Correct answer is required when options are provided'
        });
      }

      if (correctAnswer < 0 || correctAnswer >= options.length) {
        return res.status(400).json({
          success: false,
          message: 'Correct answer must be a valid option index'
        });
      }
    }

    if (!category) {
      return res.status(400).json({
        success: false,
        message: 'Category is required'
      });
    }

    if (!subjects || !Array.isArray(subjects) || subjects.length === 0) {
      return res.status(400).json({
        success: false,
        message: 'At least one subject is required'
      });
    }

    // Validate subjects structure
    for (const subject of subjects) {
      if (!subject.name || typeof subject.name !== 'string') {
        return res.status(400).json({
          success: false,
          message: 'Each subject must have a valid name'
        });
      }
      if (subject.topics && !Array.isArray(subject.topics)) {
        return res.status(400).json({
          success: false,
          message: 'Subject topics must be an array'
        });
      }
    }

    if (!difficulty) {
      return res.status(400).json({
        success: false,
        message: 'Difficulty is required'
      });
    }

    const allowedDifficulties = ['easy', 'medium', 'hard'];
    if (!allowedDifficulties.includes(difficulty)) {
      return res.status(400).json({
        success: false,
        message: 'Difficulty must be one of: easy, medium, hard'
      });
    }

    // Validate media objects (helper function)
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

    // Validate media fields
    validateMedia(questionMedia, 'Question media');
    validateMedia(explanationMedia, 'Explanation media');
    for (let i = 0; i < options.length; i++) {
      validateMedia(options[i].media, `Option ${String.fromCharCode(65 + i)} media`);
    }

    // Process options
    const processedOptions = options.map(option => {
      if (typeof option === 'string') {
        return { text: option, media: [] };
      } else if (typeof option === 'object') {
        if (option.media && !Array.isArray(option.media)) {
          throw new Error('Option media must be an array');
        }
        return {
          text: option.text || '',
          media: option.media || []
        };
      }
      return { text: '', media: [] };
    });

    // Create the question
    const question = await Question.create({
      questionText,
      questionMedia: questionMedia || [],
      options: processedOptions,
      correctAnswer: options.length > 0 ? correctAnswer : undefined,
      explanation,
      explanationMedia: explanationMedia || [],
      category,
      subjects, // Already in [{ name: String, topics: [String] }] format
      difficulty,
      tags: tags || [],
      sourceUrl: sourceUrl || '',
      createdBy: req.user.id,
      approved: true
    });

    res.status(201).json({
      success: true,
      data: question
    });
  } catch (error) {
    res.status(400).json({
      success: false,
      message: error.message
    });
  }
};

// @desc    Get all questions with optional filtering
// @route   GET /api/questions
// @access  Private
exports.getQuestions = async (req, res, next) => {
  try {
    const query = { approved: true };

    if (req.query.category) {
      query.category = req.query.category;
    }

    if (req.query.subjects) {
      const subjects = Array.isArray(req.query.subjects)
        ? req.query.subjects
        : req.query.subjects.split(',');
      query['subjects.name'] = { $in: subjects }; // Updated to query subjects.name
    }

    if (req.query.topics) {
      const topics = Array.isArray(req.query.topics)
        ? req.query.topics
        : req.query.topics.split(',');
      query['subjects.topics'] = { $in: topics }; // Updated to query subjects.topics
    }

    if (req.query.tags) {
      const tags = req.query.tags.split(',');
      query.tags = { $in: tags };
    }

    if (req.query.difficulty) {
      query.difficulty = req.query.difficulty;
    }

    if (req.query.createdBy) {
      if (req.query.createdBy === 'me') {
        query.createdBy = req.user.id;
      } else {
        // Only admins can query other users' questions
        if (req.user.role === 'admin') {
          query.createdBy = req.query.createdBy;
        } else {
          return res.status(403).json({
            success: false,
            message: 'You are not authorized to view other users\' questions.'
          });
        }
      }
    }

    if (req.query.hasMedia) {
      query.$or = [
        { questionMedia: { $ne: [] } },
        { 'options.media': { $ne: [] } },
        { explanationMedia: { $ne: [] } }
      ];
    }

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
      return res.status(400).json({
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