import Schedule, { ISchedule } from '../models/Schedule';
import ScheduleSession, { IScheduleSession } from '../models/ScheduleSession';
import Subject from '../models/Subject';
import { addDays, setHours, setMinutes, format, startOfDay, endOfDay } from 'date-fns';

interface SchedulePreferences {
  dailyStudyHours: number;
  preferredTimeSlots: string[];
  sessionDuration: number;
  breakDuration: number;
}

interface TimeSlot {
  start: Date;
  end: Date;
  type: 'morning' | 'afternoon' | 'evening';
}

interface ConflictCheckResult {
  hasConflict: boolean;
  conflictingSessions: IScheduleSession[];
}

export class SmartScheduleGenerator {
  private readonly TIME_SLOTS = {
    morning: { start: 8, end: 12 },
    afternoon: { start: 13, end: 17 },
    evening: { start: 18, end: 22 }
  };

  /**
   * Generate a complete schedule with rule-based algorithm
   */
  async generateSchedule(
    userId: string,
    subjectIds: string[],
    preferences: SchedulePreferences,
    startDate: string,
    endDate: string,
    scheduleName?: string,
    scheduleType: 'real' | 'demo' | 'template' = 'real'
  ): Promise<ISchedule> {
    try {
      // Fetch subjects with their details
      const subjects = await Subject.find({ 
        _id: { $in: subjectIds }, 
        userId 
      });

      if (subjects.length === 0) {
        throw new Error('No valid subjects found');
      }

      // Create the schedule document
      const schedule = new Schedule({
        userId,
        name: scheduleName || `${scheduleType === 'demo' ? 'Demo' : 'AI Generated'} Schedule - ${format(new Date(), 'MMM dd, yyyy')}`,
        startDate: new Date(startDate),
        endDate: new Date(endDate),
        scheduleType,
        preferences,
        status: 'active'
      });

      await schedule.save();

      console.log('🆔 Schedule saved with ID:', schedule._id);
      console.log('🔧 Schedule ID type:', typeof schedule._id);
      console.log('🔧 Schedule ID toString:', schedule._id.toString());

      // Generate sessions using rule-based algorithm
      const sessions = await this.generateSessions(
        schedule._id, // Pass ObjectId directly
        subjects,
        preferences,
        new Date(startDate),
        new Date(endDate)
      );

      return schedule;
    } catch (error) {
      console.error('Error generating schedule:', error);
      throw error;
    }
  }

  /**
   * Generate sessions using rule-based algorithm with conflict detection
   */
  private async generateSessions(
    scheduleId: any, // Accept ObjectId or string
    subjects: any[],
    preferences: SchedulePreferences,
    startDate: Date,
    endDate: Date
  ): Promise<IScheduleSession[]> {
    const sessions: IScheduleSession[] = [];
    const currentDate = new Date(startDate);
    let iterationCount = 0;
    const maxIterations = 100; // Prevent infinite loops

    console.log('Starting session generation:', {
      scheduleId,
      subjectsCount: subjects.length,
      startDate: startDate.toISOString(),
      endDate: endDate.toISOString(),
      preferences
    });

    // Calculate subject priorities and time allocation
    const subjectTimeAllocation = this.calculateSubjectTimeAllocation(subjects, preferences);
    console.log('Subject time allocation:', subjectTimeAllocation);

    while (currentDate <= endDate && iterationCount < maxIterations) {
      iterationCount++;
      console.log(`Processing day ${iterationCount}: ${currentDate.toISOString()}`);

      // Skip weekends if not in preferred time slots
      if (currentDate.getDay() === 0 || currentDate.getDay() === 6) {
        console.log('Skipping weekend day:', currentDate.toDateString());
        currentDate.setDate(currentDate.getDate() + 1);
        continue;
      }

      try {
        // Generate daily sessions
        const dailySessions = await this.generateDailySessions(
          scheduleId,
          currentDate,
          subjectTimeAllocation,
          preferences
        );

        console.log(`Generated ${dailySessions.length} sessions for ${currentDate.toDateString()}`);
        sessions.push(...dailySessions);
      } catch (error) {
        console.error(`Error generating sessions for ${currentDate.toDateString()}:`, error);
        // Continue with next day instead of failing completely
      }

      currentDate.setDate(currentDate.getDate() + 1);
    }

    if (iterationCount >= maxIterations) {
      console.warn('Schedule generation stopped due to max iterations limit');
    }

    console.log(`Total sessions generated: ${sessions.length}`);

    // Save all sessions to database
    if (sessions.length > 0) {
      console.log('💾 Saving sessions to database...');
      console.log('🔗 Sample session scheduleId:', sessions[0]?.scheduleId);
      console.log('🔗 Target scheduleId:', scheduleId);
      
      const savedSessions = await ScheduleSession.insertMany(sessions);
      console.log(`✅ ${savedSessions.length} sessions saved to database`);
      
      // Verify sessions were saved
      const verifyCount = await ScheduleSession.countDocuments({ scheduleId });
      console.log(`🔍 Verification: ${verifyCount} sessions found for scheduleId: ${scheduleId}`);
      
      if (verifyCount !== sessions.length) {
        console.error('⚠️ WARNING: Mismatch between generated and saved sessions!');
      }
    } else {
      console.warn('⚠️ No sessions to save');
    }

    return sessions;
  }

