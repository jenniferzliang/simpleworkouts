const express = require('express');
const { body, validationResult } = require('express-validator');
const WorkoutParser = require('../utils/workoutParser');

const router = express.Router();

// POST /api/parse
// Parse workout text and return structured data
router.post('/',
  [
    body('text')
      .notEmpty()
      .withMessage('Text is required')
      .isLength({ max: 10000 })
      .withMessage('Text too long (max 10000 characters)'),
    body('unitPreference')
      .optional()
      .isIn(['kg', 'lb'])
      .withMessage('Unit preference must be kg or lb')
  ],
  async (req, res) => {
    try {
      // Check for validation errors
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        return res.status(400).json({
          error: 'Validation failed',
          details: errors.array()
        });
      }

      const { text, unitPreference = 'lb' } = req.body;
      
      const parser = new WorkoutParser();
      const startTime = Date.now();
      
      const result = await parser.parseWorkoutText(text, unitPreference);
      
      const duration = Date.now() - startTime;
      
      // Add parsing metadata
      result.metadata = {
        duration,
        originalText: text,
        unitPreference,
        timestamp: new Date().toISOString()
      };
      
      res.json(result);
      
    } catch (error) {
      console.error('Parse error:', error);
      res.status(500).json({
        error: 'Failed to parse workout text',
        message: error.message
      });
    }
  }
);

module.exports = router;