import express, { Response } from 'express';
import StudySession from '../models/StudySession';
import Subject from '../models/Subject';
import { authenticateToken, AuthRequest } from '../middleware/auth';
import { startOfWeek, endOfWeek, startOfMonth, endOfMonth, subDays } from 'date-fns';

const router = express.Router();

// Get dashboard analytics
router.get('/dashboard', authenticateToken, async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const userId = req.user!._id;
    const now = new Date();
    const weekStart = startOfWeek(now);
    const weekEnd = endOfWeek(now);
    const monthStart = startOfMonth(now);
    const monthEnd = endOfMonth(now);

    // Get completed sessions this week
    const weekSessions = await StudySession.find({
      userId,
      status: 'completed',
      actualEndTime: { $gte: weekStart, $lte: weekEnd }
    });

    // Get completed sessions this month
    const monthSessions = await StudySession.find({
      userId,
      status: 'completed',
      actualEndTime: { $gte: monthStart, $lte: monthEnd }
    });

    // Get all subjects
    const subjects = await Subject.find({ userId });
    const completedSubjects = subjects.filter(s => s.isCompleted);

    // Calculate weekly stats
    const weeklyStats = {
      totalSessions: weekSessions.length,
      totalStudyTime: weekSessions.reduce((sum, s) => sum + (s.actualDuration || 0), 0),
      averageFocus: weekSessions.length > 0 
        ? weekSessions.reduce((sum, s) => sum + (s.focusScore || 0), 0) / weekSessions.length 
        : 0,
      completionRate: weekSessions.length > 0 
        ? (weekSessions.filter(s => s.status === 'completed').length / weekSessions.length) * 100 
        : 0
    };

    // Calculate monthly stats
    const monthlyStats = {
      totalSessions: monthSessions.length,
      totalStudyTime: monthSessions.reduce((sum, s) => sum + (s.actualDuration || 0), 0),
      averageFocus: monthSessions.length > 0 
        ? monthSessions.reduce((sum, s) => sum + (s.focusScore || 0), 0) / monthSessions.length 
        : 0,
      completionRate: monthSessions.length > 0 
        ? (monthSessions.filter(s => s.status === 'completed').length / monthSessions.length) * 100 
        : 0
    };

    // Subject progress
    const subjectProgress = {
      total: subjects.length,
      completed: completedSubjects.length,
      inProgress: subjects.filter(s => !s.isCompleted && s.progress > 0).length,
      notStarted: subjects.filter(s => s.progress === 0).length
    };

    // Get daily study time for the last 7 days
    const dailyStudyTime = [];
    for (let i = 6; i >= 0; i--) {
      const date = subDays(now, i);
      const dayStart = new Date(date.setHours(0, 0, 0, 0));
      const dayEnd = new Date(date.setHours(23, 59, 59, 999));
      
      const daySessions = await StudySession.find({
        userId,
        status: 'completed',
        actualEndTime: { $gte: dayStart, $lte: dayEnd }
      });
      
      dailyStudyTime.push({
        date: dayStart.toISOString().split('T')[0],
        minutes: daySessions.reduce((sum, s) => sum + (s.actualDuration || 0), 0)
      });
    }

    res.json({
      weeklyStats,
      monthlyStats,
      subjectProgress,
      dailyStudyTime,
      userMetrics: req.user!.performanceMetrics
    });
  } catch (error) {
    console.error('Get analytics error:', error);
    res.status(500).json({ message: 'Internal server error' });
  }
});

// Get subject performance analytics
router.get('/subjects', authenticateToken, async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const userId = req.user!._id;
    
    const subjects = await Subject.find({ userId });
    const subjectAnalytics = [];

    for (const subject of subjects) {
      const sessions = await StudySession.find({
        userId,
        subjectId: subject._id,
        status: 'completed'
      });

      const analytics = {
        subject: {
          id: subject._id,
          name: subject.name,
          category: subject.category,
          difficulty: subject.difficulty,
          progress: subject.progress,
          isCompleted: subject.isCompleted
        },
        sessions: {
          total: sessions.length,
          totalTime: sessions.reduce((sum, s) => sum + (s.actualDuration || 0), 0),
          averageDuration: sessions.length > 0 
            ? sessions.reduce((sum, s) => sum + (s.actualDuration || 0), 0) / sessions.length 
            : 0,
          averageFocus: sessions.length > 0 
            ? sessions.reduce((sum, s) => sum + (s.focusScore || 0), 0) / sessions.length 
            : 0,
          averageDifficulty: sessions.length > 0 
            ? sessions.reduce((sum, s) => sum + (s.difficultyRating || 0), 0) / sessions.length 
            : 0
        }
      };

      subjectAnalytics.push(analytics);
    }

    res.json({ subjectAnalytics });
  } catch (error) {
    console.error('Get subject analytics error:', error);
    res.status(500).json({ message: 'Internal server error' });
  }
});

export default router;