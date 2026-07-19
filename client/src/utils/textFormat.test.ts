import { buildTextExport, splitTextBlocks } from './textFormat';
import { parseImportFile } from './importExport';
import { WorkoutSession } from './localStorage';

const session = (overrides: Partial<WorkoutSession> = {}): WorkoutSession => ({
  sessionId: 's1',
  performedDate: '2026-07-01',
  performedAtLocal: '2026-07-01T10:00:00.000Z',
  sourceText: '',
  exercises: [
    {
      exerciseId: 'bench-press',
      exerciseName: 'Bench Press',
      sequence: 0,
      sets: [
        { setNumber: 1, reps: 5, weight: 135, unit: 'lb', isBodyweight: false },
        { setNumber: 2, reps: 5, weight: 135, unit: 'lb', isBodyweight: false },
        { setNumber: 3, reps: 5, weight: 135, unit: 'lb', isBodyweight: false },
      ],
      totalSets: 3,
      totalReps: 15,
      totalTonnage: 2025,
      totalBwReps: 0,
    },
  ],
  totalSets: 3,
  totalReps: 15,
  totalTonnage: 2025,
  totalBwReps: 0,
  ...overrides,
});

beforeEach(() => {
  localStorage.clear();
});

describe('buildTextExport', () => {
  it('writes uniform weighted sets in aggregate notation under a date header', () => {
    const text = buildTextExport([session()]);

    expect(text).toBe('# 2026-07-01\nBench Press 3x5x135lb\n');
  });

  it('writes bodyweight exercises as a reps list', () => {
    const s = session();
    s.exercises = [
      {
        exerciseId: 'push-ups',
        exerciseName: 'Push-ups',
        sequence: 0,
        sets: [
          { setNumber: 1, reps: 12, weight: null, unit: null, isBodyweight: true },
          { setNumber: 2, reps: 10, weight: null, unit: null, isBodyweight: true },
          { setNumber: 3, reps: 8, weight: null, unit: null, isBodyweight: true },
        ],
        totalSets: 3,
        totalReps: 30,
        totalTonnage: 0,
        totalBwReps: 30,
      },
    ];

    expect(buildTextExport([s])).toBe('# 2026-07-01\nPush-ups 12 10 8\n');
  });

  it('writes non-uniform weighted sets per set', () => {
    const s = session();
    s.exercises[0].sets = [
      { setNumber: 1, reps: 12, weight: 40, unit: 'kg', isBodyweight: false },
      { setNumber: 2, reps: 10, weight: 45, unit: 'kg', isBodyweight: false },
    ];

    expect(buildTextExport([s])).toBe('# 2026-07-01\nBench Press 12x40kg 10x45kg\n');
  });

  it('sorts sessions by date and separates them with blank lines', () => {
    const later = session({ sessionId: 's2', performedDate: '2026-07-08' });
    const text = buildTextExport([later, session()]);

    expect(text).toBe(
      '# 2026-07-01\nBench Press 3x5x135lb\n\n# 2026-07-08\nBench Press 3x5x135lb\n'
    );
  });
});

describe('splitTextBlocks', () => {
  it('groups lines under date headers and ignores comments', () => {
    const blocks = splitTextBlocks(
      '# my export\n# 2026-07-01\nBench 3x5x135\n\n2026-07-02\nSquat 5x5x225\n',
      '2026-07-16'
    );

    expect(blocks).toEqual([
      { date: '2026-07-01', lines: ['Bench 3x5x135'] },
      { date: '2026-07-02', lines: ['Squat 5x5x225'] },
    ]);
  });

  it('dates headerless content today', () => {
    const blocks = splitTextBlocks('Bench 3x5x135\n', '2026-07-16');

    expect(blocks).toEqual([{ date: '2026-07-16', lines: ['Bench 3x5x135'] }]);
  });
});

describe('parseImportFile with text input', () => {
  it('round-trips an exported text file into equivalent sessions', () => {
    const text = buildTextExport([session()]);
    const { sessions, errors } = parseImportFile(text);

    expect(errors).toHaveLength(0);
    expect(sessions).toHaveLength(1);
    expect(sessions[0].performedDate).toBe('2026-07-01');
    expect(sessions[0].exercises[0].exerciseName).toBe('Bench Press');
    expect(sessions[0].totalSets).toBe(3);
    expect(sessions[0].totalTonnage).toBe(2025);
  });

  it('parses multiple date blocks into separate sessions', () => {
    const { sessions, errors } = parseImportFile(
      '# 2026-07-01\nBench Press 3x5x135lb\n\n# 2026-07-02\nPush-ups 12 10 8\n'
    );

    expect(errors).toHaveLength(0);
    expect(sessions).toHaveLength(2);
    expect(sessions[1].totalBwReps).toBe(30);
    expect(sessions[1].sourceText).toBe('Push-ups 12 10 8');
  });

  it('reports unparseable lines but keeps the rest of the workout', () => {
    const { sessions, errors } = parseImportFile(
      '# 2026-07-01\nBench Press 3x5x135lb\nnonsense\n'
    );

    expect(sessions).toHaveLength(1);
    expect(sessions[0].exercises).toHaveLength(1);
    expect(errors).toHaveLength(1);
    expect(errors[0]).toContain('2026-07-01');
    expect(errors[0]).toContain('nonsense');
  });

  it('reports an empty file', () => {
    const { sessions, errors } = parseImportFile('\n# just a comment\n');

    expect(sessions).toHaveLength(0);
    expect(errors).toEqual(['No workouts found in file']);
  });
});
