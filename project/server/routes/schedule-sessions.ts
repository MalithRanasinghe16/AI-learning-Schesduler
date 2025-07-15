import express from 'express';
import { auth } from '../middleware/auth';
import ScheduleSession from '../models/ScheduleSession';
import { scheduleGenerator } from '../services/scheduleGenerator';
import { startOfDay, endOfDay } from 'date-fns';

const router = express.Router();

// Get schedule sessions with filters
router.get('/', auth, async (req, res) => {
  try {
    const { scheduleId, startDate, endDate, status } = req.query;
    
    const filter: any = {};
    
    // Add schedule filter if provided
    if (scheduleId) {
      filter.scheduleId = scheduleId;
    }
    
    // Add date range filter
    if (startDate || endDate) {
      filter.startTime = {};
      if (startDate) {
        filter.startTime.$gte = startOfDay(new Date(startDate as string));
      }
      if (endDate) {
        filter.startTime.$lte = endOfDay(new Date(endDate as string));
      }
    }
    
    // Add status filter
    if (status && status !== 'all') {
      filter.status = status;
    }

    const sessions = await ScheduleSession.find(filter)
      .populate('subjectId', 'name difficulty priority category')
      .populate('scheduleId', 'name userId')
      .sort({ startTime: 1 });

    // Filter by user ownership through schedule
    const userSessions = sessions.filter(session => 
      session.scheduleId && session.scheduleId.userId === req.user.id
    );

    res.json({ sessions: userSessions });
  } catch (error) {
    console.error('Error fetching sessions:', error);
    res.status(500).json({ message: 'Error fetching sessions' });
  }
});

// Get today's sessions
router.get('/today', auth, async (req, res) => {
  try {
    const today = new Date();
    const startOfToday = startOfDay(today);
    const endOfToday = endOfDay(today);

    const sessions = await ScheduleSession.find({
      startTime: {
        $gte: startOfToday,
        $lte: endOfToday
      }
    })
      .populate('subjectId', 'name difficulty priority category')
      .populate('scheduleId', 'name userId')
      .sort({ startTime: 1 });

    // Filter by user ownership
    const userSessions = sessions.filter(session => 
      session.scheduleId && session.scheduleId.userId === req.user.id
    );

    res.json({ sessions: userSessions });
  } catch (error) {
    console.error('Error fetching today\'s sessions:', error);
    res.status(500).json({ message: 'Error fetching today\'s sessions' });
  }
});

// Get specific session
router.get('/:id', auth, async (req, res) => {
  try {
    const session = await ScheduleSession.findById(req.params.id)
      .populate('subjectId', 'name difficulty priority category')
      .populate('scheduleId', 'name userId');

    if (!session || session.scheduleId.userId !== req.user.id) {
      return res.status(404).json({ message: 'Session not found' });
    }

    res.json({ session });
  } catch (error) {
    console.error('Error fetching session:', error);
    res.status(500).json({ message: 'Error fetching session' });
  }
});

// Create new session
router.post('/', auth, async (req, res) => {
  try {
    const {
      scheduleId,
      subjectId,
      startTime,
      endTime,
      duration,
      priority,
      sessionType
    } = req.body;

    const session = new ScheduleSession({
      scheduleId,
      subjectId,
      startTime: new Date(startTime),
      endTime: new Date(endTime),
      duration,
      priority: priority || 3,
      sessionType: sessionType || 'study'
    });

    await session.save();
    
    const populatedSession = await ScheduleSession.findById(session._id)
      .populate('subjectId', 'name difficulty priority category');

    res.status(201).json({ session: populatedSession });
  } catch (error) {
    console.error('Error creating session:', error);
    res.status(500).json({ message: 'Error creating session' });
  }
});

