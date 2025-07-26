export interface User {
  _id: string;
  firstName: string;
  lastName: string;
  email: string;
  learningPreferences?: {
    dailyStudyGoal?: number;
    preferredTimeSlots?: string[];
    difficultyLevel?: string;
  };
}

// Core application types for simplified UI
export interface Subject {
  _id: string;
  id: string;
  name: string;
  description: string;
  difficulty: "easy" | "medium" | "hard";
  priority: "low" | "medium" | "high";
  estimated_hours: number;
  progress: number;
  category: string;
  deadline?: string;
  tags: string[];
  created_date: string;
  created_by: "chatbot" | "manual";
  userId: string;
  isCompleted: boolean;
  estimatedHours: number; // Legacy compatibility
}

export interface ScheduleBlock {
  _id: string;
  id: string;
  subjectId: string;
  subjectName: string;
  time: string;
  duration: number;
  priority_score: number;
  status: "scheduled" | "in-progress" | "completed" | "missed";
  date: string;
  startTime: string;
  endTime: string;
  sessionType: "study" | "review" | "practice" | "break";
  adaptationReason?: string;
}

export interface Schedule {
  _id: string;
  id: string;
  userId: string;
  name: string;
  start_date: string;
  end_date: string;
  daily_hours: number;
  blocks: ScheduleBlock[];
  created_by: "chatbot" | "manual";
  created_date: string;
  createdAt?: string;
  updatedAt?: string;
  sessions?: ScheduleBlock[]; // Legacy compatibility
}

export interface Analytics {
  totalStudyTime: number;
  weeklyStudyTime: number[];
  completionRate: number;
  focusScore: number;
  progressVelocity: number;
  weeklyLabels: string[];
  insights: string[];
  weeklyStats?: {
    totalStudyTime: number;
    totalSessions: number;
    averageFocus: number;
    completionRate: number;
    dailyStudyTime: number[];
  };
  subjectProgress?: {
    total: number;
    completed: number;
    inProgress: number;
    notStarted: number;
    details: { name: string; progress: number }[];
  };
}

// Enhanced chatbot types
export interface ChatMessage {
  id: string;
  text: string;
  sender: "user" | "bot";
  timestamp: string;
  intent?: string;
  confidence?: number;
  entities?: Record<string, any>;
  actions?: string[];
  quickActions?: QuickAction[];
  suggestions?: string[];
  conversationId?: string;
  isError?: boolean;
}

export interface QuickAction {
  id: string;
  label: string;
  icon: string;
  message: string;
  color: string;
}

export interface Suggestion {
  text: string;
  action: string;
}

export interface ChatContext {
  currentStep: string;
  flow: "subject" | "schedule" | "feedback" | "optimal_subject" | null;
  data?: Record<string, any>;
  progress?: {
    current: number;
    total: number;
    stepName: string;
  };
}

export interface ChatResponse {
  response: string;
  intent: string;
  confidence: number;
  entities: Record<string, any>;
  actions: string[];
  conversation_id: string;
  quick_actions?: QuickAction[];
  suggestions?: string[];
  next_step?: string;
  progress?: {
    current: number;
    total: number;
    stepName: string;
  };
}

// Prioritization types
export interface SubjectCreateRequest {
  name: string;
  description?: string;
  difficulty: "easy" | "medium" | "hard";
  category: string;
  estimated_hours: number;
  priority: "low" | "medium" | "high";
  deadline?: string;
  tags?: string[];
}

export interface ScheduleGenerationRequest {
  name: string;
  subjects: string[];
  start_date: string;
  end_date: string;
  daily_hours: number;
  session_duration: number;
  preferred_times?: string[];
}

export interface FeedbackSubmissionRequest {
  subject_name?: string;
  focus_score: number;
  stress_level: number;
  completion_percentage: number;
  session_date: string;
}

export interface OptimalSubjectRequest {
  user_preferences: {
    prioritize_deadlines?: boolean;
    consider_difficulty?: boolean;
    context?: string;
  };
}

// Legacy compatibility types
export interface StudySession {
  _id: string;
  subjectId: string | Subject;
  userId: string;
  scheduledDate: string;
  plannedDuration: number;
  actualDuration?: number;
  focusScore?: number;
  status: "scheduled" | "in-progress" | "completed";
}

export interface ScheduleRecommendation {
  subjectId: string;
  recommendedDate: Date | string;
  duration: number;
  priority: number;
  reasoning?: string;
}

export interface DashboardAnalytics {
  weeklyStats: {
    totalStudyTime: number;
    totalSessions: number;
    averageFocus: number;
    completionRate: number;
    dailyStudyTime: number[];
  };
  subjectProgress: {
    total: number;
    completed: number;
    inProgress: number;
    notStarted: number;
    details: { name: string; progress: number }[];
  };
}

export interface ScheduleSession {
  _id: string;
  scheduleId: string;
  subjectId: string | Subject;
  startTime: string;
  endTime: string;
  duration: number;
  status: "scheduled" | "in-progress" | "completed" | "missed" | "rescheduled";
  priority: number;
  sessionType: "study" | "review" | "practice" | "break";
  adaptationReason?: string;
  createdAt?: string;
  updatedAt?: string;
}

// API Response types
export interface ApiResponse<T> {
  success: boolean;
  data?: T;
  message?: string;
  error?: string;
}
