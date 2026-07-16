// Import/export of workout data as JSON files
import { v4 as uuidv4 } from 'uuid';
import {
  WorkoutExercise,
  WorkoutSession,
  WorkoutSet,
  UserSettings,
  getSessions,
  getSettings,
} from './localStorage';

export const EXPORT_VERSION = 1;

export interface ExportData {
  app: 'simpleworkouts';
  version: number;
  exportedAt: string;
  settings: UserSettings;
  sessions: WorkoutSession[];
}

export interface ImportPreview {
  sessions: WorkoutSession[];
  errors: string[];
}

export function buildExport(): ExportData {
  return {
    app: 'simpleworkouts',
    version: EXPORT_VERSION,
    exportedAt: new Date().toISOString(),
    settings: getSettings(),
    sessions: getSessions(),
  };
}

export function exportFileName(date: Date = new Date()): string {
  return `simpleworkouts-export-${date.toISOString().split('T')[0]}.json`;
}

const isRecord = (value: unknown): value is Record<string, unknown> =>
  typeof value === 'object' && value !== null && !Array.isArray(value);

const isPositiveNumber = (value: unknown): value is number =>
  typeof value === 'number' && Number.isFinite(value) && value > 0;

function parseSet(raw: unknown, setNumber: number): WorkoutSet | null {
  if (!isRecord(raw) || !isPositiveNumber(raw.reps)) return null;

  const isBodyweight = raw.isBodyweight === true;
  const weight = !isBodyweight && isPositiveNumber(raw.weight) ? raw.weight : null;
  const unit = weight !== null && (raw.unit === 'kg' || raw.unit === 'lb') ? raw.unit : null;

  return { setNumber, reps: raw.reps, weight, unit, isBodyweight };
}

function parseExercise(raw: unknown, sequence: number): WorkoutExercise | null {
  if (!isRecord(raw)) return null;

  const name = raw.exerciseName;
  if (typeof name !== 'string' || !name.trim()) return null;
  if (!Array.isArray(raw.sets)) return null;

  const sets = raw.sets
    .map((set, index) => parseSet(set, index + 1))
    .filter((set): set is WorkoutSet => set !== null);
  if (sets.length === 0) return null;

  // Recompute cached totals rather than trusting the file
  const totalReps = sets.reduce((sum, set) => sum + set.reps, 0);
  const totalTonnage = sets.reduce(
    (sum, set) => sum + (set.weight !== null ? set.weight * set.reps : 0),
    0
  );
  const totalBwReps = sets.reduce(
    (sum, set) => (set.isBodyweight ? sum + set.reps : sum),
    0
  );

  return {
    exerciseId: typeof raw.exerciseId === 'string' && raw.exerciseId ? raw.exerciseId : uuidv4(),
    exerciseName: name.trim(),
    sequence,
    sets,
    totalSets: sets.length,
    totalReps,
    totalTonnage,
    totalBwReps,
  };
}

function parseSession(raw: unknown): WorkoutSession | string {
  if (!isRecord(raw)) return 'not a workout object';

  const performedDate = raw.performedDate;
  if (typeof performedDate !== 'string' || !/^\d{4}-\d{2}-\d{2}$/.test(performedDate)) {
    return 'missing or invalid performedDate (expected YYYY-MM-DD)';
  }

  if (!Array.isArray(raw.exercises) || raw.exercises.length === 0) {
    return 'no exercises';
  }

  const exercises = raw.exercises
    .map((exercise, index) => parseExercise(exercise, index + 1))
    .filter((exercise): exercise is WorkoutExercise => exercise !== null);
  if (exercises.length === 0) {
    return 'no valid exercises';
  }

  const performedAtLocal =
    typeof raw.performedAtLocal === 'string' && !isNaN(new Date(raw.performedAtLocal).getTime())
      ? raw.performedAtLocal
      : `${performedDate}T12:00:00.000Z`;

  return {
    sessionId: typeof raw.sessionId === 'string' && raw.sessionId ? raw.sessionId : uuidv4(),
    performedDate,
    performedAtLocal,
    sourceText: typeof raw.sourceText === 'string' ? raw.sourceText : '',
    ...(typeof raw.notes === 'string' && raw.notes ? { notes: raw.notes } : {}),
    exercises,
    totalSets: exercises.reduce((sum, ex) => sum + ex.totalSets, 0),
    totalReps: exercises.reduce((sum, ex) => sum + ex.totalReps, 0),
    totalTonnage: exercises.reduce((sum, ex) => sum + ex.totalTonnage, 0),
    totalBwReps: exercises.reduce((sum, ex) => sum + ex.totalBwReps, 0),
  };
}

// Parse an uploaded file's text into importable sessions plus per-item
// errors for anything skipped. Accepts a full export file or a bare
// array of workout sessions.
export function parseImportFile(text: string): ImportPreview {
  let data: unknown;
  try {
    data = JSON.parse(text);
  } catch {
    return { sessions: [], errors: ['File is not valid JSON'] };
  }

  const rawSessions = Array.isArray(data)
    ? data
    : isRecord(data) && Array.isArray(data.sessions)
    ? data.sessions
    : null;
  if (rawSessions === null) {
    return {
      sessions: [],
      errors: ['Unrecognized file format — expected a Simple Workouts export file or an array of workouts'],
    };
  }

  const sessions: WorkoutSession[] = [];
  const errors: string[] = [];
  const seenIds = new Set<string>();

  rawSessions.forEach((raw, index) => {
    const result = parseSession(raw);
    if (typeof result === 'string') {
      errors.push(`Workout ${index + 1}: ${result} — skipped`);
      return;
    }
    if (seenIds.has(result.sessionId)) {
      errors.push(`Workout ${index + 1}: duplicated in file — skipped`);
      return;
    }
    seenIds.add(result.sessionId);
    sessions.push(result);
  });

  return { sessions, errors };
}
