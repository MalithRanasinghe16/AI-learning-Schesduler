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

export interface Subject {
  estimatedHours: number;
  priority: string;
  tags: never[];
  isCompleted: boolean;
  category: string;
  _id: string;
  name: string;
  description?: string;
  difficulty: 'beginner' | 'intermediate' | 'advanced';
  progress: number;
  userId: string;
}

export interface StudySession {
  _id: string;
  subjectId: string | Subject;
  userId: string;
  scheduledDate: string;
  plannedDuration: number;
  actualDuration?: number;
  focusScore?: number;
  status: 'scheduled' | 'in-progress' | 'completed';
}

export interface ScheduleRecommendation {
  subjectId: string;
  scheduledDate: string;
  duration: number;
  priority: number;
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