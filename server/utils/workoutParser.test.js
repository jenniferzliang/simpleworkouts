const WorkoutParser = require('./workoutParser');

// Mock the models for testing
jest.mock('../models', () => ({
  Exercise: {
    findOne: jest.fn()
  },
  ExerciseAlias: {
    findOne: jest.fn()
  }
}));

describe('WorkoutParser', () => {
  let parser;
  
  beforeEach(() => {
    parser = new WorkoutParser();
    // Reset mocks
    jest.clearAllMocks();
  });

  describe('tokenizeLine', () => {
    test('should tokenize line correctly', () => {
      const tokens = parser.tokenizeLine('Bench Press 3x5x135');
      expect(tokens).toEqual(['bench', 'press', '3x5x135']);
    });

    test('should handle separators', () => {
      const tokens = parser.tokenizeLine('Bench Press, 3x5x135; notes');
      expect(tokens).toEqual(['bench', 'press', '3x5x135', 'notes']);
    });
  });

  describe('extractExerciseName', () => {
    test('should extract exercise name before numbers', () => {
      const tokens = ['bench', 'press', '3x5x135'];
      const name = parser.extractExerciseName(tokens);
      expect(name).toBe('bench press');
    });

    test('should stop at x token', () => {
      const tokens = ['pull', 'ups', '3', 'x', '8', 'bw'];
      const name = parser.extractExerciseName(tokens);
      expect(name).toBe('pull ups');
    });
  });

  describe('detectParsingMode', () => {
    test('should detect aggregate mode for 3x5x135', () => {
      const tokens = ['3x5x135'];
      const mode = parser.detectParsingMode(tokens);
      expect(mode).toBe('aggregate');
    });

    test('should detect per-set mode for multiple rep x weight', () => {
      const tokens = ['10x40kg', '10x45kg', '8x45kg'];
      const mode = parser.detectParsingMode(tokens);
      expect(mode).toBe('per-set');
    });

    test('should detect reps-only mode', () => {
      const tokens = ['12', '10', '8'];
      const mode = parser.detectParsingMode(tokens);
      expect(mode).toBe('reps-only');
    });
  });

  describe('parseAggregateSets', () => {
    test('should parse 3x5x135 format', () => {
      const tokens = ['3x5x135'];
      const sets = parser.parseAggregateSets(tokens, 'lb', false);
      
      expect(sets).toHaveLength(3);
      expect(sets[0]).toEqual({
        setNumber: 1,
        reps: 5,
        weight: 135,
        unit: 'lb',
        isBodyweight: false
      });
    });

    test('should parse 3x8 bw format', () => {
      const tokens = ['3x8', 'bw'];
      const sets = parser.parseAggregateSets(tokens, 'lb', false);
      
      expect(sets).toHaveLength(3);
      expect(sets[0]).toEqual({
        setNumber: 1,
        reps: 8,
        weight: null,
        unit: null,
        isBodyweight: true
      });
    });
  });

  describe('parseRepsOnlySets', () => {
    test('should parse reps-only format', () => {
      const tokens = ['12', '10', '8'];
      const sets = parser.parseRepsOnlySets(tokens);
      
      expect(sets).toHaveLength(3);
      expect(sets[0]).toEqual({
        setNumber: 1,
        reps: 12,
        weight: null,
        unit: null,
        isBodyweight: true
      });
    });
  });

  describe('parseWeight', () => {
    test('should extract weight from token', () => {
      expect(parser.parseWeight('135')).toBe(135);
      expect(parser.parseWeight('135kg')).toBe(135);
      expect(parser.parseWeight('45.5lb')).toBe(45.5);
    });
  });

  describe('extractUnit', () => {
    test('should extract units', () => {
      expect(parser.extractUnit('135kg')).toBe('kg');
      expect(parser.extractUnit('135lb')).toBe('lb');
      expect(parser.extractUnit('135lbs')).toBe('lb');
      expect(parser.extractUnit('135')).toBeNull();
    });
  });
});

module.exports = WorkoutParser;