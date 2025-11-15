// Local storage utility for workout data
import { v4 as uuidv4 } from 'uuid';

export interface WorkoutSet {
  setNumber: number;
  reps: number;
  weight: number | null;
  unit: 'kg' | 'lb' | null;
  isBodyweight: boolean;
}

export interface WorkoutExercise {
  exerciseId: string;
  exerciseName: string;
  sequence: number;
  sets: WorkoutSet[];
  totalSets: number;
  totalReps: number;
  totalTonnage: number;
  totalBwReps: number;
}

export interface WorkoutSession {
  sessionId: string;
  performedDate: string; // YYYY-MM-DD format
  performedAtLocal: string; // ISO timestamp
  sourceText: string;
  notes?: string;
  exercises: WorkoutExercise[];
  totalSets: number;
  totalReps: number;
  totalTonnage: number;
  totalBwReps: number;
}

export interface UserSettings {
  unitPreference: 'kg' | 'lb';
  timezone: string;
  name?: string;
}

const SESSIONS_KEY = 'workout_sessions';
const SETTINGS_KEY = 'user_settings';

// Session management
export const getSessions = (): WorkoutSession[] => {
  try {
    const data = localStorage.getItem(SESSIONS_KEY);
    return data ? JSON.parse(data) : [];
  } catch (error) {
    console.error('Error reading sessions from localStorage:', error);
    return [];
  }
};

export const getSession = (sessionId: string): WorkoutSession | null => {
  const sessions = getSessions();
  return sessions.find(s => s.sessionId === sessionId) || null;
};

export const createSession = (sessionData: Omit<WorkoutSession, 'sessionId'>): WorkoutSession => {
  const sessions = getSessions();
  const newSession: WorkoutSession = {
    ...sessionData,
    sessionId: uuidv4(),
  };
  sessions.push(newSession);
  localStorage.setItem(SESSIONS_KEY, JSON.stringify(sessions));
  return newSession;
};

export const updateSession = (sessionId: string, updates: Partial<WorkoutSession>): WorkoutSession | null => {
  const sessions = getSessions();
  const index = sessions.findIndex(s => s.sessionId === sessionId);
  if (index === -1) return null;

  sessions[index] = { ...sessions[index], ...updates };
  localStorage.setItem(SESSIONS_KEY, JSON.stringify(sessions));
  return sessions[index];
};

export const deleteSession = (sessionId: string): boolean => {
  const sessions = getSessions();
  const filtered = sessions.filter(s => s.sessionId !== sessionId);
  if (filtered.length === sessions.length) return false;

  localStorage.setItem(SESSIONS_KEY, JSON.stringify(filtered));
  return true;
};

export const getSessionsByDateRange = (startDate?: string, endDate?: string): WorkoutSession[] => {
  let sessions = getSessions();

  if (startDate) {
    sessions = sessions.filter(s => s.performedDate >= startDate);
  }
  if (endDate) {
    sessions = sessions.filter(s => s.performedDate <= endDate);
  }

  return sessions.sort((a, b) => b.performedDate.localeCompare(a.performedDate));
};

// Settings management
export const getSettings = (): UserSettings => {
  try {
    const data = localStorage.getItem(SETTINGS_KEY);
    return data ? JSON.parse(data) : {
      unitPreference: 'lb',
      timezone: Intl.DateTimeFormat().resolvedOptions().timeZone || 'America/New_York',
    };
  } catch (error) {
    console.error('Error reading settings from localStorage:', error);
    return {
      unitPreference: 'lb',
      timezone: 'America/New_York',
    };
  }
};

export const updateSettings = (settings: Partial<UserSettings>): UserSettings => {
  const current = getSettings();
  const updated = { ...current, ...settings };
  localStorage.setItem(SETTINGS_KEY, JSON.stringify(updated));
  return updated;
};

// Analytics helpers
export const getWeeklyTonnage = (weeks: number = 12): { week: string; tonnage: number }[] => {
  const sessions = getSessions();
  const weekMap = new Map<string, number>();

  // Get date from N weeks ago
  const startDate = new Date();
  startDate.setDate(startDate.getDate() - (weeks * 7));

  sessions.forEach(session => {
    const sessionDate = new Date(session.performedDate);
    if (sessionDate >= startDate) {
      // Get the start of the week (Sunday)
      const weekStart = new Date(sessionDate);
      weekStart.setDate(sessionDate.getDate() - sessionDate.getDay());
      const weekKey = weekStart.toISOString().split('T')[0];

      weekMap.set(weekKey, (weekMap.get(weekKey) || 0) + session.totalTonnage);
    }
  });

  return Array.from(weekMap.entries())
    .map(([week, tonnage]) => ({ week, tonnage }))
    .sort((a, b) => a.week.localeCompare(b.week));
};

// Clear all data (useful for testing)
export const clearAllData = (): void => {
  localStorage.removeItem(SESSIONS_KEY);
  localStorage.removeItem(SETTINGS_KEY);
};
