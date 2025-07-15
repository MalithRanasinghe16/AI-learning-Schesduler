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
  } catch (err: any) {
    console.error('Get adaptive schedule error:', err);
    res.status(500).json({ 
      message: 'Server Error', 
      error: err.message 
    });
  }
});

// @route   POST api/adaptive-schedule
// @desc    Generate a new adaptive schedule
// @access  Private
router.post('/', authenticateToken, async (req, res) => {
  console.log('=== ADAPTIVE SCHEDULE POST REQUEST ===');
  console.log('Request body:', JSON.stringify(req.body, null, 2));
  console.log('User ID:', req.user?.id);
  console.log('Auth header present:', !!req.headers.authorization);
  
  try {
    const { subjects, startDate } = req.body;
    
    console.log('Extracted data:', { subjects, startDate });
    
    // Validate request body
    if (!subjects || !Array.isArray(subjects) || subjects.length === 0) {
      console.log('VALIDATION ERROR: Invalid subjects array');
      return res.status(400).json({ 
        message: 'Subjects array is required and must not be empty' 
      });
    }
    
    if (!startDate) {
      console.log('VALIDATION ERROR: Missing startDate');
      return res.status(400).json({ 
        message: 'Start date is required' 
      });
    }
    
    // Parse startDate
    let parsedStartDate: Date;
    try {
      parsedStartDate = new Date(startDate);
      if (isNaN(parsedStartDate.getTime())) {
        throw new Error('Invalid date format');
      }
    } catch (err) {
      console.log('VALIDATION ERROR: Invalid date format:', startDate);
      return res.status(400).json({ 
        message: 'Invalid start date format' 
      });
    }
    
    console.log('Validation passed. Calling generateSchedule with:', {
      userId: req.user.id,
      subjects,
      startDate: parsedStartDate
    });
    
    const recommendations = await generateSchedule(req.user.id, subjects, parsedStartDate);
    
    console.log('Generated recommendations:', recommendations);
    console.log('Sending response with', recommendations.length, 'recommendations');
    
    res.json({ recommendations });
  } catch (err: any) {
    console.error('Generate adaptive schedule error:', err);
    console.error('Error stack:', err.stack);
    
    // Check for specific error types
    if (err.message.includes('not found') || err.message.includes('validation')) {
      console.log('Returning 400 error:', err.message);
      return res.status(400).json({ 
        message: err.message 
      });
    }
    
    console.log('Returning 500 error:', err.message);
    res.status(500).json({ 
      message: 'Server Error', 
      error: err.message 
    });
  }
});

export default router;
