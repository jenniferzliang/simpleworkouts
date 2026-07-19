import { buildExport, parseImportFile, EXPORT_VERSION } from './importExport';
import { importSessions, getSessions, WorkoutSession } from './localStorage';

const makeSession = (overrides: Partial<WorkoutSession> = {}): WorkoutSession => ({
  sessionId: 'session-1',
  performedDate: '2026-07-01',
  performedAtLocal: '2026-07-01T10:00:00.000Z',
  sourceText: 'Bench Press 3x5x135',
  exercises: [
    {
      exerciseId: 'ex-1',
      exerciseName: 'Bench Press',
      sequence: 1,
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

describe('buildExport', () => {
  it('includes version, settings, and all sessions', () => {
    localStorage.setItem('workout_sessions', JSON.stringify([makeSession()]));

    const data = buildExport();

    expect(data.app).toBe('simpleworkouts');
    expect(data.version).toBe(EXPORT_VERSION);
    expect(data.exportedAt).toBeTruthy();
    expect(data.settings.unitPreference).toBeDefined();
    expect(data.sessions).toHaveLength(1);
    expect(data.sessions[0].sessionId).toBe('session-1');
  });
});

describe('parseImportFile', () => {
  it('parses a full export file', () => {
    const text = JSON.stringify({
      app: 'simpleworkouts',
      version: 1,
      exportedAt: '2026-07-01T00:00:00.000Z',
      settings: { unitPreference: 'lb', timezone: 'UTC' },
      sessions: [makeSession()],
    });

    const { sessions, errors } = parseImportFile(text);

    expect(errors).toHaveLength(0);
    expect(sessions).toHaveLength(1);
    expect(sessions[0].sessionId).toBe('session-1');
    expect(sessions[0].exercises[0].exerciseName).toBe('Bench Press');
  });

  it('parses a bare array of sessions', () => {
    const { sessions, errors } = parseImportFile(JSON.stringify([makeSession()]));

    expect(errors).toHaveLength(0);
    expect(sessions).toHaveLength(1);
  });

  it('rejects malformed JSON', () => {
    const { sessions, errors } = parseImportFile('{"sessions": [truncated');

    expect(sessions).toHaveLength(0);
    expect(errors).toEqual(['File is not valid JSON']);
  });

  it('rejects unrecognized formats', () => {
    const { sessions, errors } = parseImportFile(JSON.stringify({ foo: 'bar' }));

    expect(sessions).toHaveLength(0);
    expect(errors).toHaveLength(1);
    expect(errors[0]).toContain('Unrecognized file format');
  });

  it('skips sessions with a missing or malformed date and reports them', () => {
    const bad = { ...makeSession(), performedDate: 'July 1st' };
    const { sessions, errors } = parseImportFile(JSON.stringify([bad, makeSession()]));

    expect(sessions).toHaveLength(1);
    expect(errors).toHaveLength(1);
    expect(errors[0]).toContain('Workout 1');
    expect(errors[0]).toContain('performedDate');
  });

  it('skips sessions with no valid exercises', () => {
    const bad = { ...makeSession(), exercises: [{ exerciseName: '', sets: [] }] };
    const { sessions, errors } = parseImportFile(JSON.stringify([bad]));

    expect(sessions).toHaveLength(0);
    expect(errors[0]).toContain('no valid exercises');
  });

  it('recomputes totals instead of trusting the file', () => {
    const tampered = makeSession({ totalTonnage: 999999 });
    tampered.exercises[0].totalTonnage = 999999;

    const { sessions } = parseImportFile(JSON.stringify([tampered]));

    expect(sessions[0].totalTonnage).toBe(2025);
    expect(sessions[0].exercises[0].totalTonnage).toBe(2025);
  });

  it('counts bodyweight reps and drops invalid sets', () => {
    const session = {
      performedDate: '2026-07-02',
      exercises: [
        {
          exerciseName: 'Push-ups',
          sets: [
            { reps: 12, weight: null, unit: null, isBodyweight: true },
            { reps: -5, weight: null, unit: null, isBodyweight: true },
            { reps: 10, weight: null, unit: null, isBodyweight: true },
          ],
        },
      ],
    };

    const { sessions } = parseImportFile(JSON.stringify([session]));

    expect(sessions[0].exercises[0].sets).toHaveLength(2);
    expect(sessions[0].totalBwReps).toBe(22);
    expect(sessions[0].totalTonnage).toBe(0);
  });

  it('generates ids for sessions that lack them', () => {
    const session = makeSession();
    delete (session as any).sessionId;

    const { sessions } = parseImportFile(JSON.stringify([session]));

    expect(sessions[0].sessionId).toBeTruthy();
  });

  it('skips sessions duplicated within the file', () => {
    const { sessions, errors } = parseImportFile(
      JSON.stringify([makeSession(), makeSession()])
    );

    expect(sessions).toHaveLength(1);
    expect(errors[0]).toContain('duplicated in file');
  });
});

describe('importSessions', () => {
  it('appends new sessions and skips ones already in history', () => {
    localStorage.setItem('workout_sessions', JSON.stringify([makeSession()]));

    const result = importSessions([
      makeSession(), // duplicate of existing
      makeSession({ sessionId: 'session-2', performedDate: '2026-07-02' }),
    ]);

    expect(result).toEqual({ imported: 1, skipped: 1 });
    expect(getSessions()).toHaveLength(2);
  });
});
