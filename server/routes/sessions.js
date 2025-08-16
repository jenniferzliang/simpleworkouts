const express = require('express');
const { body, query, validationResult } = require('express-validator');
const { WorkoutSession, WorkoutExercise, User } = require('../models');

const router = express.Router();

// For MVP, we'll use a default user - in production this would come from auth
const DEFAULT_USER_ID = '000000000000000000000001'; // Will be created in seed data

// POST /api/sessions
// Create a new workout session
router.post('/',
  [
    body('text')
      .notEmpty()
      .withMessage('Source text is required'),
    body('parsed')
      .isObject()
      .withMessage('Parsed data is required'),
    body('parsed.exercises')
      .isArray()
      .withMessage('Exercises array is required'),
    body('date')
      .optional()
      .isISO8601()
      .withMessage('Date must be valid ISO8601 format'),
    body('notes')
      .optional()
      .isLength({ max: 1000 })
      .withMessage('Notes too long (max 1000 characters)'),
    body('device')
      .optional()
      .isLength({ max: 100 })
      .withMessage('Device string too long')
  ],
  async (req, res) => {
    try {
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        return res.status(400).json({
          error: 'Validation failed',
          details: errors.array()
        });
      }

      const { text, parsed, date, notes, device } = req.body;
      const performedDate = date ? new Date(date) : new Date();
      
      // Create workout session
      const session = new WorkoutSession({
        userId: DEFAULT_USER_ID,
        performedAtLocal: performedDate,
        performedDate: performedDate.toISOString().split('T')[0], // YYYY-MM-DD
        sourceText: text,
        notes: notes || null,
        device: device || null
      });

      await session.save();

      // Create workout exercises
      const workoutExercises = [];
      
      for (let i = 0; i < parsed.exercises.length; i++) {
        const exerciseData = parsed.exercises[i];
        
        const workoutExercise = new WorkoutExercise({
          sessionId: session._id,
          exerciseId: exerciseData.exercise.id,
          sequence: i + 1,
          sets: exerciseData.sets
        });
        
        await workoutExercise.save();
        workoutExercises.push(workoutExercise);
      }

      // Recalculate session totals
      await session.recalculateTotals();

      // Prepare response with totals
      const totals = {
        tonnage: parseFloat(session.totalTonnage),
        bwReps: session.totalBwReps,
        totalSets: session.totalSets,
        totalReps: session.totalReps
      };

      res.status(201).json({
        sessionId: session._id,
        totals,
        exercises: workoutExercises.length,
        performedDate: session.performedDate
      });

    } catch (error) {
      console.error('Session creation error:', error);
      res.status(500).json({
        error: 'Failed to create workout session',
        message: error.message
      });
    }
  }
);

// GET /api/sessions
// List user's workout sessions with pagination
router.get('/',
  [
    query('limit')
      .optional()
      .isInt({ min: 1, max: 100 })
      .withMessage('Limit must be between 1 and 100'),
    query('cursor')
      .optional()
      .isMongoId()
      .withMessage('Cursor must be valid ObjectId'),
    query('startDate')
      .optional()
      .isISO8601()
      .withMessage('Start date must be valid ISO8601'),
    query('endDate')
      .optional()
      .isISO8601()
      .withMessage('End date must be valid ISO8601')
  ],
  async (req, res) => {
    try {
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        return res.status(400).json({
          error: 'Validation failed',
          details: errors.array()
        });
      }

      const { 
        limit = 20, 
        cursor, 
        startDate, 
        endDate 
      } = req.query;

      // Build query
      const query = { userId: DEFAULT_USER_ID };
      
      if (cursor) {
        query._id = { $lt: cursor };
      }
      
      if (startDate || endDate) {
        query.performedDate = {};
        if (startDate) query.performedDate.$gte = startDate;
        if (endDate) query.performedDate.$lte = endDate;
      }

      const sessions = await WorkoutSession
        .find(query)
        .sort({ performedDate: -1, _id: -1 })
        .limit(parseInt(limit))
        .select('performedDate sourceText totalTonnage totalSets totalReps totalBwReps notes createdAt');

      // Get next cursor
      const nextCursor = sessions.length === parseInt(limit) 
        ? sessions[sessions.length - 1]._id 
        : null;

      res.json({
        sessions: sessions.map(session => ({
          id: session._id,
          performedDate: session.performedDate,
          sourceText: session.sourceText,
          totals: {
            tonnage: parseFloat(session.totalTonnage),
            sets: session.totalSets,
            reps: session.totalReps,
            bwReps: session.totalBwReps
          },
          notes: session.notes,
          createdAt: session.createdAt
        })),
        pagination: {
          hasMore: !!nextCursor,
          nextCursor
        }
      });

    } catch (error) {
      console.error('Sessions list error:', error);
      res.status(500).json({
        error: 'Failed to fetch sessions',
        message: error.message
      });
    }
  }
);

// GET /api/sessions/:id
// Get detailed session with exercises and sets
router.get('/:id',
  async (req, res) => {
    try {
      const { id } = req.params;
      
      const session = await WorkoutSession.findById(id);
      if (!session) {
        return res.status(404).json({ error: 'Session not found' });
      }

      // Get exercises for this session
      const exercises = await WorkoutExercise
        .find({ sessionId: id })
        .populate('exerciseId', 'canonicalName category isBodyweight')
        .sort({ sequence: 1 });

      res.json({
        id: session._id,
        performedDate: session.performedDate,
        performedAtLocal: session.performedAtLocal,
        sourceText: session.sourceText,
        notes: session.notes,
        device: session.device,
        totals: {
          tonnage: parseFloat(session.totalTonnage),
          sets: session.totalSets,
          reps: session.totalReps,
          bwReps: session.totalBwReps
        },
        exercises: exercises.map(ex => ({
          id: ex._id,
          exercise: {
            id: ex.exerciseId._id,
            name: ex.exerciseId.canonicalName,
            category: ex.exerciseId.category,
            isBodyweight: ex.exerciseId.isBodyweight
          },
          sequence: ex.sequence,
          sets: ex.sets.map(set => ({
            setNumber: set.setNumber,
            reps: set.reps,
            weight: set.weight ? parseFloat(set.weight) : null,
            unit: set.unit,
            isBodyweight: set.isBodyweight
          })),
          totals: {
            tonnage: parseFloat(ex.totalTonnage),
            sets: ex.totalSets,
            reps: ex.totalReps,
            bwReps: ex.totalBwReps
          }
        })),
        createdAt: session.createdAt,
        updatedAt: session.updatedAt
      });

    } catch (error) {
      console.error('Session detail error:', error);
      res.status(500).json({
        error: 'Failed to fetch session details',
        message: error.message
      });
    }
  }
);

module.exports = router;