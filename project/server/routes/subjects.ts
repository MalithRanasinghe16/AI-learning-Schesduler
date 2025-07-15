import express, { Response } from 'express';
import Subject from '../models/Subject';
import { authenticateToken, AuthRequest } from '../middleware/auth';

const router = express.Router();

// Get all subjects for user
router.get('/', authenticateToken, async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const subjects = await Subject.find({ userId: req.user!._id }).sort({ createdAt: -1 });
    res.json({ subjects });
  } catch (error) {
    console.error('Get subjects error:', error);
    res.status(500).json({ message: 'Internal server error' });
  }
});

// Create new subject
router.post('/', authenticateToken, async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const subjectData = {
      ...req.body,
      userId: req.user!._id
    };

    const subject = new Subject(subjectData);
    await subject.save();

    res.status(201).json({
      message: 'Subject created successfully',
      subject
    });
  } catch (error) {
    console.error('Create subject error:', error);
    res.status(500).json({ message: 'Internal server error' });
  }
});

// Update subject
router.put('/:id', authenticateToken, async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const subject = await Subject.findOneAndUpdate(
      { _id: req.params.id, userId: req.user!._id },
      req.body,
      { new: true, runValidators: true }
    );

    if (!subject) {
      res.status(404).json({ message: 'Subject not found' });
      return;
    }

    res.json({
      message: 'Subject updated successfully',
      subject
    });
  } catch (error) {
    console.error('Update subject error:', error);
    res.status(500).json({ message: 'Internal server error' });
  }
});

// Delete subject
router.delete('/:id', authenticateToken, async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const subject = await Subject.findOneAndDelete({
      _id: req.params.id,
      userId: req.user!._id
    });

    if (!subject) {
      res.status(404).json({ message: 'Subject not found' });
      return;
    }

    res.json({ message: 'Subject deleted successfully' });
  } catch (error) {
    console.error('Delete subject error:', error);
    res.status(500).json({ message: 'Internal server error' });
  }
});

// Update subject progress
router.patch('/:id/progress', authenticateToken, async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const { progress } = req.body;
    
    const subject = await Subject.findOneAndUpdate(
      { _id: req.params.id, userId: req.user!._id },
      { 
        progress,
        isCompleted: progress >= 100
      },
      { new: true, runValidators: true }
    );

    if (!subject) {
      res.status(404).json({ message: 'Subject not found' });
      return;
    }

    res.json({
      message: 'Progress updated successfully',
      subject
    });
  } catch (error) {
    console.error('Update progress error:', error);
    res.status(500).json({ message: 'Internal server error' });
  }
});

export default router;