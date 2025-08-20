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

// Token management
let authToken: string | null = localStorage.getItem('authToken');

const setAuthToken = (token: string | null) => {
  authToken = token;
  if (token) {
    localStorage.setItem('authToken', token);
  } else {
    localStorage.removeItem('authToken');
  }
};

async function fetchApi<T>(endpoint: string, options?: RequestInit): Promise<T> {
  const url = `${API_BASE}${endpoint}`;
  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
    ...options?.headers,
  };

  // Add auth token if available
  if (authToken) {
    headers['Authorization'] = `Bearer ${authToken}`;
  }

  const response = await fetch(url, {
    ...options,
    headers,
  });

  if (!response.ok) {
    const error = await response.json().catch(() => ({ message: 'Unknown error' }));
    throw new ApiError(response.status, error.message || `HTTP ${response.status}`);
  }

  return response.json();
}

export const api = {
  // Authentication
  login: async (email: string, password: string): Promise<{
    message: string;
    token: string;
    user: {
      id: string;
      email: string;
      name: string;
      unitPreference: 'kg' | 'lb';
      timezone: string;
    };
  }> => {
    const result = await fetchApi('/auth/login', {
      method: 'POST',
      body: JSON.stringify({ email, password }),
    });
    setAuthToken(result.token);
    return result;
  },

  register: async (userData: {
    email: string;
    password: string;
    name?: string;
    unitPreference?: 'kg' | 'lb';
  }): Promise<{
    message: string;
    token: string;
    user: {
      id: string;
      email: string;
      name: string;
      unitPreference: 'kg' | 'lb';
      timezone: string;
    };
  }> => {
    const result = await fetchApi('/auth/register', {
      method: 'POST',
      body: JSON.stringify(userData),
    });
    setAuthToken(result.token);
    return result;
  },

  getCurrentUser: async (): Promise<{
    user: {
      id: string;
      email: string;
      name: string;
      unitPreference: 'kg' | 'lb';
      timezone: string;
      createdAt: string;
    };
  }> => {
    return fetchApi('/auth/me');
  },

  updateProfile: async (userData: {
    name?: string;
    unitPreference?: 'kg' | 'lb';
    timezone?: string;
  }): Promise<{
    message: string;
    user: {
      id: string;
      email: string;
      name: string;
      unitPreference: 'kg' | 'lb';
      timezone: string;
    };
  }> => {
    return fetchApi('/auth/profile', {
      method: 'PUT',
      body: JSON.stringify(userData),
    });
  },

  logout: () => {
    setAuthToken(null);
  },

  getAuthToken: () => authToken,
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