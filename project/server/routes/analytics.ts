import express, { Response } from "express";
import ScheduleSession from "../models/ScheduleSession";
import Schedule from "../models/Schedule";
import Subject from "../models/Subject";
import { authenticateToken, AuthRequest } from "../middleware/auth";
import {
  startOfWeek,
  endOfWeek,
  startOfMonth,
  endOfMonth,
  subDays,
} from "date-fns";

const router = express.Router();

// Get dashboard analytics
router.get(
  "/dashboard",
  authenticateToken,
  async (req: AuthRequest, res: Response): Promise<void> => {
    try {
      const userId = req.user!._id;
      const now = new Date();
      const weekStart = startOfWeek(now);
      const weekEnd = endOfWeek(now);
      const monthStart = startOfMonth(now);
      const monthEnd = endOfMonth(now);

      console.log("Analytics: Getting dashboard analytics for user:", userId);

      // Get all user's schedules
      const userSchedules = await Schedule.find({ userId });
      const scheduleIds = userSchedules.map((s) => s._id);

      console.log("Analytics: Found user schedules:", scheduleIds.length);

      if (scheduleIds.length === 0) {
        console.log("Analytics: No schedules found, returning empty analytics");
        const emptyAnalytics = {
          weeklyStats: {
            totalSessions: 0,
            totalStudyTime: 0,
            averageFocus: 0,
            completionRate: 0,
            dailyStudyTime: [0, 0, 0, 0, 0, 0, 0],
          },
          subjectProgress: {
            total: 0,
            completed: 0,
            inProgress: 0,
            notStarted: 0,
            details: [],
          },
        };
        res.json(emptyAnalytics);
        return;
      }

      // Get completed sessions this week
      const weekSessions = await ScheduleSession.find({
        scheduleId: { $in: scheduleIds },
        status: "completed",
        actualEndTime: { $gte: weekStart, $lte: weekEnd },
      });

      console.log("Analytics: Found week sessions:", weekSessions.length);

      // Get all subjects
      const subjects = await Subject.find({ userId });
      const completedSubjects = subjects.filter((s) => s.isCompleted);

      // Get daily study time for the last 7 days
      const dailyStudyTime = [];
      for (let i = 6; i >= 0; i--) {
        const date = subDays(now, i);
        const dayStart = new Date(date.setHours(0, 0, 0, 0));
        const dayEnd = new Date(date.setHours(23, 59, 59, 999));

        const daySessions = await ScheduleSession.find({
          scheduleId: { $in: scheduleIds },
          status: "completed",
          actualEndTime: { $gte: dayStart, $lte: dayEnd },
        });

        const dayMinutes = daySessions.reduce(
          (sum, s) => sum + (s.duration || 0),
          0
        );
        dailyStudyTime.push(dayMinutes);
      }

      // Calculate weekly stats
      const weeklyStats = {
        totalSessions: weekSessions.length,
        totalStudyTime: weekSessions.reduce(
          (sum, s) => sum + (s.duration || 0),
          0
        ),
        averageFocus:
          weekSessions.length > 0
            ? weekSessions.reduce((sum, s) => sum + (s.focusScore || 0), 0) /
              weekSessions.length
            : 0,
        completionRate:
          weekSessions.length > 0
            ? (weekSessions.filter((s) => s.status === "completed").length /
                weekSessions.length) *
              100
            : 0,
        dailyStudyTime: dailyStudyTime,
      };

      // Subject progress
      const subjectProgress = {
        total: subjects.length,
        completed: completedSubjects.length,
        inProgress: subjects.filter((s) => !s.isCompleted && s.progress > 0)
          .length,
        notStarted: subjects.filter((s) => s.progress === 0).length,
        details: subjects.map((s) => ({
          id: s._id,
          name: s.name,
          progress: s.progress,
          isCompleted: s.isCompleted,
        })),
      };

      res.json({
        weeklyStats,
        subjectProgress,
      });
    } catch (error) {
      console.error("Get analytics error:", error);
      res
        .status(500)
        .json({ message: "Internal server error", error: error.message });
    }
  }
);

