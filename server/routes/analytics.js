const express = require('express');
const { query, validationResult } = require('express-validator');
const { WorkoutSession } = require('../models');
const { authenticateToken } = require('../middleware/auth');

const router = express.Router();

// GET /api/analytics/weekly-tonnage
// Get weekly tonnage data for charts
router.get('/weekly-tonnage',
  authenticateToken,
  [
    query('range')
      .optional()
      .matches(/^\d+w$/)
      .withMessage('Range must be in format like "12w" for weeks'),
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

      const { range = '12w', startDate, endDate } = req.query;
      
      // Calculate date range
      let start, end;
      
      if (startDate && endDate) {
        start = new Date(startDate);
        end = new Date(endDate);
      } else {
        // Parse range (e.g., "12w" = 12 weeks)
        const weeks = parseInt(range.replace('w', ''));
        end = new Date();
        start = new Date();
        start.setDate(start.getDate() - (weeks * 7));
      }
      
      // Get sessions within date range
      const sessions = await WorkoutSession.find({
        userId: req.user._id,
        performedDate: {
          $gte: start.toISOString().split('T')[0],
          $lte: end.toISOString().split('T')[0]
        }
      }).select('performedDate totalTonnage totalSets totalReps totalBwReps');

      // Group by week
      const weeklyData = groupSessionsByWeek(sessions, start, end);
      
      res.json({
        data: weeklyData,
        range: {
          start: start.toISOString().split('T')[0],
          end: end.toISOString().split('T')[0],
          weeks: weeklyData.length
        },
        summary: {
          totalSessions: sessions.length,
          totalTonnage: sessions.reduce((sum, s) => sum + parseFloat(s.totalTonnage), 0),
          avgWeeklyTonnage: weeklyData.length > 0 
            ? weeklyData.reduce((sum, w) => sum + w.tonnage, 0) / weeklyData.length 
            : 0
        }
      });

    } catch (error) {
      console.error('Analytics error:', error);
      res.status(500).json({
        error: 'Failed to fetch analytics data',
        message: error.message
      });
    }
  }
);

// Helper function to group sessions by week
function groupSessionsByWeek(sessions, startDate, endDate) {
  const weeks = [];
  const current = new Date(startDate);
  
  while (current <= endDate) {
    // Calculate week start (Monday) and end (Sunday)
    const weekStart = new Date(current);
    const dayOfWeek = weekStart.getDay();
    const daysToMonday = dayOfWeek === 0 ? 6 : dayOfWeek - 1; // Sunday = 0, so adjust
    weekStart.setDate(weekStart.getDate() - daysToMonday);
    
    const weekEnd = new Date(weekStart);
    weekEnd.setDate(weekEnd.getDate() + 6);
    
    // Filter sessions for this week
    const weekSessions = sessions.filter(session => {
      const sessionDate = new Date(session.performedDate);
      return sessionDate >= weekStart && sessionDate <= weekEnd;
    });
    
    // Calculate weekly totals
    const weeklyTotals = {
      weekStart: weekStart.toISOString().split('T')[0],
      weekEnd: weekEnd.toISOString().split('T')[0],
      sessions: weekSessions.length,
      tonnage: weekSessions.reduce((sum, s) => sum + parseFloat(s.totalTonnage), 0),
      sets: weekSessions.reduce((sum, s) => sum + s.totalSets, 0),
      reps: weekSessions.reduce((sum, s) => sum + s.totalReps, 0),
      bwReps: weekSessions.reduce((sum, s) => sum + s.totalBwReps, 0)
    };
    
    weeks.push(weeklyTotals);
    
    // Move to next week
    current.setDate(current.getDate() + 7);
  }
  
  return weeks;
}

// Helper function is now accessible as a regular function

module.exports = router;