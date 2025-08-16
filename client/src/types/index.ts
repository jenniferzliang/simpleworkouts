// Type definitions for the workout logger

export interface Exercise {
  id: string;
  name: string;
  category: 'push' | 'pull' | 'legs' | 'core' | 'cardio' | 'other';
  isBodyweight: boolean;
}

export interface WorkoutSet {
  setNumber: number;
  reps: number;
  weight: number | null;
  unit: 'kg' | 'lb' | null;
  isBodyweight: boolean;
}

export interface ParsedExercise {
  exercise: Exercise;
  sets: WorkoutSet[];
  mode: 'aggregate' | 'per-set' | 'reps-only';
  originalText: string;
}

export interface ParseWarning {
  line: number;
  message: string;
  suggestion?: string;
  originalText: string;
}

export interface ParseResult {
  exercises: ParsedExercise[];
  warnings: ParseWarning[];
  tokens: any[];
  metadata?: {
    duration: number;
    originalText: string;
    unitPreference: 'kg' | 'lb';
    timestamp: string;
  };
}

export interface SessionTotals {
  tonnage: number;
  sets: number;
  reps: number;
  bwReps: number;
}

export interface WorkoutSessionSummary {
  id: string;
  performedDate: string;
  sourceText: string;
  totals: SessionTotals;
  notes?: string;
  createdAt: string;
}

export interface WorkoutSessionDetail extends WorkoutSessionSummary {
  performedAtLocal: string;
  device?: string;
  exercises: {
    id: string;
    exercise: Exercise;
    sequence: number;
    sets: WorkoutSet[];
    totals: SessionTotals;
  }[];
  updatedAt: string;
}

export interface WeeklyTonnage {
  weekStart: string;
  weekEnd: string;
  sessions: number;
  tonnage: number;
  sets: number;
  reps: number;
  bwReps: number;
}

export interface AnalyticsData {
  data: WeeklyTonnage[];
  range: {
    start: string;
    end: string;
    weeks: number;
  };
  summary: {
    totalSessions: number;
    totalTonnage: number;
    avgWeeklyTonnage: number;
  };
}