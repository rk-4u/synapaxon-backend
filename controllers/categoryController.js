// controllers/categoryController.js
const Category = require('../models/Category');
const Subject = require('../models/Subject');
const Topic = require('../models/Topic');

// @desc    Get all categories (optionally with subjects and topics)
// @route   GET /api/categories
// @access  Public
exports.getCategories = async (req, res, next) => {
  try {
    // Check if we should populate subjects and topics
    const populate = req.query.populate === 'true';
    
    if (populate) {
      // Get categories with subjects and topics nested
      const categories = await Category.find().lean();
      
      // For each category, find its subjects
      for (let category of categories) {
        const subjects = await Subject.find({ category: category._id }).lean();
        
        // For each subject, find its topics
        for (let subject of subjects) {
          const topics = await Topic.find({ subject: subject._id }).lean();
          subject.topics = topics;
        }
        
        category.subjects = subjects;
      }
      
      return res.status(200).json({
        success: true,
        count: categories.length,
        data: categories
      });
    } else {
      // Just get plain categories without relationships
      const categories = await Category.find();
      
      res.status(200).json({
        success: true,
        count: categories.length,
        data: categories
      });
    }
  } catch (error) {
    next(error);
  }
};

// @desc    Get single category
// @route   GET /api/categories/:id
// @access  Public
exports.getCategory = async (req, res, next) => {
  try {
    const category = await Category.findById(req.params.id);
    
    if (!category) {
      return res.status(404).json({
        success: false,
        message: `Category with id ${req.params.id} not found`
      });
    }
    
    // Check if we should populate subjects and topics
    const populate = req.query.populate === 'true';
    
    if (populate) {
      const subjects = await Subject.find({ category: category._id }).lean();
      
      // For each subject, find its topics
      for (let subject of subjects) {
        const topics = await Topic.find({ subject: subject._id }).lean();
        subject.topics = topics;
      }
      
      const result = category.toObject();
      result.subjects = subjects;
      
      return res.status(200).json({
        success: true,
        data: result
      });
    }
    
    res.status(200).json({
      success: true,
      data: category
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Create new category
// @route   POST /api/categories
// @access  Private
exports.createCategory = async (req, res, next) => {
  try {
    // Replace spaces with underscores if present
    if (req.body.name) {
      req.body.name = req.body.name.trim();
    }
    
    const category = await Category.create(req.body);
    
    res.status(201).json({
      success: true,
      data: category
    });
  } catch (error) {
    // Handle duplicate key error
    if (error.code === 11000) {
      return res.status(400).json({
        success: false,
        message: 'A category with this name already exists'
      });
    }
    next(error);
  }
};

// @desc    Update category
// @route   PUT /api/categories/:id
// @access  Private
exports.updateCategory = async (req, res, next) => {
  try {
    // Replace spaces with underscores if present
    if (req.body.name) {
      req.body.name = req.body.name.trim();
    }
    
    const category = await Category.findByIdAndUpdate(req.params.id, req.body, {
      new: true,
      runValidators: true
    });
    
    if (!category) {
      return res.status(404).json({
        success: false,
        message: `Category with id ${req.params.id} not found`
      });
    }
    
    res.status(200).json({
      success: true,
      data: category
    });
  } catch (error) {
    // Handle duplicate key error
    if (error.code === 11000) {
      return res.status(400).json({
        success: false,
        message: 'A category with this name already exists'
      });
    }
    next(error);
  }
};

// @desc    Delete category
// @route   DELETE /api/categories/:id
// @access  Private
exports.deleteCategory = async (req, res, next) => {
  try {
    const category = await Category.findById(req.params.id);
    
    if (!category) {
      return res.status(404).json({
        success: false,
        message: `Category with id ${req.params.id} not found`
      });
    }
    
    // First delete all subjects that belong to this category
    const subjects = await Subject.find({ category: category._id });
    
    // For each subject, delete its topics
    for (const subject of subjects) {
      await Topic.deleteMany({ subject: subject._id });
      await subject.remove();
    }
    
    // Now delete the category itself
    await category.remove();
    
    res.status(200).json({
      success: true,
      data: {}
    });
  } catch (error) {
    next(error);
  }
};