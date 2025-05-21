// controllers/subjectController.js
const Subject = require('../models/Subject');
const Category = require('../models/Category');
const Topic = require('../models/Topic');

// @desc    Get all subjects
// @route   GET /api/subjects
// @access  Public
exports.getSubjects = async (req, res, next) => {
  try {
    let query;
    
    // Check if we're filtering by category
    if (req.query.category) {
      query = Subject.find({ category: req.query.category });
    } else {
      query = Subject.find();
    }
    
    // Populate with category information
    query = query.populate('category', 'name');
    
    const subjects = await query;
    
    // Check if we should populate topics
    if (req.query.populate === 'true') {
      // For each subject, find its topics
      const populatedSubjects = await Promise.all(subjects.map(async (subject) => {
        const subjectObj = subject.toObject();
        const topics = await Topic.find({ subject: subject._id });
        subjectObj.topics = topics;
        return subjectObj;
      }));
      
      return res.status(200).json({
        success: true,
        count: populatedSubjects.length,
        data: populatedSubjects
      });
    }
    
    res.status(200).json({
      success: true,
      count: subjects.length,
      data: subjects
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Get single subject
// @route   GET /api/subjects/:id
// @access  Public
exports.getSubject = async (req, res, next) => {
  try {
    const subject = await Subject.findById(req.params.id).populate('category', 'name');
    
    if (!subject) {
      return res.status(404).json({
        success: false,
        message: `Subject with id ${req.params.id} not found`
      });
    }
    
    // Check if we should populate topics
    if (req.query.populate === 'true') {
      const topics = await Topic.find({ subject: subject._id });
      const result = subject.toObject();
      result.topics = topics;
      
      return res.status(200).json({
        success: true,
        data: result
      });
    }
    
    res.status(200).json({
      success: true,
      data: subject
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Create new subject
// @route   POST /api/subjects
// @access  Private
exports.createSubject = async (req, res, next) => {
  try {
    // Replace spaces with underscores if present
    if (req.body.name) {
      req.body.name = req.body.name.trim();
    }
    
    // Check if category exists
    const category = await Category.findById(req.body.category);
    
    if (!category) {
      return res.status(404).json({
        success: false,
        message: `Category with id ${req.body.category} not found`
      });
    }
    
    const subject = await Subject.create(req.body);
    
    res.status(201).json({
      success: true,
      data: subject
    });
  } catch (error) {
    // Handle duplicate subject in same category
    if (error.code === 11000) {
      return res.status(400).json({
        success: false,
        message: 'A subject with this name already exists in this category'
      });
    }
    next(error);
  }
};

// @desc    Update subject
// @route   PUT /api/subjects/:id
// @access  Private
exports.updateSubject = async (req, res, next) => {
  try {
    // Replace spaces with underscores if present
    if (req.body.name) {
      req.body.name = req.body.name.trim();
    }
    
    // If changing category, check if new category exists
    if (req.body.category) {
      const category = await Category.findById(req.body.category);
      
      if (!category) {
        return res.status(404).json({
          success: false,
          message: `Category with id ${req.body.category} not found`
        });
      }
    }
    
    const subject = await Subject.findByIdAndUpdate(req.params.id, req.body, {
      new: true,
      runValidators: true
    }).populate('category', 'name');
    
    if (!subject) {
      return res.status(404).json({
        success: false,
        message: `Subject with id ${req.params.id} not found`
      });
    }
    
    res.status(200).json({
      success: true,
      data: subject
    });
  } catch (error) {
    // Handle duplicate subject in same category
    if (error.code === 11000) {
      return res.status(400).json({
        success: false,
        message: 'A subject with this name already exists in this category'
      });
    }
    next(error);
  }
};

// @desc    Delete subject
// @route   DELETE /api/subjects/:id
// @access  Private
exports.deleteSubject = async (req, res, next) => {
  try {
    const subject = await Subject.findById(req.params.id);
    
    if (!subject) {
      return res.status(404).json({
        success: false,
        message: `Subject with id ${req.params.id} not found`
      });
    }
    
    // First delete all topics that belong to this subject
    await Topic.deleteMany({ subject: subject._id });
    
    // Now delete the subject itself
    await subject.remove();
    
    res.status(200).json({
      success: true,
      data: {}
    });
  } catch (error) {
    next(error);
  }
};