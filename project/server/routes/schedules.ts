import express from 'express';
import { auth } from '../middleware/auth';
import Schedule from '../models/Schedule';
import ScheduleSession from '../models/ScheduleSession';
import { scheduleGenerator } from '../services/scheduleGenerator';

const router = express.Router();

// Get all schedules for user
router.get('/', auth, async (req, res) => {
  try {
    const schedules = await Schedule.find({ userId: req.user.id })
      .sort({ createdAt: -1 });

    // Populate session count for each schedule
    const schedulesWithSessions = await Promise.all(
      schedules.map(async (schedule) => {
        const sessionsCount = await ScheduleSession.countDocuments({ scheduleId: schedule._id });
        return {
          ...schedule.toObject(),
          sessionsCount
        };
      })
    );

    res.json({ schedules: schedulesWithSessions });
  } catch (error) {
    console.error('Error fetching schedules:', error);
    res.status(500).json({ message: 'Error fetching schedules' });
  }
});

// Get specific schedule with sessions
router.get('/:id', auth, async (req, res) => {
  try {
    const schedule = await Schedule.findOne({ 
      _id: req.params.id, 
      userId: req.user.id 
    });

    if (!schedule) {
      return res.status(404).json({ message: 'Schedule not found' });
    }

    const sessions = await ScheduleSession.find({ scheduleId: schedule._id })
      .populate('subjectId', 'name difficulty priority')
      .sort({ startTime: 1 });

    res.json({ 
      schedule: {
        ...schedule.toObject(),
        sessions
      }
    });
  } catch (error) {
    console.error('Error fetching schedule:', error);
    res.status(500).json({ message: 'Error fetching schedule' });
  }
});

// Create new schedule
router.post('/', auth, async (req, res) => {
  try {
    const {
      name,
      startDate,
      endDate,
      preferences
    } = req.body;

    const schedule = new Schedule({
      userId: req.user.id,
      name,
      startDate: new Date(startDate),
      endDate: new Date(endDate),
      preferences: {
        dailyStudyHours: preferences?.dailyStudyHours || 4,
        preferredTimeSlots: preferences?.preferredTimeSlots || ['morning', 'afternoon'],
        sessionDuration: preferences?.sessionDuration || 90,
        breakDuration: preferences?.breakDuration || 15
      }
    });

    await schedule.save();
    res.status(201).json({ schedule });
  } catch (error) {
    console.error('Error creating schedule:', error);
    res.status(500).json({ message: 'Error creating schedule' });
  }
});

// Generate smart schedule
router.post('/generate', auth, async (req, res) => {
  try {
    const {
      subjects,
      preferences,
      startDate,
      endDate,
      scheduleName
    } = req.body;

    if (!subjects || subjects.length === 0) {
      return res.status(400).json({ message: 'At least one subject is required' });
    }

    console.log('Generating schedule with params:', {
      userId: req.user.id,
      subjects,
      preferences,
      startDate,
      endDate,
      scheduleName
    });

    // Deactivate any existing active schedules
    await Schedule.updateMany(
      { userId: req.user.id, status: 'active' },
      { status: 'archived' }
    );

    const schedule = await scheduleGenerator.generateSchedule(
      req.user.id,
      subjects,
      preferences,
      startDate,
      endDate,
      scheduleName
    );

    // Get the generated sessions
    const sessions = await ScheduleSession.find({ scheduleId: schedule._id })
      .populate('subjectId', 'name difficulty priority')
      .sort({ startTime: 1 });

    res.status(201).json({ 
      schedule: {
        ...schedule.toObject(),
        sessions
      }
    });
  } catch (error) {
    console.error('Error generating schedule:', error);
    res.status(500).json({ 
      message: 'Error generating schedule',
      error: error.message 
    });
  }
});

// Update schedule
router.put('/:id', auth, async (req, res) => {
  try {
    const schedule = await Schedule.findOneAndUpdate(
      { _id: req.params.id, userId: req.user.id },
      req.body,
      { new: true }
    );

    if (!schedule) {
      return res.status(404).json({ message: 'Schedule not found' });
    }

    res.json({ schedule });
  } catch (error) {
    console.error('Error updating schedule:', error);
    res.status(500).json({ message: 'Error updating schedule' });
  }
});

// Delete schedule
router.delete('/:id', auth, async (req, res) => {
  try {
    const schedule = await Schedule.findOneAndDelete({ 
      _id: req.params.id, 
      userId: req.user.id 
    });

    if (!schedule) {
      return res.status(404).json({ message: 'Schedule not found' });
    }

    // Delete all associated sessions
    await ScheduleSession.deleteMany({ scheduleId: req.params.id });

    res.json({ message: 'Schedule deleted successfully' });
  } catch (error) {
    console.error('Error deleting schedule:', error);
    res.status(500).json({ message: 'Error deleting schedule' });
  }
});

// Adapt schedule based on completion patterns
router.post('/:id/adapt', auth, async (req, res) => {
  try {
    const schedule = await Schedule.findOne({ 
      _id: req.params.id, 
      userId: req.user.id 
    });

    if (!schedule) {
      return res.status(404).json({ message: 'Schedule not found' });
    }

    await scheduleGenerator.adaptSchedule(req.params.id);

    res.json({ message: 'Schedule adapted successfully' });
  } catch (error) {
    console.error('Error adapting schedule:', error);
    res.status(500).json({ message: 'Error adapting schedule' });
  }
});

export default router;