  /**
   * Calculate time allocation for each subject based on priority and difficulty
   */
  private calculateSubjectTimeAllocation(subjects: any[], preferences: SchedulePreferences) {
    const totalDailyMinutes = preferences.dailyStudyHours * 60;
    const totalPriorityWeight = subjects.reduce((sum, subject) => {
      // Priority weight: difficulty + estimated hours + priority
      const difficultyWeight = { beginner: 1, intermediate: 2, advanced: 3 }[subject.difficulty] || 2;
      const priorityWeight = { low: 1, medium: 2, high: 3 }[subject.priority] || 2;
      const hoursWeight = Math.min(subject.estimatedHours / 10, 3); // Cap at 3
      
      return sum + (difficultyWeight + priorityWeight + hoursWeight);
    }, 0);

    return subjects.map(subject => {
      const difficultyWeight = { beginner: 1, intermediate: 2, advanced: 3 }[subject.difficulty] || 2;
      const priorityWeight = { low: 1, medium: 2, high: 3 }[subject.priority] || 2;
      const hoursWeight = Math.min(subject.estimatedHours / 10, 3);
      
      const subjectWeight = difficultyWeight + priorityWeight + hoursWeight;
      const timePercentage = subjectWeight / totalPriorityWeight;
      const dailyMinutes = Math.round(totalDailyMinutes * timePercentage);

      return {
        subject,
        dailyMinutes: Math.max(dailyMinutes, 30), // Minimum 30 minutes per subject
        priority: priorityWeight,
        difficulty: difficultyWeight
      };
    });
  }

