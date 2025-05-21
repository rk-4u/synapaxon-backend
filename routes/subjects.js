// routes/subjects.js
const express = require('express');
const {
  getSubjects,
  getSubject,
  createSubject,
  updateSubject,
  deleteSubject
} = require('../controllers/subjectController');

const { protect } = require('../middleware/authMiddleware');

const router = express.Router();

// Set up routes
router
  .route('/')
  .get(getSubjects)
  .post(protect, createSubject);

router
  .route('/:id')
  .get(getSubject)
  .put(protect, updateSubject)
  .delete(protect, deleteSubject);

module.exports = router;