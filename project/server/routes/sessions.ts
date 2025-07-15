import express, { Response } from 'express';
import StudySession from '../models/StudySession';
import Subject from '../models/Subject';
import User from '../models/User';
import { authenticateToken, AuthRequest } from '../middleware/auth';
import { AIScheduler } from '../services/aiScheduler';
import { addDays, startOfDay, endOfDay } from 'date-fns';

const router = express.Router();

// Get all sessions for user
router.get('/', authenticateToken, async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const { startDate, endDate } = req.query;
    
    let dateFilter = {};
    if (startDate && endDate) {
      dateFilter = {
        scheduledDate: {
          $gte: new Date(startDate as string),
          $lte: new Date(endDate as string)
        }
      };
    }

    const sessions = await StudySession.find({
      userId: req.user!._id,
      ...dateFilter
    })
    .populate('subjectId', 'name category difficulty')
    .sort({ scheduledDate: 1 });

    res.json({ sessions });
  } catch (error) {
    console.error('Get sessions error:', error);
    res.status(500).json({ message: 'Internal server error' });
  }
});

// Create new session
router.post('/', authenticateToken, async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const sessionData = {
      ...req.body,
      userId: req.user!._id
    };

    const session = new StudySession(sessionData);
    await session.save();

    const populatedSession = await StudySession.findById(session._id)
      .populate('subjectId', 'name category difficulty');

    res.status(201).json({
      message: 'Session created successfully',
      session: populatedSession
    });
  } catch (error) {
    console.error('Create session error:', error);
    res.status(500).json({ message: 'Internal server error' });
  }
});

// Start session
router.patch('/:id/start', authenticateToken, async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const session = await StudySession.findOneAndUpdate(
      { _id: req.params.id, userId: req.user!._id },
      {
        status: 'in-progress',
        actualStartTime: new Date()
      },
      { new: true }
    ).populate('subjectId', 'name category difficulty');

    if (!session) {
      res.status(404).json({ message: 'Session not found' });
      return;
    }

    res.json({
      message: 'Session started successfully',
      session
    });
  } catch (error) {
    console.error('Start session error:', error);
    res.status(500).json({ message: 'Internal server error' });
  }
});

// Complete session
router.patch('/:id/complete', authenticateToken, async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const { focusScore, difficultyRating, notes } = req.body;
    const endTime = new Date();

    const session = await StudySession.findOne({
      _id: req.params.id,
      userId: req.user!._id
    });

    if (!session) {
      res.status(404).json({ message: 'Session not found' });
      return;
    }

    // Calculate actual duration
    const actualDuration = session.actualStartTime 
      ? Math.round((endTime.getTime() - session.actualStartTime.getTime()) / (1000 * 60))
      : session.plannedDuration;

    // Update session
    session.status = 'completed';
    session.actualEndTime = endTime;
    session.actualDuration = actualDuration;
    session.focusScore = focusScore;
    session.difficultyRating = difficultyRating;
    session.notes = notes;

    // Generate AI recommendations for next session
    session.aiRecommendations = {
      nextSessionDuration: this.calculateNextDuration(actualDuration, focusScore, difficultyRating),
      difficultyAdjustment: this.getDifficultyAdjustment(difficultyRating),
      recommendedBreaks: this.calculateBreaks(actualDuration, focusScore)
    };

    await session.save();

    // Update user performance metrics
    await this.updateUserMetrics(req.user!._id, actualDuration, focusScore);

    // Update subject progress
    await this.updateSubjectProgress(session.subjectId, actualDuration);

    const populatedSession = await StudySession.findById(session._id)
      .populate('subjectId', 'name category difficulty');

    res.json({
      message: 'Session completed successfully',
      session: populatedSession
    });
  } catch (error) {
    console.error('Complete session error:', error);
    res.status(500).json({ message: 'Internal server error' });
  }
});

// Generate AI schedule
router.post('/generate-schedule', authenticateToken, async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const { days = 7 } = req.body;
    
    const subjects = await Subject.find({
      userId: req.user!._id,
      isCompleted: false
    });

    if (subjects.length === 0) {
      res.status(400).json({ message: 'No active subjects found. Please add subjects first.' });
      return;
    }

    const recommendations = await AIScheduler.generateOptimalSchedule(
      req.user!,
      subjects,
      days
    );

    res.json({
      message: 'Schedule generated successfully',
      recommendations,
      totalSessions: recommendations.length
    });
  } catch (error) {
    console.error('Generate schedule error:', error);
    res.status(500).json({ message: 'Internal server error' });
  }
});

// Get today's sessions
router.get('/today', authenticateToken, async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const today = new Date();
    const startOfToday = startOfDay(today);
    const endOfToday = endOfDay(today);

    const sessions = await StudySession.find({
      userId: req.user!._id,
      scheduledDate: {
        $gte: startOfToday,
        $lte: endOfToday
      }
    })
    .populate('subjectId', 'name category difficulty')
    .sort({ scheduledDate: 1 });

    res.json({ sessions });
  } catch (error) {
    console.error('Get today sessions error:', error);
    res.status(500).json({ message: 'Internal server error' });
  }
});

// Helper methods
function calculateNextDuration(actualDuration: number, focusScore: number, difficultyRating: number): number {
  let nextDuration = actualDuration;
  
  if (focusScore >= 8 && difficultyRating <= 6) {
    nextDuration = Math.min(actualDuration + 15, 120); // Increase by 15 min, max 2 hours
  } else if (focusScore <= 5 || difficultyRating >= 8) {
    nextDuration = Math.max(actualDuration - 15, 30); // Decrease by 15 min, min 30 min
  }
  
  return nextDuration;
}

function getDifficultyAdjustment(difficultyRating: number): string {
  if (difficultyRating <= 3) return 'increase';
  if (difficultyRating >= 8) return 'decrease';
  return 'maintain';
}

function calculateBreaks(duration: number, focusScore: number): number {
  const baseBreaks = Math.floor(duration / 45); // Break every 45 minutes
  
  if (focusScore <= 5) {
    return baseBreaks + 1; // Extra break for low focus
  }
  
  return Math.max(baseBreaks, 1);
}

async function updateUserMetrics(userId: string, duration: number, focusScore: number): Promise<void> {
  const user = await User.findById(userId);
  if (!user) return;

  user.performanceMetrics.completedSessions += 1;
  user.performanceMetrics.totalStudyTime += duration;
  user.performanceMetrics.averageScore = 
    (user.performanceMetrics.averageScore + focusScore) / 2;
  user.performanceMetrics.lastActiveDate = new Date();

  await user.save();
}

async function updateSubjectProgress(subjectId: string, duration: number): Promise<void> {
  const subject = await Subject.findById(subjectId);
  if (!subject) return;

  // Simple progress calculation: 1% per hour studied
  const progressIncrease = duration / 60;
  subject.progress = Math.min(subject.progress + progressIncrease, 100);
  
  if (subject.progress >= 100) {
    subject.isCompleted = true;
  }

  await subject.save();
}

export default router;