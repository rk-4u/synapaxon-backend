// routes/topics.js
const express = require('express');
const {
  getTopics,
  getTopic,
  createTopic,
  updateTopic,
  deleteTopic
} = require('../controllers/topicController');

const { protect } = require('../middleware/authMiddleware');

const router = express.Router();

// Set up routes
router
  .route('/')
  .get(getTopics)
  .post(protect, createTopic);

router
  .route('/:id')
  .get(getTopic)
  .put(protect, updateTopic)
  .delete(protect, deleteTopic);

module.exports = router;