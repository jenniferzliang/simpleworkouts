import { WorkoutParser } from './workoutParser';
import * as exerciseDatabase from './exerciseDatabase';

// Mock the exercise database
jest.mock('./exerciseDatabase', () => ({
  getExerciseByName: jest.fn((name: string) => {
    const exercises: { [key: string]: any } = {
      'bench press': { name: 'Bench Press', category: 'push', isBodyweight: false },
      'bench': { name: 'Bench Press', category: 'push', isBodyweight: false },
      'pull ups': { name: 'Pull-ups', category: 'pull', isBodyweight: true },
      'pullups': { name: 'Pull-ups', category: 'pull', isBodyweight: true },
      'pull-ups': { name: 'Pull-ups', category: 'pull', isBodyweight: true },
      'squat': { name: 'Squat', category: 'legs', isBodyweight: false },
      'squats': { name: 'Squat', category: 'legs', isBodyweight: false },
      'push ups': { name: 'Push-ups', category: 'push', isBodyweight: true },
      'pushups': { name: 'Push-ups', category: 'push', isBodyweight: true },
      'push-ups': { name: 'Push-ups', category: 'push', isBodyweight: true },
      'deadlift': { name: 'Deadlift', category: 'pull', isBodyweight: false },
    };
    return exercises[name.toLowerCase().trim()] || null;
  }),
}));

