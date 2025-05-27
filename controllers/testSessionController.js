const TestSession = require('../models/TestSession');
const Question = require('../models/Question');

// @desc    Create a new test session with full question details
// @route   POST /api/tests
// @access  Private
exports.createTestSession = async (req, res, next) => {
  try {
    const { questionIds, difficulty, count } = req.body;

    if (!questionIds || !Array.isArray(questionIds) || questionIds.length === 0) {
      return res.status(400).json({
        success: false,
        message: 'Please provide an array of question IDs'
      });
    }

    const questions = await Question.find({ 
      _id: { $in: questionIds },
      approved: true
    }).select('questionText questionMedia options category subjects topics difficulty tags sourceUrl createdBy');

    if (questions.length !== questionIds.length) {
      return res.status(400).json({
        success: false,
        message: 'One or more questions not found or not approved'
      });
    }

    const totalOptions = questions.reduce((sum, q) => sum + q.options.length, 0);

    const testSession = await TestSession.create({
      student: req.user._id,
      questions: questionIds,
      totalQuestions: questionIds.length,
      totalOptions,
      filters: { difficulty, count },
      status: 'proceeding'
    });

    const response = {
      _id: testSession._id,
      student: testSession.student,
      questions: questions.map(q => ({
        _id: q._id,
        questionText: q.questionText,
        questionMedia: q.questionMedia,
        options: q.options,
        category: q.category,
        subjects: q.subjects,
        topics: q.topics,
        difficulty: q.difficulty,
        tags: q.tags,
        sourceUrl: q.sourceUrl,
        createdBy: q.createdBy
      })),
      totalQuestions: testSession.totalQuestions,
      totalOptions: testSession.totalOptions,
      correctAnswers: testSession.correctAnswers,
      incorrectAnswers: testSession.incorrectAnswers,
      flaggedAnswers: testSession.flaggedAnswers,
      filters: testSession.filters,
      status: testSession.status,
      startedAt: testSession.startedAt,
      createdAt: testSession.createdAt,
      updatedAt: testSession.updatedAt,
      __v: testSession.__v,
      scorePercentage: testSession.scorePercentage
    };

    res.status(201).json({
      success: true,
      data: response
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Get all test sessions for a student with category, subject, and topic filtering
// @route   GET /api/tests?status=<status>&category=<category>&subject=<subject>&topic=<topic>
// @access  Private
exports.getTestSessions = async (req, res, next) => {
  try {
    const { status, category, subject, topic } = req.query;

    // Build filter for test sessions
    const filter = { student: req.user._id };
    if (status) {
      filter.status = status;
    }

    // Build question match criteria
    const questionMatch = { approved: true };
    if (category) {
      questionMatch.category = category;
    }
    if (subject) {
      const subjectsArray = Array.isArray(subject) ? subject : [subject];
      questionMatch['subjects.name'] = { $in: subjectsArray };
    }
    if (topic) {
      const topicsArray = Array.isArray(topic) ? topic : [topic];
      questionMatch['subjects.topics'] = { $in: topicsArray };
    }

    // Aggregate test sessions
    const testSessions = await TestSession.aggregate([
      // Match test sessions for the student
      { $match: filter },
      // Lookup questions
      {
        $lookup: {
          from: 'questions',
          localField: 'questions',
          foreignField: '_id',
          as: 'questionDetails'
        }
      },
      // Unwind questionDetails to process each question
      { $unwind: { path: '$questionDetails', preserveNullAndEmptyArrays: true } },
      // Match questions based on filters
      { $match: { 'questionDetails': { $exists: true, $ne: null } } },
      {
        $match: {
          ...(category && { 'questionDetails.category': category }),
          ...(subject && {
            'questionDetails.subjects.name': {
              $in: Array.isArray(subject) ? subject : [subject]
            }
          }),
          ...(topic && {
            'questionDetails.subjects.topics': {
              $in: Array.isArray(topic) ? topic : [topic]
            }
          })
        }
      },
      // Group back by test session
      {
        $group: {
          _id: '$_id',
          student: { $first: '$student' },
          questions: { $push: '$questionDetails._id' },
          totalQuestions: { $first: '$totalQuestions' },
          totalOptions: { $first: '$totalOptions' },
          correctAnswers: { $first: '$correctAnswers' },
          incorrectAnswers: { $first: '$incorrectAnswers' },
          flaggedAnswers: { $first: '$flaggedAnswers' },
          filters: { $first: '$filters' },
          status: { $first: '$status' },
          startedAt: { $first: '$startedAt' },
          completedAt: { $first: '$completedAt' },
          createdAt: { $first: '$createdAt' },
          updatedAt: { $first: '$updatedAt' },
          questionDetails: { $push: '$questionDetails' }
        }
      },
      // Project the final fields and compute performance by category
      {
        $project: {
          _id: 1,
          student: 1,
          questions: 1,
          totalQuestions: 1,
          totalOptions: 1,
          correctAnswers: 1,
          incorrectAnswers: 1,
          flaggedAnswers: 1,
          filters: 1,
          status: 1,
          startedAt: 1,
          completedAt: 1,
          createdAt: 1,
          updatedAt: 1,
          scorePercentage: {
            $cond: {
              if: { $eq: ['$totalQuestions', 0] },
              then: 0,
              else: {
                $multiply: [
                  { $divide: ['$correctAnswers', '$totalQuestions'] },
                  100
                ]
              }
            }
          },
          performanceByCategory: {
            $reduce: {
              input: '$questionDetails',
              initialValue: {},
              in: {
                $let: {
                  vars: {
                    category: '$$this.category',
                    subjects: '$$this.subjects',
                    correctPerQuestion: {
                      $divide: ['$correctAnswers', '$totalQuestions']
                    },
                    incorrectPerQuestion: {
                      $divide: ['$incorrectAnswers', '$totalQuestions']
                    }
                  },
                  in: {
                    $mergeObjects: [
                      '$$value',
                      {
                        [ "$$category"]: {
                          subjects: {
                            $mergeObjects: [
                              { $ifNull: ['$$value[$$category].subjects', {}] },
                              {
                                $arrayToObject: {
                                  $map: {
                                    input: '$$subjects',
                                    as: 'subject',
                                    in: {
                                      k: '$$subject.name',
                                      v: {
                                        correctAnswers: {
                                          $add: [
                                            { $ifNull: ['$$value[$$category].subjects[$$subject.name].correctAnswers', 0] },
                                            '$$correctPerQuestion'
                                          ]
                                        },
                                        incorrectAnswers: {
                                          $add: [
                                            { $ifNull: ['$$value[$$category].subjects[$$subject.name].incorrectAnswers', 0] },
                                            '$$incorrectPerQuestion'
                                          ]
                                        }
                                      }
                                    }
                                  }
                                }
                              }
                            ]
                          }
                        }
                      }
                    ]
                  }
                }
              }
            }
          }
        }
      },
      // Sort by startedAt descending
      { $sort: { startedAt: -1 } }
    ]);

    res.status(200).json({
      success: true,
      count: testSessions.length,
      data: testSessions.map(session => ({
        ...session,
        scorePercentage: session.scorePercentage || 0
      }))
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Get a specific test session by ID
// @route   GET /api/tests/:testSessionId
// @access  Private
exports.getTestSessionById = async (req, res, next) => {
  try {
    const { testSessionId } = req.params;

    if (!testSessionId) {
      return res.status(400).json({
        success: false,
        message: 'Please provide a testSessionId'
      });
    }

    const testSession = await TestSession.findById(testSessionId)
      .populate({
        path: 'questions',
        select: 'questionText questionMedia options category subjects topics difficulty tags sourceUrl createdBy',
        match: { approved: true }
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
        message: 'Not authorized to access this test session'
      });
    }

    const response = {
      _id: testSession._id,
      student: testSession.student,
      questions: testSession.questions,
      totalQuestions: testSession.totalQuestions,
      totalOptions: testSession.totalOptions,
      correctAnswers: testSession.correctAnswers,
      incorrectAnswers: testSession.incorrectAnswers,
      flaggedAnswers: testSession.flaggedAnswers,
      filters: testSession.filters,
      status: testSession.status,
      startedAt: testSession.startedAt,
      completedAt: testSession.completedAt,
      createdAt: testSession.createdAt,
      updatedAt: testSession.updatedAt,
      __v: testSession.__v,
      scorePercentage: testSession.scorePercentage
    };

    res.status(200).json({
      success: true,
      data: response
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Complete or cancel a test session
// @route   PUT /api/tests/:testSessionId
// @access  Private
exports.updateTestSessionStatus = async (req, res, next) => {
  try {
    const { testSessionId } = req.params;
    const { status } = req.body;

    if (!testSessionId) {
      return res.status(400).json({
        success: false,
        message: 'Please provide testSessionId'
      });
    }

    if (!['succeeded', 'canceled'].includes(status)) {
      return res.status(400).json({
        success: false,
        message: 'Status must be either succeeded or canceled'
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
        message: 'Not authorized to update this test session'
      });
    }

    if (['succeeded', 'canceled'].includes(testSession.status)) {
      return res.status(400).json({
        success: false,
        message: 'Cannot update a completed or canceled test session'
      });
    }

    testSession.status = status;
    testSession.completedAt = Date.now();
    await testSession.save();

    res.status(200).json({
      success: true,
      data: testSession
    });
  } catch (error) {
    next(error);
  }
};