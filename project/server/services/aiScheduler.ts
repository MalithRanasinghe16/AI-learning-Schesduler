import User, { IUser } from '../models/User';
import Subject, { ISubject } from '../models/Subject';
import StudySession, { IStudySession } from '../models/StudySession';
import { addDays, startOfDay, addMinutes, format } from 'date-fns';

export interface ScheduleRecommendation {
  subjectId: string;
  recommendedDate: Date;
  duration: number;
  priority: number;
  reasoning: string;
}

export const getAdaptiveSchedule = async (userId: string): Promise<ScheduleRecommendation[]> => {
  const user = await User.findById(userId);
  if (!user) {
    throw new Error('User not found');
  }

  const subjects = await Subject.find({ userId, isCompleted: false });
  if (subjects.length === 0) {
    return [];
  }

  return AIScheduler.generateOptimalSchedule(user, subjects);
};

export const generateSchedule = async (userId: string, subjects: ISubject[], startDate: Date): Promise<ScheduleRecommendation[]> => {
  const user = await User.findById(userId);
  if (!user) {
    throw new Error('User not found');
  }

  return AIScheduler.generateOptimalSchedule(user, subjects, 7, startDate);
};

export class AIScheduler {
  static async generateOptimalSchedule(
    user: IUser,
    subjects: ISubject[],
    days: number = 7,
    startDate: Date = new Date()
  ): Promise<ScheduleRecommendation[]> {
    const recommendations: ScheduleRecommendation[] = [];
    const scheduleStartDate = startOfDay(startDate);

    // Get user's recent performance data
    const recentSessions = await StudySession.find({
      userId: user._id,
      actualEndTime: { $exists: true },
      createdAt: { $gte: addDays(new Date(), -30) },
    }).sort({ createdAt: -1 }).limit(50);

    // Calculate performance metrics per subject
    const subjectPerformance = this.calculateSubjectPerformance(recentSessions);

    // Sort subjects by priority and performance
    const prioritizedSubjects = this.prioritizeSubjects(subjects, subjectPerformance, user);

    // Generate schedule for each day
    for (let day = 0; day < days; day++) {
      const currentDate = addDays(scheduleStartDate, day);
      const dailyRecommendations = this.generateDailySchedule(
        currentDate,
        prioritizedSubjects,
        user,
        subjectPerformance
      );
      recommendations.push(...dailyRecommendations);
    }

    return recommendations;
  }

  private static calculateSubjectPerformance(sessions: IStudySession[]): Map<string, any> {
    const performance = new Map();
    sessions.forEach((session) => {
      const subjectId = session.subjectId.toString();
      if (!performance.has(subjectId)) {
        performance.set(subjectId, {
          totalSessions: 0,
          averageFocus: 0,
          averageDifficulty: 0,
          completionRate: 0,
          totalTime: 0,
        });
      }

      const perf = performance.get(subjectId);
      perf.totalSessions++;
      perf.averageFocus = (perf.averageFocus + (session.focusScore || 5)) / 2;
      perf.averageDifficulty = (perf.averageDifficulty + (session.difficultyRating || 5)) / 2;
      perf.totalTime += session.actualDuration || 0;

      if (session.status === 'completed') {
        perf.completionRate = (perf.completionRate * (perf.totalSessions - 1) + 1) / perf.totalSessions;
      }
    });
    return performance;
  }

  private static prioritizeSubjects(
    subjects: ISubject[],
    performance: Map<string, any>,
    user: IUser
  ): ISubject[] {
    return subjects
      .filter((subject) => !subject.isCompleted)
      .sort((a, b) => {
        const aPriority = this.calculatePriorityScore(a, performance.get(a._id.toString()), user);
        const bPriority = this.calculatePriorityScore(b, performance.get(b._id.toString()), user);
        return bPriority - aPriority;
      });
  }

