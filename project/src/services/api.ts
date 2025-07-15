import axios from "axios";
import { User, Subject, DashboardAnalytics, StudySession, Schedule, ScheduleSession } from "../types";

const api = axios.create({
  baseURL: "http://localhost:5000/api",
});

// Add request logging for debugging rate limits
api.interceptors.request.use((request) => {
  console.log(`API Request: ${request.method?.toUpperCase()} ${request.url}`);
  return request;
});

api.interceptors.response.use(
  (response) => {
    console.log(`API Response: ${response.status} ${response.config.url}`);
    return response;
  },
  (error) => {
    console.error(
      `API Error: ${error.response?.status} ${error.config?.url}`,
      error.message
    );
    if (error.response?.status === 429) {
      console.warn("Rate limit exceeded. Consider reducing API call frequency.");
    }
    return Promise.reject(error);
  }
);

let authToken: string | null = null;

export const setAuthToken = (token: string | null) => {
  authToken = token;
  if (token) {
    api.defaults.headers.common["Authorization"] = `Bearer ${token}`;
  } else {
    delete api.defaults.headers.common["Authorization"];
  }
};

export const apiService = {
  login: async (credentials: { email: string; password: string }) => {
    const response = await api.post<{ token: string }>(
      "/auth/login",
      credentials
    );
    return response.data;
  },

  register: async (data: {
    firstName: string;
    lastName: string;
    email: string;
    password: string;
  }) => {
    const response = await api.post<{ token: string }>("/auth/register", data);
    return response.data;
  },

  logout: async () => {
    await api.post("/auth/logout");
  },

  getCurrentUser: async () => {
    const response = await api.get<{ user: User }>("/auth/me");
    return response.data;
  },

  getUser: async () => {
    const response = await api.get<{ user: User }>("/auth/me");
    return response.data;
  },

  updatePreferences: async (
    preferences: Partial<User["learningPreferences"]>
  ) => {
    const response = await api.patch<{ user: User }>(
      "/auth/preferences",
      preferences
    );
    return response.data;
  },

  getSubjects: async () => {
    const response = await api.get("/subjects");
    return response.data;
  },
  createSubject: async (subjectData) => {
    const response = await api.post("/subjects", subjectData);
    return response.data;
  },
  updateSubject: async (id, subjectData) => {
    const response = await api.put(`/subjects/${id}`, subjectData);
    return response.data;
  },
  deleteSubject: async (id) => {
    const response = await api.delete(`/subjects/${id}`);
    return response.data;
  },
  updateSubjectProgress: async (id, progress) => {
    const response = await api.patch(`/subjects/${id}/progress`, { progress });
    return response.data;
  },

  getDashboardAnalytics: async () => {
    const response = await api.get<{ weeklyStats: any; subjectProgress: any }>(
      "/analytics/dashboard"
    );
    return response.data;
  },

  getTodaySessions: async () => {
    const response = await api.get<{ sessions: StudySession[] }>(
      "/sessions/today"
    );
    return response.data;
  },

  startSession: async (sessionId: string) => {
    await api.post(`/sessions/${sessionId}/start`);
  },

  getAdaptiveSchedule: async () => {
    const response = await api.get<{ recommendations: any[] }>(
      "/adaptive-schedule"
    );
    return response.data;
  },

  generateAdaptiveSchedule: async (subjects: string[], startDate: string) => {
    const response = await api.post<{ recommendations: any[] }>(
      "/adaptive-schedule",
      { subjects, startDate }
    );
    return response.data;
  },

  getSessions: async () => {
    const response = await api.get<{ sessions: StudySession[] }>("/sessions");
    return response.data;
  },

  createSession: async (sessionData: any) => {
    const response = await api.post("/sessions", sessionData);
    return response.data;
  },

  completeSession: async (sessionId: string, data: any) => {
    const response = await api.patch(`/sessions/${sessionId}/complete`, data);
    return response.data;
  },

  getAnalytics: async () => {
    const response = await api.get("/analytics/dashboard");
    return response.data;
  },

  getSubjectAnalytics: async (subjectId: string) => {
    const response = await api.get(`/analytics/subject/${subjectId}`);
    return response.data;
  },

  updateProfile: async (profileData: any) => {
    const response = await api.patch("/auth/me", profileData);
    return response.data;
  },

  // Schedule Management
  getSchedules: async () => {
    const response = await api.get<{ schedules: Schedule[] }>("/schedules");
    return response.data;
  },

  createSchedule: async (scheduleData: Partial<Schedule>) => {
    const response = await api.post<{ schedule: Schedule }>("/schedules", scheduleData);
    return response.data;
  },

  updateSchedule: async (id: string, scheduleData: Partial<Schedule>) => {
    const response = await api.put<{ schedule: Schedule }>(`/schedules/${id}`, scheduleData);
    return response.data;
  },

  deleteSchedule: async (id: string) => {
    const response = await api.delete(`/schedules/${id}`);
    return response.data;
  },

  // Schedule Session Management
  getScheduleSessions: async (scheduleId?: string, startDate?: string, endDate?: string) => {
    const params = new URLSearchParams();
    if (scheduleId) params.append('scheduleId', scheduleId);
    if (startDate) params.append('startDate', startDate);
    if (endDate) params.append('endDate', endDate);
    
    const response = await api.get<{ sessions: ScheduleSession[] }>(`/schedule-sessions?${params}`);
    return response.data;
  },

  createScheduleSession: async (sessionData: Partial<ScheduleSession>) => {
    const response = await api.post<{ session: ScheduleSession }>("/schedule-sessions", sessionData);
    return response.data;
  },

  updateScheduleSession: async (id: string, sessionData: Partial<ScheduleSession>) => {
    const response = await api.put<{ session: ScheduleSession }>(`/schedule-sessions/${id}`, sessionData);
    return response.data;
  },

  deleteScheduleSession: async (id: string) => {
    const response = await api.delete(`/schedule-sessions/${id}`);
    return response.data;
  },

  updateSessionStatus: async (id: string, status: ScheduleSession['status']) => {
    const response = await api.patch<{ session: ScheduleSession }>(`/schedule-sessions/${id}/status`, { status });
    return response.data;
  },

  // Smart Schedule Generation
  generateSmartSchedule: async (subjects: string[], preferences: any, startDate: string, endDate: string) => {
    const response = await api.post<{ schedule: Schedule }>("/schedules/generate", {
      subjects,
      preferences,
      startDate,
      endDate
    });
    return response.data;
  },
};
