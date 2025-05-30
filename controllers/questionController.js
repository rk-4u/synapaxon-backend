const Question = require('../models/Question');


const mapCloudinaryType = (resourceType) => {
  if (resourceType === 'image') return 'image';
  if (resourceType === 'video') return 'video';
  if (resourceType === 'raw') return 'raw';
  return 'url';
};

// Validate media objects
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
      // Ensure type is valid
      if (!['image', 'video', 'raw', 'url'].includes(item.type)) {
        throw new Error(`Each ${fieldName.toLowerCase()} object must have a valid type: image, video, raw, or url`);
      }
    }
  }
};


exports.updateQuestion = async (req, res, next) => {
  try {
    const question = await Question.findById(req.params.id);

    if (!question) {
      return res.status(404).json({
        success: false,
        message: 'Question not found'
      });
    }

    if (question.createdBy.toString() !== req.user.id && req.user.role !== 'admin') {
      return res.status(403).json({
        success: false,
        message: 'Not authorized to update this question'
      });
    }

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

    if (!Array.isArray(options) || options.length < 2) {
      return res.status(400).json({
        success: false,
        message: 'At least two options are required'
      });
    }

    if (correctAnswer === undefined || correctAnswer < 0 || correctAnswer >= options.length) {
      return res.status(400).json({
        success: false,
        message: 'Correct answer must be a valid option index'
      });
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

    // Validate media objects
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

    validateMedia(questionMedia, 'Question media');
    validateMedia(explanationMedia, 'Explanation media');
    for (let i = 0; i < options.length; i++) {
      validateMedia(options[i].media, `Option ${String.fromCharCode(65 + i)} media`);
    }

    // Process options
    const processedOptions = options.map(option => ({
      text: option.text || '',
      media: option.media || []
    }));

    // Update the question
    question.questionText = questionText;
    question.questionMedia = questionMedia || [];
    question.options = processedOptions;
    question.correctAnswer = correctAnswer;
    question.explanation = explanation;
    question.explanationMedia = explanationMedia || [];
    question.category = category;
    question.subjects = subjects;
    question.difficulty = difficulty;
    question.tags = tags || [];
    question.sourceUrl = sourceUrl || '';
    question.approved = true;

    const updatedQuestion = await question.save();

    res.status(200).json({
      success: true,
      data: updatedQuestion
    });
  } catch (error) {
    res.status(400).json({
      success: false,
      message: error.message
    });
  }
};

// @desc    Delete a question
// @route   DELETE /api/questions/:id
// @access  Private
exports.deleteQuestion = async (req, res, next) => {
  try {
    const question = await Question.findById(req.params.id);

    if (!question) {
      return res.status(404).json({
        success: false,
        message: 'Question not found'
      });
    }

    if (question.createdBy.toString() !== req.user.id && req.user.role !== 'admin') {
      return res.status(403).json({
        success: false,
        message: 'Not authorized to delete this question'
      });
    }

    await question.deleteOne();

    res.status(200).json({
      success: true,
      message: 'Question deleted successfully'
    });
  } catch (error) {
    res.status(400).json({
      success: false,
      message: error.message
    });
  }
};

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

    if (req.query.category) query.category = req.query.category;

    if (req.query.subjects) {
      const subjects = Array.isArray(req.query.subjects)
        ? req.query.subjects
        : req.query.subjects.split(',');
      query['subjects.name'] = { $in: subjects };
    }

    if (req.query.topics) {
      const topics = Array.isArray(req.query.topics)
        ? req.query.topics
        : req.query.topics.split(',');
      query['subjects.topics'] = { $in: topics };
    }

    if (req.query.tags) {
      const tags = req.query.tags.split(',');
      query.tags = { $in: tags };
    }

    if (req.query.difficulty) query.difficulty = req.query.difficulty;

    if (req.query.createdBy) {
      if (req.query.createdBy === 'me') {
        query.createdBy = req.user.id;
      } else {
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

    const questions = await Question.find(query)
      .populate('createdBy', 'name')
      .sort({ createdAt: -1 });

    res.status(200).json({
      success: true,
      count: questions.length,
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




// Add this to questionController.js - for getting total questions created
// @desc    Get total questions count
// @route   GET /api/questions/total
// @access  Private/Admin
exports.getTotalQuestionsCount = async (req, res, next) => {
  try {
    const totalCount = await Question.countDocuments({ approved: true });
    
    res.status(200).json({
      success: true,
      data: {
        totalQuestions: totalCount
      }
    });
  } catch (error) {
    console.error('Error in getTotalQuestionsCount:', error);
    next(error);
  }
};