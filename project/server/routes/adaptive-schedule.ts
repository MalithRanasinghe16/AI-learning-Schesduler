import express from 'express';
import { getAdaptiveSchedule, generateSchedule } from '../services/aiScheduler';
import { authenticateToken } from '../middleware/auth';

const router = express.Router();

// @route   GET api/adaptive-schedule
// @desc    Get adaptive schedule recommendations
// @access  Private
router.get('/', authenticateToken, async (req, res) => {
  try {
    const recommendations = await getAdaptiveSchedule(req.user.id);
    res.json({ recommendations });
  } catch (err) {
    console.error(err.message);
    res.status(500).send('Server Error');
  }
});

// @route   POST api/adaptive-schedule
// @desc    Generate a new adaptive schedule
// @access  Private
router.post('/', authenticateToken, async (req, res) => {
  try {
    const { subjects, startDate } = req.body;
    const recommendations = await generateSchedule(req.user.id, subjects, startDate);
    res.json({ recommendations });
  } catch (err) {
    console.error(err.message);
    res.status(500).send('Server Error');
  }
});

export default router;