// Update session
router.put('/:id', auth, async (req, res) => {
  try {
    const session = await ScheduleSession.findById(req.params.id)
      .populate('scheduleId', 'userId');

    if (!session || session.scheduleId.userId !== req.user.id) {
      return res.status(404).json({ message: 'Session not found' });
    }

    // Update session
    Object.assign(session, req.body);
    await session.save();

    const updatedSession = await ScheduleSession.findById(session._id)
      .populate('subjectId', 'name difficulty priority category');

    res.json({ session: updatedSession });
  } catch (error) {
    console.error('Error updating session:', error);
    res.status(500).json({ message: 'Error updating session' });
  }
});

// Update session status
router.patch('/:id/status', auth, async (req, res) => {
  try {
    const { status } = req.body;
    
    const session = await ScheduleSession.findById(req.params.id)
      .populate('scheduleId', 'userId');

    if (!session || session.scheduleId.userId !== req.user.id) {
      return res.status(404).json({ message: 'Session not found' });
    }

    // Update status and related fields
    session.status = status;
    
    if (status === 'in-progress') {
      session.actualStartTime = new Date();
    } else if (status === 'completed') {
      session.actualEndTime = new Date();
      if (!session.completionPercentage) {
        session.completionPercentage = 100;
      }
    }

    await session.save();

    const updatedSession = await ScheduleSession.findById(session._id)
      .populate('subjectId', 'name difficulty priority category');

    res.json({ session: updatedSession });
  } catch (error) {
    console.error('Error updating session status:', error);
    res.status(500).json({ message: 'Error updating session status' });
  }
});

// Start session
router.post('/:id/start', auth, async (req, res) => {
  try {
    const session = await ScheduleSession.findById(req.params.id)
      .populate('scheduleId', 'userId');

    if (!session || session.scheduleId.userId !== req.user.id) {
      return res.status(404).json({ message: 'Session not found' });
    }

    session.status = 'in-progress';
    session.actualStartTime = new Date();
    await session.save();

    res.json({ message: 'Session started', session });
  } catch (error) {
    console.error('Error starting session:', error);
    res.status(500).json({ message: 'Error starting session' });
  }
});

// Complete session
router.post('/:id/complete', auth, async (req, res) => {
  try {
    const { focusScore, notes, completionPercentage } = req.body;
    
    const session = await ScheduleSession.findById(req.params.id)
      .populate('scheduleId', 'userId');

    if (!session || session.scheduleId.userId !== req.user.id) {
      return res.status(404).json({ message: 'Session not found' });
    }

    session.status = 'completed';
    session.actualEndTime = new Date();
    if (focusScore) session.focusScore = focusScore;
    if (notes) session.notes = notes;
    if (completionPercentage !== undefined) session.completionPercentage = completionPercentage;

    await session.save();

    res.json({ message: 'Session completed', session });
  } catch (error) {
    console.error('Error completing session:', error);
    res.status(500).json({ message: 'Error completing session' });
  }
});

// Reschedule session
router.post('/:id/reschedule', auth, async (req, res) => {
  try {
    const { newStartTime, reason } = req.body;
    
    const session = await ScheduleSession.findById(req.params.id)
      .populate('scheduleId', 'userId');

    if (!session || session.scheduleId.userId !== req.user.id) {
      return res.status(404).json({ message: 'Session not found' });
    }

    const rescheduledSession = await scheduleGenerator.rescheduleSession(
      req.params.id,
      new Date(newStartTime),
      reason || 'Manual reschedule'
    );

    res.json({ session: rescheduledSession });
  } catch (error) {
    console.error('Error rescheduling session:', error);
    res.status(500).json({ message: error.message || 'Error rescheduling session' });
  }
});

// Delete session
router.delete('/:id', auth, async (req, res) => {
  try {
    const session = await ScheduleSession.findById(req.params.id)
      .populate('scheduleId', 'userId');

    if (!session || session.scheduleId.userId !== req.user.id) {
      return res.status(404).json({ message: 'Session not found' });
    }

    await ScheduleSession.findByIdAndDelete(req.params.id);

    res.json({ message: 'Session deleted successfully' });
  } catch (error) {
    console.error('Error deleting session:', error);
    res.status(500).json({ message: 'Error deleting session' });
  }
});

export default router;
