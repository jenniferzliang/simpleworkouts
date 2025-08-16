// API client for the workout logger

import { ParseResult, WorkoutSessionSummary, WorkoutSessionDetail, AnalyticsData } from '../types/index.ts';

const API_BASE = process.env.NODE_ENV === 'production' 
  ? '/api' 
  : 'http://localhost:5001/api';

class ApiError extends Error {
  constructor(public status: number, message: string) {
    super(message);
    this.name = 'ApiError';
  }
}

async function fetchApi<T>(endpoint: string, options?: RequestInit): Promise<T> {
  const url = `${API_BASE}${endpoint}`;
  const response = await fetch(url, {
    headers: {
      'Content-Type': 'application/json',
      ...options?.headers,
    },
    ...options,
  });

  if (!response.ok) {
    const error = await response.json().catch(() => ({ message: 'Unknown error' }));
    throw new ApiError(response.status, error.message || `HTTP ${response.status}`);
  }

  return response.json();
}

export const api = {
  // Parse workout text
  parseWorkout: async (text: string, unitPreference: 'kg' | 'lb' = 'lb'): Promise<ParseResult> => {
    return fetchApi('/parse', {
      method: 'POST',
      body: JSON.stringify({ text, unitPreference }),
    });
  },

  // Create workout session
  createSession: async (data: {
    text: string;
    parsed: ParseResult;
    date?: string;
    notes?: string;
    device?: string;
  }): Promise<{
    sessionId: string;
    totals: { tonnage: number; bwReps: number; totalSets: number; totalReps: number };
    exercises: number;
    performedDate: string;
  }> => {
    return fetchApi('/sessions', {
      method: 'POST',
      body: JSON.stringify(data),
    });
  },

  // Get session list
  getSessions: async (params?: {
    limit?: number;
    cursor?: string;
    startDate?: string;
    endDate?: string;
  }): Promise<{
    sessions: WorkoutSessionSummary[];
    pagination: { hasMore: boolean; nextCursor?: string };
  }> => {
    const searchParams = new URLSearchParams();
    if (params?.limit) searchParams.set('limit', params.limit.toString());
    if (params?.cursor) searchParams.set('cursor', params.cursor);
    if (params?.startDate) searchParams.set('startDate', params.startDate);
    if (params?.endDate) searchParams.set('endDate', params.endDate);

    const query = searchParams.toString();
    return fetchApi(`/sessions${query ? `?${query}` : ''}`);
  },

  // Get session detail
  getSession: async (id: string): Promise<WorkoutSessionDetail> => {
    return fetchApi(`/sessions/${id}`);
  },

  // Get analytics data
  getWeeklyTonnage: async (params?: {
    range?: string;
    startDate?: string;
    endDate?: string;
  }): Promise<AnalyticsData> => {
    const searchParams = new URLSearchParams();
    if (params?.range) searchParams.set('range', params.range);
    if (params?.startDate) searchParams.set('startDate', params.startDate);
    if (params?.endDate) searchParams.set('endDate', params.endDate);

    const query = searchParams.toString();
    return fetchApi(`/analytics/weekly-tonnage${query ? `?${query}` : ''}`);
  },

  // Health check
  health: async (): Promise<{ status: string; message: string }> => {
    return fetchApi('/health');
  },
};

export { ApiError };