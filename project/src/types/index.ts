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
  difficulty: "beginner" | "intermediate" | "advanced";
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
  duration: number; // minutes
  status: "scheduled" | "in-progress" | "completed" | "missed" | "rescheduled";
  priority: number; // 1-5
  sessionType: "study" | "review" | "practice" | "break";
  adaptationReason?: string;
  createdAt?: string;
  updatedAt?: string;
}

export interface Schedule {
  _id: string;
  userId: string;
  name: string;
  startDate: string;
  endDate: string;
  sessions: ScheduleSession[];
  status: "active" | "completed" | "archived";
  scheduleType: "real" | "demo" | "template"; // Type of schedule
  adaptations: Adaptation[];
  createdAt?: string;
  updatedAt?: string;
}

export interface Adaptation {
  timestamp: string;
  type:
    | "reschedule"
    | "duration_change"
    | "priority_adjust"
    | "auto_reschedule";
  reason: string;
  oldValue: any;
  newValue: any;
}

export interface CalendarEvent {
  id: string;
  title: string;
  start: Date;
  end: Date;
  subjectId: string;
  subjectName: string;
  status: ScheduleSession["status"];
  priority: number;
  sessionType: ScheduleSession["sessionType"];
  duration: number;
  canEdit: boolean;
}

export interface TimeSlot {
  hour: number;
  minute: number;
  available: boolean;
}

export interface DaySchedule {
  date: Date;
  sessions: ScheduleSession[];
  availableHours: number;
  totalScheduledHours: number;
}
