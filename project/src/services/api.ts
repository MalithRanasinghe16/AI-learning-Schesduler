import axios from "axios";
import { User, Subject, DashboardAnalytics, StudySession } from "../types";

const api = axios.create({
  baseURL: "http://localhost:5000/api",
});

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
};
