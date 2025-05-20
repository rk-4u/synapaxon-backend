const Question = require('../models/Question');
const TestSession = require('../models/TestSession');

// Helper to build query filters based on provided filters
function buildQuestionQuery(filters) {
  const query = { approved: true };

  if (filters.category) {
    query.category = filters.category; // still one category
  }

  if (filters.subject && filters.subject.length > 0) {
    query.subject = { $in: filters.subject };
  }

  if (filters.topic && filters.topic.length > 0) {
    query.topic = { $in: filters.topic };
  }

  if (filters.difficulty) {
    query.difficulty = filters.difficulty;
  }

  return query;
}



// @desc    Start a new test with filtered questions
// @route   POST /api/tests/start
// @access  Private
exports.startTest = async (req, res, next) => {
  try {
    const {
      category,
      subject,
      topic,
      difficulty,
      count = 10
    } = req.body;

    // Build MongoDB query
    const query = buildQuestionQuery({ category, subject, topic, difficulty });

    // Count total available questions
    const totalAvailable = await Question.countDocuments(query);

    if (totalAvailable === 0) {
      return res.status(404).json({
        success: false,
        message: 'No questions available for the selected filters'
      });
    }

    const questionCount = Math.min(count, totalAvailable);

    // Fetch random questions based on filters
    const questions = await Question.aggregate([
      { $match: query },
      { $sample: { size: questionCount } }
    ]);

    // Create test session
    const testSession = await TestSession.create({
      student: req.user._id,
      questions: questions.map(q => q._id),
      filters: {
        category: category || null,
        subject: subject || null,
        topic: topic || null,
        difficulty: difficulty || 'all',
        count: questionCount
      },
      totalQuestions: questionCount,
      completed: false
    });

    // Remove sensitive info before sending questions to client
    const sanitizedQuestions = questions.map(q => {
      const { correctAnswer, explanation, approved, ...rest } = q;
      return rest;
    });

    res.status(201).json({
      success: true,
      data: {
        testSessionId: testSession._id,
        questions: sanitizedQuestions
      }
    });

  } catch (error) {
    next(error);
  }
};

// @desc    Submit test answers
// @route   POST /api/tests/submit
// @access  Private
exports.submitTest = async (req, res, next) => {
  try {
    const { testSessionId, answers } = req.body;

    if (!testSessionId || !Array.isArray(answers)) {
      return res.status(400).json({
        success: false,
        message: 'Please provide testSessionId and an array of answers'
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
        message: 'Not authorized to submit this test'
      });
    }

    if (testSession.completed) {
      return res.status(400).json({
        success: false,
        message: 'Test already submitted'
      });
    }

    // Fetch questions in this test
    const questions = await Question.find({ _id: { $in: testSession.questions } });

    // Map questionId => { correctAnswer, explanation }
    const questionMap = {};
    questions.forEach(q => {
      questionMap[q._id.toString()] = {
        correctAnswer: q.correctAnswer,
        explanation: q.explanation
      };
    });

    let score = 0;
    const processedAnswers = [];

    answers.forEach(answer => {
      const questionId = answer.questionId;
      const selectedAnswer = answer.selectedAnswer;

      if (questionMap[questionId]) {
        let isCorrect = false;

        if (selectedAnswer !== -1) {
          isCorrect = questionMap[questionId].correctAnswer === selectedAnswer;
          if (isCorrect) score += 1;
        }

        processedAnswers.push({
          question: questionId,
          selectedAnswer,
          isCorrect
        });
      }

    });

    testSession.answers = processedAnswers;
    testSession.score = score;
    testSession.completed = true;
    testSession.completedAt = new Date();

    await testSession.save();

    res.status(200).json({
      success: true,
      data: {
        score,
        totalQuestions: testSession.totalQuestions,
        scorePercentage: testSession.scorePercentage,
        answers: processedAnswers.map(a => ({
          ...a,
          correctAnswer: questionMap[a.question].correctAnswer,
          explanation: questionMap[a.question].explanation
        }))
      }
    });

  } catch (error) {
    next(error);
  }
};

// @desc    Get test history for current user
// @route   GET /api/tests/history
// @access  Private
exports.getTestHistory = async (req, res, next) => {
  try {
    const page = parseInt(req.query.page, 10) || 1;
    const limit = parseInt(req.query.limit, 10) || 10;
    const skip = (page - 1) * limit;

    const totalTests = await TestSession.countDocuments({ student: req.user._id });

    const tests = await TestSession.find({ student: req.user._id })
      .select('score totalQuestions completed startedAt completedAt filters')
      .skip(skip)
      .limit(limit)
      .sort({ startedAt: -1 });

    res.status(200).json({
      success: true,
      count: tests.length,
      total: totalTests,
      pagination: {
        current: page,
        pages: Math.ceil(totalTests / limit)
      },
      data: tests
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Get specific test result by ID
// @route   GET /api/tests/:id
// @access  Private
exports.getTestResult = async (req, res, next) => {
  try {
    const testSession = await TestSession.findById(req.params.id)
      .populate({
        path: 'questions',
        select: 'questionText options correctAnswer explanation category subject topic media sourceUrl'
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
        message: 'Not authorized to view this test'
      });
    }

    res.status(200).json({
      success: true,
      data: testSession
    });

  } catch (error) {
    next(error);
  }
};