describe('WorkoutParser', () => {
  let parser: WorkoutParser;

  beforeEach(() => {
    parser = new WorkoutParser();
    jest.clearAllMocks();
  });

  describe('Tokenization', () => {
    test('should tokenize basic line correctly', () => {
      const result = parser.parseWorkoutText('Bench Press 3x5x135');
      expect(result.tokens[0].tokens).toEqual(['bench', 'press', '3', 'x', '5', 'x', '135']);
    });

    test('should handle commas and semicolons as separators', () => {
      const result = parser.parseWorkoutText('Bench Press, 3x5x135; notes');
      expect(result.tokens[0].tokens).toEqual(['bench', 'press', '3', 'x', '5', 'x', '135', 'notes']);
    });

    test('should split compact notation into tokens', () => {
      const result = parser.parseWorkoutText('Bench 3x5x135');
      expect(result.tokens[0].tokens).toEqual(['bench', '3', 'x', '5', 'x', '135']);
    });

    test('should handle multiple spaces', () => {
      const result = parser.parseWorkoutText('Bench   Press    3x5x135');
      expect(result.tokens[0].tokens).toEqual(['bench', 'press', '3', 'x', '5', 'x', '135']);
    });

    test('should convert to lowercase', () => {
      const result = parser.parseWorkoutText('BENCH PRESS 3X5X135');
      expect(result.tokens[0].tokens).toEqual(['bench', 'press', '3', 'x', '5', 'x', '135']);
    });
  });

  describe('Exercise Name Extraction', () => {
    test('should extract single-word exercise name', () => {
      const result = parser.parseWorkoutText('Squat 3x5x225');
      expect(result.exercises[0].exercise.name).toBe('Squat');
    });

    test('should extract multi-word exercise name', () => {
      const result = parser.parseWorkoutText('Bench Press 3x5x135');
      expect(result.exercises[0].exercise.name).toBe('Bench Press');
    });

    test('should stop at first number', () => {
      const result = parser.parseWorkoutText('Pull Ups 3 x 8 bw');
      expect(result.exercises[0].exercise.name).toBe('Pull Ups');
    });

    test('should stop at x token', () => {
      const result = parser.parseWorkoutText('Bench Press x 5 x 135');
      expect(result.exercises[0].exercise.name).toBe('Bench Press');
    });

    test('should format unknown exercise names with capital letters', () => {
      const result = parser.parseWorkoutText('new exercise 3x5');
      expect(result.exercises[0].exercise.name).toBe('New Exercise');
    });
  });

  describe('Parsing Mode Detection', () => {
    test('should detect aggregate mode for 3x5x135 format', () => {
      const result = parser.parseWorkoutText('Bench Press 3x5x135');
      expect(result.exercises[0].mode).toBe('aggregate');
    });

    test('should detect aggregate mode for 3x5 format (no weight)', () => {
      const result = parser.parseWorkoutText('Pull Ups 3x8');
      expect(result.exercises[0].mode).toBe('aggregate');
    });

    test('should detect per-set mode for multiple rep x weight pairs', () => {
      const result = parser.parseWorkoutText('Bench Press 10 x 135 8 x 155 6 x 175');
      expect(result.exercises[0].mode).toBe('per-set');
    });

    test('should detect reps-only mode for bodyweight exercises', () => {
      const result = parser.parseWorkoutText('Push Ups 12 10 8');
      expect(result.exercises[0].mode).toBe('reps-only');
    });
  });

  describe('Aggregate Format Parsing', () => {
    test('should parse 3x5x135 format correctly', () => {
      const result = parser.parseWorkoutText('Bench Press 3x5x135', 'lb');

      expect(result.exercises).toHaveLength(1);
      expect(result.exercises[0].sets).toHaveLength(3);

      expect(result.exercises[0].sets[0]).toEqual({
        setNumber: 1,
        reps: 5,
        weight: 135,
        unit: 'lb',
        isBodyweight: false,
      });

      expect(result.exercises[0].sets[2]).toEqual({
        setNumber: 3,
        reps: 5,
        weight: 135,
        unit: 'lb',
        isBodyweight: false,
      });
    });

    test('should parse 3x8 bodyweight format', () => {
      const result = parser.parseWorkoutText('Pull Ups 3x8 bw');

      expect(result.exercises[0].sets).toHaveLength(3);
      expect(result.exercises[0].sets[0]).toEqual({
        setNumber: 1,
        reps: 8,
        weight: null,
        unit: null,
        isBodyweight: true,
      });
    });

    test('should handle kg unit preference', () => {
      const result = parser.parseWorkoutText('Bench Press 3x5x100', 'kg');

      expect(result.exercises[0].sets[0]).toEqual({
        setNumber: 1,
        reps: 5,
        weight: 100,
        unit: 'kg',
        isBodyweight: false,
      });
    });

    test('should parse bodyweight exercise without bw marker', () => {
      const result = parser.parseWorkoutText('Pull Ups 3x10');

      expect(result.exercises[0].sets[0].isBodyweight).toBe(true);
      expect(result.exercises[0].sets[0].weight).toBeNull();
      expect(result.exercises[0].sets[0].unit).toBeNull();
    });

    test('should parse 5x5 format (no weight)', () => {
      const result = parser.parseWorkoutText('Squat 5x5');

      expect(result.exercises[0].sets).toHaveLength(5);
      expect(result.exercises[0].sets[0].reps).toBe(5);
    });
  });

  describe('Per-Set Format Parsing', () => {
    test('should parse multiple rep x weight pairs', () => {
      const result = parser.parseWorkoutText('Bench Press 10 x 135 8 x 155 6 x 175', 'lb');

      expect(result.exercises[0].sets).toHaveLength(3);
      expect(result.exercises[0].mode).toBe('per-set');

      expect(result.exercises[0].sets[0]).toEqual({
        setNumber: 1,
        reps: 10,
        weight: 135,
        unit: 'lb',
        isBodyweight: false,
      });

      expect(result.exercises[0].sets[1]).toEqual({
        setNumber: 2,
        reps: 8,
        weight: 155,
        unit: 'lb',
        isBodyweight: false,
      });

      expect(result.exercises[0].sets[2]).toEqual({
        setNumber: 3,
        reps: 6,
        weight: 175,
        unit: 'lb',
        isBodyweight: false,
      });
    });

    test('should parse per-set with commas between sets', () => {
      const result = parser.parseWorkoutText('Bench Press 10 x 135, 8 x 155, 6 x 175', 'lb');

      expect(result.exercises[0].sets).toHaveLength(3);
      expect(result.exercises[0].mode).toBe('per-set');

      expect(result.exercises[0].sets[0]).toEqual({
        setNumber: 1,
        reps: 10,
        weight: 135,
        unit: 'lb',
        isBodyweight: false,
      });

      expect(result.exercises[0].sets[1]).toEqual({
        setNumber: 2,
        reps: 8,
        weight: 155,
        unit: 'lb',
        isBodyweight: false,
      });

      expect(result.exercises[0].sets[2]).toEqual({
        setNumber: 3,
        reps: 6,
        weight: 175,
        unit: 'lb',
        isBodyweight: false,
      });
    });

    test('should parse with explicit kg units', () => {
      const result = parser.parseWorkoutText('Bench Press 10 x 40kg 10 x 45kg 8 x 45kg');

      expect(result.exercises[0].mode).toBe('per-set');
      expect(result.exercises[0].sets).toHaveLength(3);

      expect(result.exercises[0].sets[0]).toEqual({
        setNumber: 1,
        reps: 10,
        weight: 40,
        unit: 'kg',
        isBodyweight: false,
      });

      expect(result.exercises[0].sets[1].weight).toBe(45);
      expect(result.exercises[0].sets[1].unit).toBe('kg');
    });

    test('should parse with explicit lb/lbs units', () => {
      const result = parser.parseWorkoutText('Squat 10 x 135lb 8 x 155lbs 6 x 175lb');

      expect(result.exercises[0].sets[0].unit).toBe('lb');
      expect(result.exercises[0].sets[1].unit).toBe('lb');
      expect(result.exercises[0].sets[2].unit).toBe('lb');
    });

    test('should handle decimal weights', () => {
      const result = parser.parseWorkoutText('Bench Press 10 x 45.5 8 x 50.5');

      expect(result.exercises[0].mode).toBe('per-set');
      expect(result.exercises[0].sets[0].weight).toBe(45.5);
      expect(result.exercises[0].sets[1].weight).toBe(50.5);
    });

    test('should parse bodyweight with x notation', () => {
      const result = parser.parseWorkoutText('Pull Ups 3 x 10 bw');

      expect(result.exercises[0].sets[0]).toEqual({
        setNumber: 1,
        reps: 10,
        weight: null,
        unit: null,
        isBodyweight: true,
      });
    });

    test('should parse comma-separated reps with same weight', () => {
      const result = parser.parseWorkoutText('Bench Press 7,8x85', 'lb');

      expect(result.exercises[0].mode).toBe('per-set');
      expect(result.exercises[0].sets).toHaveLength(2);

      expect(result.exercises[0].sets[0]).toEqual({
        setNumber: 1,
        reps: 7,
        weight: 85,
        unit: 'lb',
        isBodyweight: false,
      });

      expect(result.exercises[0].sets[1]).toEqual({
        setNumber: 2,
        reps: 8,
        weight: 85,
        unit: 'lb',
        isBodyweight: false,
      });
    });

    test('should parse multiple reps with same weight', () => {
      const result = parser.parseWorkoutText('Squat 10,10,8,6x135kg');

      expect(result.exercises[0].mode).toBe('per-set');
      expect(result.exercises[0].sets).toHaveLength(4);

      expect(result.exercises[0].sets[0].reps).toBe(10);
      expect(result.exercises[0].sets[0].weight).toBe(135);
      expect(result.exercises[0].sets[0].unit).toBe('kg');

      expect(result.exercises[0].sets[1].reps).toBe(10);
      expect(result.exercises[0].sets[1].weight).toBe(135);

      expect(result.exercises[0].sets[2].reps).toBe(8);
      expect(result.exercises[0].sets[2].weight).toBe(135);

      expect(result.exercises[0].sets[3].reps).toBe(6);
      expect(result.exercises[0].sets[3].weight).toBe(135);
    });

    test('should parse comma-separated reps with different weights', () => {
      const result = parser.parseWorkoutText('overhead press 7,8x25, 6x30', 'lb');

      expect(result.exercises[0].sets).toHaveLength(3);

      // First set: 7 reps @ 25
      expect(result.exercises[0].sets[0].reps).toBe(7);
      expect(result.exercises[0].sets[0].weight).toBe(25);

      // Second set: 8 reps @ 25
      expect(result.exercises[0].sets[1].reps).toBe(8);
      expect(result.exercises[0].sets[1].weight).toBe(25);

      // Third set: 6 reps @ 30
      expect(result.exercises[0].sets[2].reps).toBe(6);
      expect(result.exercises[0].sets[2].weight).toBe(30);
    });

    test('should parse per-set followed by comma-separated reps', () => {
      const result = parser.parseWorkoutText('ohp 6x25 7,8x35', 'lb');

      expect(result.exercises[0].sets).toHaveLength(3);

      // First set: 6 reps @ 25
      expect(result.exercises[0].sets[0].reps).toBe(6);
      expect(result.exercises[0].sets[0].weight).toBe(25);

      // Second set: 7 reps @ 35
      expect(result.exercises[0].sets[1].reps).toBe(7);
      expect(result.exercises[0].sets[1].weight).toBe(35);

      // Third set: 8 reps @ 35
      expect(result.exercises[0].sets[2].reps).toBe(8);
      expect(result.exercises[0].sets[2].weight).toBe(35);
    });

    test('should parse mixed format: aggregate followed by per-set', () => {
      const result = parser.parseWorkoutText('Bench Press 2x8x30 8x35', 'lb');

      expect(result.exercises[0].sets).toHaveLength(3);

      // First 2 sets from aggregate (2x8x30)
      expect(result.exercises[0].sets[0]).toEqual({
        setNumber: 1,
        reps: 8,
        weight: 30,
        unit: 'lb',
        isBodyweight: false,
      });

      expect(result.exercises[0].sets[1]).toEqual({
        setNumber: 2,
        reps: 8,
        weight: 30,
        unit: 'lb',
        isBodyweight: false,
      });

      // Third set from per-set (8x35)
      expect(result.exercises[0].sets[2]).toEqual({
        setNumber: 3,
        reps: 8,
        weight: 35,
        unit: 'lb',
        isBodyweight: false,
      });
    });

    test('should parse mixed format with multiple additional sets', () => {
      const result = parser.parseWorkoutText('Squat 3x5x135 5x155 5x175 3x185', 'lb');

      expect(result.exercises[0].sets).toHaveLength(6);

      // First 3 sets from aggregate (3x5x135)
      expect(result.exercises[0].sets[0].reps).toBe(5);
      expect(result.exercises[0].sets[0].weight).toBe(135);
      expect(result.exercises[0].sets[1].reps).toBe(5);
      expect(result.exercises[0].sets[1].weight).toBe(135);
      expect(result.exercises[0].sets[2].reps).toBe(5);
      expect(result.exercises[0].sets[2].weight).toBe(135);

      // Additional sets from per-set
      expect(result.exercises[0].sets[3].setNumber).toBe(4);
      expect(result.exercises[0].sets[3].reps).toBe(5);
      expect(result.exercises[0].sets[3].weight).toBe(155);

      expect(result.exercises[0].sets[4].setNumber).toBe(5);
      expect(result.exercises[0].sets[4].reps).toBe(5);
      expect(result.exercises[0].sets[4].weight).toBe(175);

      expect(result.exercises[0].sets[5].setNumber).toBe(6);
      expect(result.exercises[0].sets[5].reps).toBe(3);
      expect(result.exercises[0].sets[5].weight).toBe(185);
    });
  });

  describe('Reps-Only Format Parsing', () => {
    test('should parse space-separated reps', () => {
      const result = parser.parseWorkoutText('Push Ups 12 10 8');

      expect(result.exercises[0].sets).toHaveLength(3);

      expect(result.exercises[0].sets[0]).toEqual({
        setNumber: 1,
        reps: 12,
        weight: null,
        unit: null,
        isBodyweight: true,
      });

      expect(result.exercises[0].sets[1].reps).toBe(10);
      expect(result.exercises[0].sets[2].reps).toBe(8);
    });

    test('should handle single set', () => {
      const result = parser.parseWorkoutText('Push Ups 20');

      expect(result.exercises[0].sets).toHaveLength(1);
      expect(result.exercises[0].sets[0].reps).toBe(20);
    });

    test('should mark all sets as bodyweight', () => {
      const result = parser.parseWorkoutText('Sit Ups 15 15 15 15');

      expect(result.exercises[0].sets).toHaveLength(4);
      expect(result.exercises[0].sets.every(set => set.isBodyweight)).toBe(true);
      expect(result.exercises[0].sets.every(set => set.weight === null)).toBe(true);
    });
  });

  describe('Multiple Exercises', () => {
    test('should parse multiple exercises from multiple lines', () => {
      const text = `Bench Press 3x5x135
Squat 3x5x225
Deadlift 1x5x315`;

      const result = parser.parseWorkoutText(text, 'lb');

      expect(result.exercises).toHaveLength(3);
      expect(result.exercises[0].exercise.name).toBe('Bench Press');
      expect(result.exercises[1].exercise.name).toBe('Squat');
      expect(result.exercises[2].exercise.name).toBe('Deadlift');
    });

    test('should handle mix of formats', () => {
      const text = `Bench Press 3x5x135
Pull Ups 3x8 bw
Push Ups 12 10 8`;

      const result = parser.parseWorkoutText(text);

      expect(result.exercises).toHaveLength(3);
      expect(result.exercises[0].mode).toBe('aggregate');
      expect(result.exercises[1].mode).toBe('aggregate');
      expect(result.exercises[2].mode).toBe('reps-only');
    });

    test('should filter out empty lines', () => {
      const text = `Bench Press 3x5x135

Squat 3x5x225

Deadlift 1x5x315`;

      const result = parser.parseWorkoutText(text);

      expect(result.exercises).toHaveLength(3);
    });
  });

  describe('Warnings and Error Handling', () => {
    test('should warn about lines too short', () => {
      const result = parser.parseWorkoutText('Bench');

      expect(result.warnings).toHaveLength(1);
      expect(result.warnings[0].message).toContain('too short');
      expect(result.warnings[0].line).toBe(1);
    });

    test('should warn when no valid sets found', () => {
      const result = parser.parseWorkoutText('Bench Press x x x');

      expect(result.warnings.length).toBeGreaterThan(0);
    });

    test('should continue parsing after errors', () => {
      const text = `Bench Press 3x5x135
Invalid Line
Squat 3x5x225`;

      const result = parser.parseWorkoutText(text);

      expect(result.exercises.length).toBeGreaterThan(0);
      expect(result.warnings.length).toBeGreaterThan(0);
    });

    test('should include original text in warnings', () => {
      const result = parser.parseWorkoutText('Bad');

      expect(result.warnings[0].originalText).toBe('Bad');
    });
  });

  describe('Metadata', () => {
    test('should include parsing duration', () => {
      const result = parser.parseWorkoutText('Bench Press 3x5x135');

      expect(result.metadata?.duration).toBeDefined();
      expect(typeof result.metadata?.duration).toBe('number');
      expect(result.metadata?.duration).toBeGreaterThanOrEqual(0);
    });

    test('should include original text', () => {
      const text = 'Bench Press 3x5x135';
      const result = parser.parseWorkoutText(text);

      expect(result.metadata?.originalText).toBe(text);
    });

    test('should include unit preference', () => {
      const result = parser.parseWorkoutText('Bench Press 3x5x135', 'kg');

      expect(result.metadata?.unitPreference).toBe('kg');
    });

    test('should include timestamp', () => {
      const result = parser.parseWorkoutText('Bench Press 3x5x135');

      expect(result.metadata?.timestamp).toBeDefined();
      expect(new Date(result.metadata!.timestamp).toString()).not.toBe('Invalid Date');
    });
  });

  describe('Edge Cases', () => {
    test('should handle empty input', () => {
      const result = parser.parseWorkoutText('');

      expect(result.exercises).toHaveLength(0);
      expect(result.warnings).toHaveLength(0);
    });

    test('should handle whitespace-only input', () => {
      const result = parser.parseWorkoutText('   \n  \n   ');

      expect(result.exercises).toHaveLength(0);
      expect(result.warnings).toHaveLength(0);
    });

    test('should handle very large numbers', () => {
      const result = parser.parseWorkoutText('Leg Press 3x10x1000');

      expect(result.exercises[0].sets[0].weight).toBe(1000);
    });

    test('should handle single rep', () => {
      const result = parser.parseWorkoutText('Deadlift 1x1x500');

      expect(result.exercises[0].sets).toHaveLength(1);
      expect(result.exercises[0].sets[0].reps).toBe(1);
    });

    test('should handle high rep count', () => {
      const result = parser.parseWorkoutText('Push Ups 3x50');

      expect(result.exercises[0].sets[0].reps).toBe(50);
    });

    test('should preserve tokens for debugging', () => {
      const result = parser.parseWorkoutText('Bench Press 3x5x135');

      expect(result.tokens).toHaveLength(1);
      expect(result.tokens[0].line).toBe(1);
      expect(result.tokens[0].tokens).toBeDefined();
    });
  });

  describe('Exercise Categories', () => {
    test('should parse exercises and include category field', () => {
      const text = `Bench 3x5x135
Pullups 3x8
Squat 3x5x225`;

      const result = parser.parseWorkoutText(text);

      // Verify exercises are parsed correctly
      expect(result.exercises).toHaveLength(3);
      expect(result.exercises[0].exercise.name).toBe('Bench');
      expect(result.exercises[1].exercise.name).toBe('Pullups');
      expect(result.exercises[2].exercise.name).toBe('Squat');

      // Verify category field exists (actual value depends on exercise database integration)
      expect(result.exercises[0].exercise.category).toBeDefined();
      expect(result.exercises[1].exercise.category).toBeDefined();
      expect(result.exercises[2].exercise.category).toBeDefined();
    });

    test('should default to "other" category for unknown exercises', () => {
      const result = parser.parseWorkoutText('Custom Exercise 3x5x100');

      expect(result.exercises[0].exercise.category).toBe('other');
    });
  });

  describe('Format Verification', () => {
    test('should support all advertised formats', () => {
      // Test all 6 main format types
      const testCases = [
        // 1. Aggregate
        { input: 'Bench Press 3x5x135', expectedSets: 3, set1: { reps: 5, weight: 135 } },

        // 2. Per-set with spaces
        { input: 'Bench Press 10 x 135 8 x 155 6 x 175', expectedSets: 3, set1: { reps: 10, weight: 135 }, set3: { reps: 6, weight: 175 } },

        // 3. Per-set with commas
        { input: 'Bench Press 10 x 135, 8 x 155, 6 x 175', expectedSets: 3, set1: { reps: 10, weight: 135 }, set3: { reps: 6, weight: 175 } },

        // 4. Multi-rep same weight
        { input: 'Bench Press 7,8x85', expectedSets: 2, set1: { reps: 7, weight: 85 }, set2: { reps: 8, weight: 85 } },

        // 5. Multi-rep same weight extended
        { input: 'Squat 10,10,8,6x135kg', expectedSets: 4, set1: { reps: 10, weight: 135 }, set4: { reps: 6, weight: 135 } },

        // 6. Mixed format
        { input: 'Bench Press 2x8x30 8x35', expectedSets: 3, set1: { reps: 8, weight: 30 }, set3: { reps: 8, weight: 35 } },

        // 7. Reps-only
        { input: 'Push Ups 12 10 8', expectedSets: 3, set1: { reps: 12, weight: null } },

        // 8. Bodyweight with bw marker
        { input: 'Pull Ups 3x8 bw', expectedSets: 3, set1: { reps: 8, weight: null } },
      ];

      testCases.forEach(({ input, expectedSets, set1, set2, set3, set4 }) => {
        const result = parser.parseWorkoutText(input, 'lb');

        expect(result.exercises).toHaveLength(1);
        expect(result.exercises[0].sets).toHaveLength(expectedSets);

        if (set1) {
          expect(result.exercises[0].sets[0].reps).toBe(set1.reps);
          if (set1.weight !== undefined) {
            expect(result.exercises[0].sets[0].weight).toBe(set1.weight);
          }
        }

        if (set2) {
          expect(result.exercises[0].sets[1].reps).toBe(set2.reps);
          if (set2.weight !== undefined) {
            expect(result.exercises[0].sets[1].weight).toBe(set2.weight);
          }
        }

        if (set3) {
          expect(result.exercises[0].sets[2].reps).toBe(set3.reps);
          if (set3.weight !== undefined) {
            expect(result.exercises[0].sets[2].weight).toBe(set3.weight);
          }
        }

        if (set4) {
          expect(result.exercises[0].sets[3].reps).toBe(set4.reps);
          if (set4.weight !== undefined) {
            expect(result.exercises[0].sets[3].weight).toBe(set4.weight);
          }
        }
      });
    });

    test('should support complex combinations', () => {
      // Aggregate + progressive per-set
      const result1 = parser.parseWorkoutText('Squat 3x5x135 5x155 5x175 3x185', 'lb');
      expect(result1.exercises[0].sets).toHaveLength(6); // 3 + 1 + 1 + 1
      expect(result1.exercises[0].sets[0].weight).toBe(135);
      expect(result1.exercises[0].sets[0].reps).toBe(5);
      expect(result1.exercises[0].sets[3].weight).toBe(155);
      expect(result1.exercises[0].sets[4].weight).toBe(175);
      expect(result1.exercises[0].sets[5].weight).toBe(185);

      // Multi-rep same weight + additional sets
      const result2 = parser.parseWorkoutText('Bench 3x8x45 8,6x50kg', 'kg');
      expect(result2.exercises[0].sets).toHaveLength(5); // 3 + 2 (comma creates 2 sets)
      expect(result2.exercises[0].sets[0].reps).toBe(8);
      expect(result2.exercises[0].sets[0].weight).toBe(45);
      expect(result2.exercises[0].sets[3].reps).toBe(8);
      expect(result2.exercises[0].sets[3].weight).toBe(50);
      expect(result2.exercises[0].sets[4].reps).toBe(6);
      expect(result2.exercises[0].sets[4].weight).toBe(50);
    });
  });

  describe('Integration Tests', () => {
    test('should parse realistic full workout', () => {
      const text = `Bench Press 3x5x135
Squat 5x5x225
Deadlift 1x5x315
Pull Ups 3x8 bw
Push Ups 15 12 10`;

      const result = parser.parseWorkoutText(text, 'lb');

      expect(result.exercises).toHaveLength(5);
      expect(result.warnings).toHaveLength(0);

      // Verify first exercise (aggregate with weight)
      expect(result.exercises[0].sets).toHaveLength(3);
      expect(result.exercises[0].sets[0].weight).toBe(135);

      // Verify bodyweight exercises
      expect(result.exercises[3].sets[0].isBodyweight).toBe(true);
      expect(result.exercises[4].sets).toHaveLength(3);
    });

    test('should parse pyramid sets', () => {
      const result = parser.parseWorkoutText('Bench Press 12 x 95 10 x 115 8 x 135 6 x 155 8 x 135 10 x 115 12 x 95');

      expect(result.exercises[0].mode).toBe('per-set');
      expect(result.exercises[0].sets).toHaveLength(7);
      expect(result.exercises[0].sets[0].weight).toBe(95);
      expect(result.exercises[0].sets[3].weight).toBe(155);
      expect(result.exercises[0].sets[6].weight).toBe(95);
    });

    test('should handle mixed unit notations', () => {
      const result = parser.parseWorkoutText('Squat 5 x 100kg 5 x 110kg 5 x 120kg');

      expect(result.exercises[0].mode).toBe('per-set');
      expect(result.exercises[0].sets).toHaveLength(3);
      expect(result.exercises[0].sets[0].unit).toBe('kg');
      expect(result.exercises[0].sets[1].weight).toBe(110);
      expect(result.exercises[0].sets[2].weight).toBe(120);
    });
  });
});
