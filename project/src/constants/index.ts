// API Configuration
export const API_BASE_URL = "http://localhost:5000/api";
export const CHATBOT_BASE_URL = "http://localhost:8000";

// App Constants
export const APP_NAME = "AI Learning Scheduler";
export const APP_VERSION = "1.0.0";

// Theme Constants
export const THEME = {
  colors: {
    primary: "indigo",
    secondary: "cyan",
    accent: "purple",
  },
  gradients: {
    primary: "from-indigo-900 to-purple-900",
    accent: "from-purple-500 to-cyan-500",
  },
};

// Time Constants
export const TIME_CONSTANTS = {
  DEFAULT_SESSION_DURATION: 60, // minutes
  DEFAULT_DAILY_HOURS: 4,
  MAX_DAILY_HOURS: 12,
  ANALYTICS_REFRESH_INTERVAL: 30000, // 30 seconds
};

// Storage Keys
export const STORAGE_KEYS = {
  TOKEN: "token",
  USER: "user",
  ANALYTICS_VIEW_PREFERENCE: "analytics-view-preference",
  CHAT_HISTORY: "chatHistory",
  LAST_CHAT_SESSION: "lastChatSession",
};

// API Endpoints
export const ENDPOINTS = {
  AUTH: {
    LOGIN: "/auth/login",
    REGISTER: "/auth/register",
    PROFILE: "/auth/profile",
  },
  ANALYTICS: {
    DASHBOARD: "/analytics/dashboard",
    SCHEDULE: "/analytics/schedule",
    TEST_DATA: "/analytics/test-data",
  },
  SUBJECTS: "/subjects",
  SCHEDULES: "/schedules",
  SESSIONS: "/schedule-sessions",
  CHATBOT: "/chat",
};

// Default Values
export const DEFAULTS = {
  DAILY_GOAL_MINUTES: 120, // 2 hours
  WEEKLY_GOAL_MINUTES: 840, // 14 hours
  FOCUS_SCORE_RANGE: { min: 1, max: 10 },
  PRIORITY_RANGE: { min: 1, max: 5 },
};