  /**
   * Generate sessions for a single day
   */
  private async generateDailySessions(
    scheduleId: string,
    date: Date,
    subjectTimeAllocation: any[],
    preferences: SchedulePreferences
  ): Promise<IScheduleSession[]> {
    const sessions: IScheduleSession[] = [];
    const availableTimeSlots = this.getAvailableTimeSlots(date, preferences.preferredTimeSlots);
    
    console.log(`Generating sessions for ${date.toDateString()}, available slots:`, availableTimeSlots.length);
    console.log('Available time slots:', availableTimeSlots.map(slot => `${slot.type}: ${slot.start.toLocaleTimeString()} - ${slot.end.toLocaleTimeString()}`));
    
    if (availableTimeSlots.length === 0) {
      console.log('No available time slots for this day');
      return sessions;
    }
    
    let currentSlotIndex = 0;
    let currentTimeInSlot = new Date(availableTimeSlots[0]?.start || date);

    console.log('Subject allocations to process:', subjectTimeAllocation.map(a => `${a.subject.name}: ${a.dailyMinutes} minutes`));

    for (const allocation of subjectTimeAllocation) {
      const remainingMinutes = allocation.dailyMinutes;
      let minutesScheduled = 0;
      let attempts = 0;
      const maxAttempts = 50; // Prevent infinite loops

      console.log(`\nProcessing subject: ${allocation.subject.name}, need ${remainingMinutes} minutes`);

      while (minutesScheduled < remainingMinutes && currentSlotIndex < availableTimeSlots.length && attempts < maxAttempts) {
        attempts++;
        const currentSlot = availableTimeSlots[currentSlotIndex];
        const remainingTimeInSlot = this.getRemainingTimeInSlot(currentTimeInSlot, currentSlot.end);
        const sessionDuration = Math.min(
          preferences.sessionDuration,
          remainingMinutes - minutesScheduled,
          remainingTimeInSlot
        );

        console.log(`  Attempt ${attempts}: Slot ${currentSlotIndex}, Current time: ${currentTimeInSlot.toLocaleTimeString()}, Session duration: ${sessionDuration}, Remaining in slot: ${remainingTimeInSlot}`);

        if (sessionDuration >= 30) { // Minimum session length
          try {
            // Check for conflicts within the same schedule
            const conflictCheck = await this.checkForConflicts(
              currentTimeInSlot,
              new Date(currentTimeInSlot.getTime() + sessionDuration * 60000),
              scheduleId
            );

            if (!conflictCheck.hasConflict) {
              const session = new ScheduleSession({
                scheduleId,
                subjectId: allocation.subject._id,
                startTime: new Date(currentTimeInSlot),
                endTime: new Date(currentTimeInSlot.getTime() + sessionDuration * 60000),
                duration: sessionDuration,
                priority: allocation.priority,
                sessionType: this.determineSessionType(allocation.subject, minutesScheduled, allocation.dailyMinutes),
                status: 'scheduled'
              });

              sessions.push(session);
              minutesScheduled += sessionDuration;
              
              console.log(`    ✓ Created session: ${currentTimeInSlot.toLocaleTimeString()} - ${new Date(currentTimeInSlot.getTime() + sessionDuration * 60000).toLocaleTimeString()}`);

              // Move to next time slot with break
              currentTimeInSlot = new Date(currentTimeInSlot.getTime() + (sessionDuration + preferences.breakDuration) * 60000);
            } else {
              console.log(`    ✗ Conflict detected, moving 15 minutes forward`);
              // Move to next available time
              currentTimeInSlot = new Date(currentTimeInSlot.getTime() + 15 * 60000); // 15-minute increment
            }
          } catch (error) {
            console.error('    ✗ Error checking conflicts:', error);
            // Move to next time slot
            currentTimeInSlot = new Date(currentTimeInSlot.getTime() + 15 * 60000);
          }
        } else {
          console.log(`    ✗ Session too short (${sessionDuration} min), moving to next slot`);
          // Session too short, move to next time slot
          currentSlotIndex++;
          if (currentSlotIndex < availableTimeSlots.length) {
            currentTimeInSlot = new Date(availableTimeSlots[currentSlotIndex].start);
            console.log(`    → Moved to slot ${currentSlotIndex}: ${currentTimeInSlot.toLocaleTimeString()}`);
          }
        }

        // Check if we need to move to next time slot
        if (currentTimeInSlot >= currentSlot.end) {
          console.log(`    → Time exceeded slot end, moving to next slot`);
          currentSlotIndex++;
          if (currentSlotIndex < availableTimeSlots.length) {
            currentTimeInSlot = new Date(availableTimeSlots[currentSlotIndex].start);
            console.log(`    → Moved to slot ${currentSlotIndex}: ${currentTimeInSlot.toLocaleTimeString()}`);
          }
        }
      }
      
      console.log(`  Subject ${allocation.subject.name} completed: ${minutesScheduled}/${remainingMinutes} minutes scheduled`);
      
      if (attempts >= maxAttempts) {
        console.warn(`Max attempts reached for subject ${allocation.subject.name}, scheduled ${minutesScheduled}/${remainingMinutes} minutes`);
      }
    }

    console.log(`Daily sessions generated: ${sessions.length}`);
    return sessions;
  }

