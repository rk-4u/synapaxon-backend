// controllers/topicController.js
const Topic = require('../models/Topic');
const Subject = require('../models/Subject');

// @desc    Get all topics
// @route   GET /api/topics
// @access  Public
exports.getTopics = async (req, res, next) => {
  try {
    let query;
    
    // Check if we're filtering by subject
    if (req.query.subject) {
      query = Topic.find({ subject: req.query.subject });
    } else {
      query = Topic.find();
    }
    
    // Populate with subject information
    query = query.populate({
      path: 'subject',
      select: 'name',
      populate: {
        path: 'category',
        select: 'name'
      }
    });
    
    const topics = await query;
    
    res.status(200).json({
      success: true,
      count: topics.length,
      data: topics
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Get single topic
// @route   GET /api/topics/:id
// @access  Public
exports.getTopic = async (req, res, next) => {
  try {
    const topic = await Topic.findById(req.params.id).populate({
      path: 'subject',
      select: 'name',
      populate: {
        path: 'category',
        select: 'name'
      }
    });
    
    if (!topic) {
      return res.status(404).json({
        success: false,
        message: `Topic with id ${req.params.id} not found`
      });
    }
    
    res.status(200).json({
      success: true,
      data: topic
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Create new topic
// @route   POST /api/topics
// @access  Private
exports.createTopic = async (req, res, next) => {
  try {
    // Replace spaces with underscores if present
    if (req.body.name) {
      req.body.name = req.body.name.trim();
    }
    
    // Check if subject exists
    const subject = await Subject.findById(req.body.subject);
    
    if (!subject) {
      return res.status(404).json({
        success: false,
        message: `Subject with id ${req.body.subject} not found`
      });
    }
    
    const topic = await Topic.create(req.body);
    
    // Populate the response with subject and category info
    const populatedTopic = await Topic.findById(topic._id).populate({
      path: 'subject',
      select: 'name',
      populate: {
        path: 'category',
        select: 'name'
      }
    });
    
    res.status(201).json({
      success: true,
      data: populatedTopic
    });
  } catch (error) {
    // Handle duplicate topic in same subject
    if (error.code === 11000) {
      return res.status(400).json({
        success: false,
        message: 'A topic with this name already exists in this subject'
      });
    }
    next(error);
  }
};

// @desc    Update topic
// @route   PUT /api/topics/:id
// @access  Private
exports.updateTopic = async (req, res, next) => {
  try {
    // Replace spaces with underscores if present
    if (req.body.name) {
      req.body.name = req.body.name.trim();
    }
    
    // If changing subject, check if new subject exists
    if (req.body.subject) {
      const subject = await Subject.findById(req.body.subject);
      
      if (!subject) {
        return res.status(404).json({
          success: false,
          message: `Subject with id ${req.body.subject} not found`
        });
      }
    }
    
    const topic = await Topic.findByIdAndUpdate(req.params.id, req.body, {
      new: true,
      runValidators: true
    }).populate({
      path: 'subject',
      select: 'name',
      populate: {
        path: 'category',
        select: 'name'
      }
    });
    
    if (!topic) {
      return res.status(404).json({
        success: false,
        message: `Topic with id ${req.params.id} not found`
      });
    }
    
    res.status(200).json({
      success: true,
      data: topic
    });
  } catch (error) {
    // Handle duplicate topic in same subject
    if (error.code === 11000) {
      return res.status(400).json({
        success: false,
        message: 'A topic with this name already exists in this subject'
      });
    }
    next(error);
  }
};

// @desc    Delete topic
// @route   DELETE /api/topics/:id
// @access  Private
exports.deleteTopic = async (req, res, next) => {
  try {
    const topic = await Topic.findById(req.params.id);
    
    if (!topic) {
      return res.status(404).json({
        success: false,
        message: `Topic with id ${req.params.id} not found`
      });
    }
    
    await topic.remove();
    
    res.status(200).json({
      success: true,
      data: {}
    });
  } catch (error) {
    next(error);
  }
};