// Get analytics for a specific schedule
router.get(
  "/schedule/:scheduleId",
  authenticateToken,
  async (req: AuthRequest, res: Response): Promise<void> => {
    try {
      const userId = req.user!._id;
      const { scheduleId } = req.params;

      console.log("Analytics: Getting schedule analytics for:", scheduleId);

      // Verify schedule belongs to user
      const schedule = await Schedule.findOne({ _id: scheduleId, userId });
      if (!schedule) {
        res.status(404).json({ message: "Schedule not found" });
        return;
      }

      // Get all sessions for this schedule
      const allSessions = await ScheduleSession.find({ scheduleId });
      const completedSessions = allSessions.filter(
        (s) => s.status === "completed"
      );
      const totalSessions = allSessions.length;

      console.log("Analytics: Schedule sessions:", {
        total: totalSessions,
        completed: completedSessions.length,
      });

      // Calculate completion rate
      const completionRate =
        totalSessions > 0
          ? (completedSessions.length / totalSessions) * 100
          : 0;

      // Calculate total study time (from completed sessions)
      const totalStudyTime = completedSessions.reduce(
        (sum, s) => sum + (s.duration || 0),
        0
      );

      // Calculate daily average (total time divided by days in schedule)
      const scheduleStartDate = new Date(schedule.startDate);
      const scheduleEndDate = new Date(schedule.endDate);
      const totalDays =
        Math.ceil(
          (scheduleEndDate.getTime() - scheduleStartDate.getTime()) /
            (1000 * 60 * 60 * 24)
        ) + 1;
      const dailyAverage =
        totalDays > 0 ? Math.round(totalStudyTime / totalDays) : 0;

      // Calculate average focus score
      const averageFocus =
        completedSessions.length > 0
          ? completedSessions.reduce((sum, s) => sum + (s.focusScore || 0), 0) /
            completedSessions.length
          : 0;

      const scheduleAnalytics = {
        scheduleId,
        scheduleName: schedule.name,
        completionRate: Math.round(completionRate),
        sessionsCompleted: completedSessions.length,
        totalSessions: totalSessions,
        totalStudyTime: totalStudyTime, // in minutes
        dailyAverage: dailyAverage, // in minutes
        averageFocus: averageFocus,
        scheduleProgress: {
          startDate: schedule.startDate,
          endDate: schedule.endDate,
          status: schedule.status,
        },
      };

      console.log(
        "Analytics: Calculated schedule analytics:",
        scheduleAnalytics
      );

      res.json(scheduleAnalytics);
    } catch (error) {
      console.error("Get schedule analytics error:", error);
      res
        .status(500)
        .json({ message: "Internal server error", error: error.message });
    }
  }
);

// TEST ENDPOINT: Create sample data for analytics testing (only in development)
router.post(
  "/test-data",
  authenticateToken,
  async (req: AuthRequest, res: Response): Promise<void> => {
    try {
      if (process.env.NODE_ENV === "production") {
        res
          .status(403)
          .json({ message: "Test endpoints disabled in production" });
        return;
      }

      const userId = req.user!._id;
      console.log("Creating test data for user:", userId);

      // Create test subjects if they don't exist
      const existingSubjects = await Subject.find({ userId });
      if (existingSubjects.length === 0) {
        const testSubjects = [
          { name: "Mathematics", userId, progress: 75, isCompleted: false },
          { name: "Physics", userId, progress: 60, isCompleted: false },
          { name: "Chemistry", userId, progress: 90, isCompleted: true },
          { name: "Biology", userId, progress: 45, isCompleted: false },
        ];

        await Subject.insertMany(testSubjects);
        console.log("Created test subjects");
      }

      // Create test schedule if it doesn't exist
      let testSchedule = await Schedule.findOne({
        userId,
        name: "Test Analytics Schedule",
      });
      if (!testSchedule) {
        testSchedule = await Schedule.create({
          name: "Test Analytics Schedule",
          userId,
          startDate: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000), // 7 days ago
          endDate: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000), // 7 days from now
          status: "active",
        });
        console.log("Created test schedule");
      }

      // Create test sessions for the past week
      const existingSessions = await ScheduleSession.find({
        scheduleId: testSchedule._id,
      });
      if (existingSessions.length === 0) {
        const testSessions = [];

        // Create sessions for the past 7 days
        for (let i = 6; i >= 0; i--) {
          const sessionDate = new Date(Date.now() - i * 24 * 60 * 60 * 1000);
          const sessionsForDay = Math.floor(Math.random() * 3) + 1; // 1-3 sessions per day

          for (let j = 0; j < sessionsForDay; j++) {
            const startTime = new Date(sessionDate);
            startTime.setHours(9 + j * 3, 0, 0, 0); // Sessions at 9, 12, 15, etc.

            const duration = 30 + Math.floor(Math.random() * 60); // 30-90 minutes
            const endTime = new Date(
              startTime.getTime() + duration * 60 * 1000
            );

            testSessions.push({
              scheduleId: testSchedule._id,
              startTime,
              endTime,
              actualStartTime: startTime,
              actualEndTime: endTime,
              duration,
              status: "completed",
              focusScore: 6 + Math.random() * 3, // 6-9 focus score
              notes: `Test session ${j + 1} for day ${7 - i}`,
            });
          }
        }

        await ScheduleSession.insertMany(testSessions);
        console.log(`Created ${testSessions.length} test sessions`);
      }

      res.json({
        message: "Test data created successfully",
        subjects: await Subject.countDocuments({ userId }),
        schedules: await Schedule.countDocuments({ userId }),
        sessions: await ScheduleSession.countDocuments({
          scheduleId: testSchedule._id,
        }),
      });
    } catch (error) {
      console.error("Create test data error:", error);
      res
        .status(500)
        .json({ message: "Internal server error", error: error.message });
    }
  }
);

export default router;
