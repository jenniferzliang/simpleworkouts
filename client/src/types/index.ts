// Type definitions for the workout logger

// Re-export parser types
export type { ParsedExercise, ParsedSet, ParseWarning, ParseResult } from '../utils/workoutParser';

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