  /**
   * Get available time slots for a given date and preferences
   */
  private getAvailableTimeSlots(date: Date, preferredTimes: string[]): TimeSlot[] {
    const slots: TimeSlot[] = [];

    for (const timeType of preferredTimes) {
      const timeConfig = this.TIME_SLOTS[timeType as keyof typeof this.TIME_SLOTS];
      if (timeConfig) {
        const start = setMinutes(setHours(new Date(date), timeConfig.start), 0);
        const end = setMinutes(setHours(new Date(date), timeConfig.end), 0);
        
        slots.push({
          start,
          end,
          type: timeType as 'morning' | 'afternoon' | 'evening'
        });
      }
    }

    return slots.sort((a, b) => a.start.getTime() - b.start.getTime());
  }

  /**
   * Check for scheduling conflicts
   */
  private async checkForConflicts(startTime: Date, endTime: Date, scheduleId?: string): Promise<ConflictCheckResult> {
    // Build query to check for conflicts only within the same schedule/user context
    const query: any = {
      $or: [
        {
          startTime: { $lt: endTime },
          endTime: { $gt: startTime }
        }
      ],
      status: { $ne: 'cancelled' }
    };

    // If scheduleId is provided, only check within that schedule
    if (scheduleId) {
      query.scheduleId = scheduleId;
    }

    console.log('🔍 Conflict check query:', JSON.stringify(query, null, 2));

    const conflictingSessions = await ScheduleSession.find(query);

    console.log(`🔍 Found ${conflictingSessions.length} conflicting sessions`);
    if (conflictingSessions.length > 0) {
      console.log('🔍 Conflicting sessions:', conflictingSessions.map(s => ({
        id: s._id,
        startTime: s.startTime,
        endTime: s.endTime,
        scheduleId: s.scheduleId
      })));
    }

    return {
      hasConflict: conflictingSessions.length > 0,
      conflictingSessions
    };
  }

  /**
   * Get remaining time in current time slot
   */
  private getRemainingTimeInSlot(currentTime: Date, slotEnd: Date): number {
    return Math.max(0, Math.round((slotEnd.getTime() - currentTime.getTime()) / (1000 * 60)));
  }

  /**
   * Determine session type based on subject and progress
   */
  private determineSessionType(subject: any, minutesScheduled: number, totalMinutes: number): 'study' | 'review' | 'practice' {
    const progress = minutesScheduled / totalMinutes;
    
    if (progress < 0.3) {
      return 'study'; // Initial learning
    } else if (progress < 0.7) {
      return 'practice'; // Apply knowledge
    } else {
      return 'review'; // Reinforce learning
    }
  }

  /**
   * Reschedule a session (part of adaptation engine)
   */
  async rescheduleSession(
    sessionId: string,
    newStartTime: Date,
    reason: string
  ): Promise<IScheduleSession> {
    const session = await ScheduleSession.findById(sessionId);
    if (!session) {
      throw new Error('Session not found');
    }

    const newEndTime = new Date(newStartTime.getTime() + session.duration * 60000);

    // Check for conflicts within the same schedule
    const conflictCheck = await this.checkForConflicts(newStartTime, newEndTime, session.scheduleId);
    if (conflictCheck.hasConflict) {
      throw new Error('New time slot conflicts with existing sessions');
    }

    // Update session
    const oldStartTime = session.startTime;
    session.startTime = newStartTime;
    session.endTime = newEndTime;
    session.status = 'rescheduled';
    session.adaptationReason = reason;

    await session.save();

    // Add adaptation record to schedule
    await Schedule.findByIdAndUpdate(session.scheduleId, {
      $push: {
        adaptations: {
          timestamp: new Date(),
          type: 'reschedule',
          reason,
          oldValue: { startTime: oldStartTime, endTime: session.endTime },
          newValue: { startTime: newStartTime, endTime: newEndTime }
        }
      }
    });

    return session;
  }

