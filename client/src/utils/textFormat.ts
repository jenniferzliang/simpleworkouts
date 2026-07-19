// Plain-text export/import using the app's own workout notation.
// Sessions are written as `# YYYY-MM-DD` date headers followed by one
// exercise line per exercise; import re-parses each block with the
// regular WorkoutParser, so the text doesn't need to round-trip exactly.
import { WorkoutExercise, WorkoutSession, WorkoutSet } from './localStorage';
import { ParseResult } from './workoutParser';

const formatWeight = (set: WorkoutSet): string =>
  `${set.weight}${set.unit ?? ''}`;

function exerciseLine(exercise: WorkoutExercise): string {
  const sets = exercise.sets;

  const allBodyweight = sets.every(set => set.isBodyweight || set.weight === null);
  if (allBodyweight) {
    return `${exercise.exerciseName} ${sets.map(set => set.reps).join(' ')}`;
  }

  const first = sets[0];
  const uniform = sets.every(
    set => set.reps === first.reps && set.weight === first.weight && set.unit === first.unit
  );
  if (uniform) {
    return `${exercise.exerciseName} ${sets.length}x${first.reps}x${formatWeight(first)}`;
  }

  return `${exercise.exerciseName} ${sets
    .map(set => (set.weight === null ? `${set.reps}xbw` : `${set.reps}x${formatWeight(set)}`))
    .join(' ')}`;
}

export function buildTextExport(sessions: WorkoutSession[]): string {
  const sorted = [...sessions].sort((a, b) => a.performedDate.localeCompare(b.performedDate));

  return sorted
    .map(session =>
      [`# ${session.performedDate}`, ...session.exercises.map(exerciseLine)].join('\n')
    )
    .join('\n\n')
    .concat('\n');
}

// Convert a parse result into the stored session shape (minus the id),
// computing the cached totals. Shared by the workout input form and
// text import.
export function sessionFromParseResult(
  result: ParseResult,
  performedDate: string,
  performedAtLocal: string,
  sourceText: string
): Omit<WorkoutSession, 'sessionId'> {
  const exercises: WorkoutExercise[] = result.exercises.map((ex, index) => ({
    exerciseId: ex.exercise.name.toLowerCase().replace(/\s+/g, '-'),
    exerciseName: ex.exercise.name,
    sequence: index,
    sets: ex.sets.map((set, setIndex) => ({
      setNumber: setIndex + 1,
      reps: set.reps,
      weight: set.weight,
      unit: set.unit,
      isBodyweight: set.isBodyweight,
    })),
    totalSets: ex.sets.length,
    totalReps: ex.sets.reduce((sum, set) => sum + set.reps, 0),
    totalTonnage: ex.sets.reduce(
      (sum, set) => (set.isBodyweight || !set.weight ? sum : sum + set.weight * set.reps),
      0
    ),
    totalBwReps: ex.sets.reduce((sum, set) => (set.isBodyweight ? sum + set.reps : sum), 0),
  }));

  return {
    performedDate,
    performedAtLocal,
    sourceText,
    exercises,
    totalSets: exercises.reduce((sum, ex) => sum + ex.totalSets, 0),
    totalReps: exercises.reduce((sum, ex) => sum + ex.totalReps, 0),
    totalTonnage: exercises.reduce((sum, ex) => sum + ex.totalTonnage, 0),
    totalBwReps: exercises.reduce((sum, ex) => sum + ex.totalBwReps, 0),
  };
}

export interface TextImportBlock {
  date: string;
  lines: string[];
}

// Split a text file into per-date blocks. A header is a line containing
// just a date, optionally prefixed with `#`s; other `#` lines are
// comments. Lines before any header fall into a block dated today.
export function splitTextBlocks(text: string, today: string): TextImportBlock[] {
  const headerPattern = /^#*\s*(\d{4}-\d{2}-\d{2})\s*$/;
  const blocks: TextImportBlock[] = [];
  let current: TextImportBlock | null = null;

  for (const rawLine of text.split('\n')) {
    const line = rawLine.trim();
    const header = line.match(headerPattern);

    if (header) {
      current = { date: header[1], lines: [] };
      blocks.push(current);
      continue;
    }
    if (!line || line.startsWith('#')) continue;

    if (!current) {
      current = { date: today, lines: [] };
      blocks.push(current);
    }
    current.lines.push(line);
  }

  return blocks.filter(block => block.lines.length > 0);
}