  private static calculatePriorityScore(
    subject: ISubject,
    performance: any,
    user: IUser
  ): number {
    let score = 0;

    // Base priority
    const priorityMap = { high: 3, medium: 2, low: 1 };
    score += priorityMap[subject.priority] * 10;

    // Progress factor (less progress = higher priority)
    score += (100 - subject.progress) * 0.1;

    // Performance factor
    if (performance) {
      score += (1 - performance.completionRate) * 5; // Lower completion = higher priority
      score += (performance.averageDifficulty || 5) * 0.5; // Higher difficulty needs attention
    }

    // User difficulty preference alignment
    const difficultyMap = { beginner: 1, intermediate: 2, advanced: 3 };
    const userLevel = difficultyMap[user.learningPreferences.difficultyLevel];
    const subjectLevel = difficultyMap[subject.difficulty];

    if (Math.abs(userLevel - subjectLevel) <= 1) {
      score += 2; // Bonus for appropriate difficulty
    }

    return score;
  }

  private static generateDailySchedule(
    date: Date,
    subjects: ISubject[],
    user: IUser,
    performance: Map<string, any>
  ): ScheduleRecommendation[] {
    const recommendations: ScheduleRecommendation[] = [];
    let remainingTime = user.learningPreferences.dailyStudyGoal || 60;

    const timeSlots = this.getOptimalTimeSlots(date, user.learningPreferences.preferredTimeSlots);

    let subjectIndex = 0;
    let slotIndex = 0;

    while (remainingTime > 0 && subjectIndex < subjects.length && slotIndex < timeSlots.length) {
      const subject = subjects[subjectIndex];
      const timeSlot = timeSlots[slotIndex];

      const sessionDuration = this.calculateOptimalDuration(
        subject,
        performance.get(subject._id.toString()),
        remainingTime,
        user
      );

      if (sessionDuration >= 15) {
        recommendations.push({
          subjectId: subject._id.toString(),
          recommendedDate: timeSlot,
          duration: sessionDuration,
          priority: this.calculatePriorityScore(subject, performance.get(subject._id.toString()), user),
          reasoning: this.generateReasoning(subject, performance.get(subject._id.toString()), sessionDuration),
        });

        remainingTime -= sessionDuration;
      }

      subjectIndex++;
      if (subjectIndex >= subjects.length) {
        subjectIndex = 0;
        slotIndex++;
      }
    }

    return recommendations;
  }

  private static getOptimalTimeSlots(date: Date, preferredSlots: string[]): Date[] {
    const slots: Date[] = [];
    const timeMap = {
      morning: 9,
      afternoon: 14,
      evening: 18,
      night: 21,
    };

    preferredSlots.forEach((slot) => {
      const hour = timeMap[slot as keyof typeof timeMap];
      if (hour) {
        const slotTime = new Date(date);
        slotTime.setHours(hour, 0, 0, 0);
        slots.push(slotTime);
      }
    });

    if (slots.length === 0) {
      const defaultTime = new Date(date);
      defaultTime.setHours(14, 0, 0, 0); // Default to afternoon
      slots.push(defaultTime);
    }

    return slots;
  }

  private static calculateOptimalDuration(
    subject: ISubject,
    performance: any,
    remainingTime: number,
    user: IUser
  ): number {
    let baseDuration = 60; // Default 60 minutes

    // Adjust based on subject difficulty
    const difficultyMultiplier = { beginner: 0.8, intermediate: 1.0, advanced: 1.2 };
    baseDuration *= difficultyMultiplier[subject.difficulty];

    // Adjust based on user performance
    if (performance) {
      if (performance.averageFocus < 5) baseDuration *= 0.8; // Shorter for low focus
      if (performance.completionRate < 0.7) baseDuration *= 0.9; // Shorter for low completion
    }

    // Ensure it doesn't exceed remaining time
    baseDuration = Math.min(baseDuration, remainingTime);

    // Round to nearest 15 minutes
    return Math.round(baseDuration / 15) * 15;
  }

  private static generateReasoning(
    subject: ISubject,
    performance: any,
    duration: number
  ): string {
    const reasons: string[] = [];

    if (subject.priority === 'high') reasons.push('High priority subject');
    if (subject.progress < 30) reasons.push('Low progress - needs attention');

    if (performance) {
      if (performance.completionRate < 0.7) reasons.push('Improving completion rate');
      if (performance.averageFocus < 5)
        reasons.push(`Shorter ${duration}min session for better focus`);
    }

    if (reasons.length === 0) reasons.push('Optimal learning schedule');

    return reasons.join(', ');
  }
}