  /**
   * Auto-adapt schedule based on completion patterns (Simple Adaptation Engine)
   */
  async adaptSchedule(scheduleId: string): Promise<void> {
    const schedule = await Schedule.findById(scheduleId);
    if (!schedule) {
      throw new Error('Schedule not found');
    }

    // Get completed sessions for pattern analysis
    const completedSessions = await ScheduleSession.find({
      scheduleId,
      status: 'completed'
    }).populate('subjectId');

    // Analyze patterns
    const patterns = this.analyzeCompletionPatterns(completedSessions);

    // Apply adaptations based on patterns
    await this.applyAdaptations(scheduleId, patterns);
  }

  /**
   * Analyze completion patterns for adaptation
   */
  private analyzeCompletionPatterns(sessions: IScheduleSession[]): any {
    const patterns = {
      preferredTimes: new Map(),
      subjectPerformance: new Map(),
      sessionDurationEffectiveness: new Map()
    };

    sessions.forEach(session => {
      const hour = session.startTime.getHours();
      const timeSlot = hour < 12 ? 'morning' : hour < 17 ? 'afternoon' : 'evening';
      
      // Track preferred times based on focus scores
      if (session.focusScore) {
        const currentScore = patterns.preferredTimes.get(timeSlot) || { total: 0, count: 0 };
        patterns.preferredTimes.set(timeSlot, {
          total: currentScore.total + session.focusScore,
          count: currentScore.count + 1
        });
      }

      // Track subject performance
      if (session.subjectId && session.focusScore) {
        const subjectId = session.subjectId.toString();
        const currentPerf = patterns.subjectPerformance.get(subjectId) || { total: 0, count: 0 };
        patterns.subjectPerformance.set(subjectId, {
          total: currentPerf.total + session.focusScore,
          count: currentPerf.count + 1
        });
      }
    });

    return patterns;
  }

  /**
   * Apply adaptations based on analyzed patterns
   */
  private async applyAdaptations(scheduleId: string, patterns: any): Promise<void> {
    // Get future sessions that can be adapted
    const futureSessions = await ScheduleSession.find({
      scheduleId,
      startTime: { $gte: new Date() },
      status: 'scheduled'
    });

    // Apply time slot optimizations
    const bestTimeSlots = this.getBestTimeSlots(patterns.preferredTimes);
    
    for (const session of futureSessions) {
      const currentTimeSlot = this.getTimeSlot(session.startTime);
      
      // If current time slot is not optimal, suggest reschedule
      if (!bestTimeSlots.includes(currentTimeSlot)) {
        const newTimeSlot = bestTimeSlots[0];
        const newStartTime = this.findNextAvailableTime(session.startTime, newTimeSlot);
        
        if (newStartTime && newStartTime.getTime() !== session.startTime.getTime()) {
          try {
            await this.rescheduleSession(
              session._id,
              newStartTime,
              `Auto-adaptation: Better performance in ${newTimeSlot} time slot`
            );
          } catch (error) {
            console.log(`Could not reschedule session ${session._id}:`, error.message);
          }
        }
      }
    }
  }

  /**
   * Get best performing time slots
   */
  private getBestTimeSlots(preferredTimes: Map<string, any>): string[] {
    const timeSlotAverages = Array.from(preferredTimes.entries())
      .map(([timeSlot, data]) => ({
        timeSlot,
        average: data.total / data.count
      }))
      .sort((a, b) => b.average - a.average);

    return timeSlotAverages.map(item => item.timeSlot);
  }

  /**
   * Get time slot for a given date
   */
  private getTimeSlot(date: Date): string {
    const hour = date.getHours();
    return hour < 12 ? 'morning' : hour < 17 ? 'afternoon' : 'evening';
  }

  /**
   * Find next available time in preferred time slot
   */
  private findNextAvailableTime(currentTime: Date, preferredTimeSlot: string): Date | null {
    const timeConfig = this.TIME_SLOTS[preferredTimeSlot as keyof typeof this.TIME_SLOTS];
    if (!timeConfig) return null;

    const newDate = new Date(currentTime);
    newDate.setHours(timeConfig.start, 0, 0, 0);

    return newDate;
  }
}

export const scheduleGenerator = new SmartScheduleGenerator();
