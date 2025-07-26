import express, { Response } from "express";
import Subject from "../models/Subject";
import ScheduleSession from "../models/ScheduleSession";
import { authenticateToken, AuthRequest } from "../middleware/auth";
import { validateSubject } from "../middleware/validation";

const router = express.Router();

// Helper function to calculate subject progress based on completed sessions
const calculateSubjectProgress = async (subjectId: string): Promise<number> => {
  try {
    console.log("🔍 Calculating progress for subject:", subjectId);

    // Get the subject to get estimated hours
    const subject = await Subject.findById(subjectId);
    if (!subject) {
      console.log("❌ Subject not found in calculation");
      return 0;
    }

    console.log("📚 Subject details:", {
      name: subject.name,
      estimatedHours: subject.estimatedHours,
      currentProgress: subject.progress,
    });

    const estimatedMinutes = (subject.estimatedHours || 0) * 60;
    if (estimatedMinutes === 0) {
      console.log("⚠️ No estimated hours set for subject");
      return 0;
    }

    // Get all completed sessions for this subject
    const completedSessions = await ScheduleSession.find({
      subjectId: subjectId,
      status: "completed",
    });

    console.log(`📅 Found ${completedSessions.length} completed sessions`);

    // Calculate total completed time in minutes
    const totalCompletedMinutes = completedSessions.reduce((total, session) => {
      console.log(`  - Session: ${session.duration} minutes`);
      return total + (session.duration || 0);
    }, 0);

    // Calculate progress percentage
    const progress = Math.min(
      100,
      Math.round((totalCompletedMinutes / estimatedMinutes) * 100)
    );

    console.log(`📊 Progress calculation result:`, {
      estimatedMinutes,
      totalCompletedMinutes,
      completedSessions: completedSessions.length,
      progress: `${progress}%`,
    });

    return progress;
  } catch (error) {
    console.error("❌ Error calculating subject progress:", error);
    return 0;
  }
};

// Helper function to update subject progress based on sessions
const updateSubjectProgressFromSessions = async (
  subjectId: string
): Promise<void> => {
  try {
    const newProgress = await calculateSubjectProgress(subjectId);

    await Subject.findByIdAndUpdate(subjectId, {
      progress: newProgress,
      isCompleted: newProgress >= 100,
    });

    console.log(`✅ Updated subject ${subjectId} progress to ${newProgress}%`);
  } catch (error) {
    console.error("Error updating subject progress:", error);
  }
};

// Get all subjects for user
router.get(
  "/",
  authenticateToken,
  async (req: AuthRequest, res: Response): Promise<void> => {
    try {
      const subjects = await Subject.find({ userId: req.user!._id }).sort({
        createdAt: -1,
      });

      // Update progress for all subjects based on completed sessions
      const subjectsWithUpdatedProgress = await Promise.all(
        subjects.map(async (subject) => {
          try {
            const updatedProgress = await calculateSubjectProgress(
              subject._id.toString()
            );

            // Update the subject if progress has changed
            if (updatedProgress !== subject.progress) {
              await Subject.findByIdAndUpdate(subject._id, {
                progress: updatedProgress,
                isCompleted: updatedProgress >= 100,
              });

              // Return updated subject data
              return {
                ...subject.toObject(),
                progress: updatedProgress,
                isCompleted: updatedProgress >= 100,
              };
            }

            return subject.toObject();
          } catch (error) {
            console.error(
              `Error updating progress for subject ${subject._id}:`,
              error
            );
            return subject.toObject();
          }
        })
      );

      res.json({ subjects: subjectsWithUpdatedProgress });
    } catch (error) {
      console.error("Get subjects error:", error);
      res.status(500).json({ message: "Internal server error" });
    }
  }
);

// Create new subject
router.post(
  "/",
  authenticateToken,
  validateSubject,
  async (req: AuthRequest, res: Response): Promise<void> => {
    try {
      const subjectData = {
        ...req.body,
        userId: req.user!._id,
      };

      const subject = new Subject(subjectData);
      await subject.save();

      res.status(201).json({
        message: "Subject created successfully",
        subject,
      });
    } catch (error) {
      console.error("Create subject error:", error);
      res.status(500).json({ message: "Internal server error" });
    }
  }
);

// Update subject
router.put(
  "/:id",
  authenticateToken,
  async (req: AuthRequest, res: Response): Promise<void> => {
    try {
      const subject = await Subject.findOneAndUpdate(
        { _id: req.params.id, userId: req.user!._id },
        req.body,
        { new: true, runValidators: true }
      );

      if (!subject) {
        res.status(404).json({ message: "Subject not found" });
        return;
      }

      res.json({
        message: "Subject updated successfully",
        subject,
      });
    } catch (error) {
      console.error("Update subject error:", error);
      res.status(500).json({ message: "Internal server error" });
    }
  }
);

// Delete subject
router.delete(
  "/:id",
  authenticateToken,
  async (req: AuthRequest, res: Response): Promise<void> => {
    try {
      const subject = await Subject.findOneAndDelete({
        _id: req.params.id,
        userId: req.user!._id,
      });

      if (!subject) {
        res.status(404).json({ message: "Subject not found" });
        return;
      }

      res.json({ message: "Subject deleted successfully" });
    } catch (error) {
      console.error("Delete subject error:", error);
      res.status(500).json({ message: "Internal server error" });
    }
  }
);

// Update subject progress based on completed sessions
router.patch(
  "/:id/progress",
  authenticateToken,
  async (req: AuthRequest, res: Response): Promise<void> => {
    try {
      console.log("🔍 Progress update request for subject:", req.params.id);
      console.log("🔍 User ID:", req.user!._id);

      // Verify subject belongs to user
      const subject = await Subject.findOne({
        _id: req.params.id,
        userId: req.user!._id,
      });

      if (!subject) {
        console.log("❌ Subject not found");
        res.status(404).json({ message: "Subject not found" });
        return;
      }

      console.log("✅ Subject found:", {
        name: subject.name,
        estimatedHours: subject.estimatedHours,
        currentProgress: subject.progress,
      });

      // Calculate progress from completed sessions
      const newProgress = await calculateSubjectProgress(req.params.id);
      console.log("📊 Calculated new progress:", newProgress);

      // Update subject with calculated progress
      const updatedSubject = await Subject.findByIdAndUpdate(
        req.params.id,
        {
          progress: newProgress,
          isCompleted: newProgress >= 100,
        },
        { new: true, runValidators: true }
      );

      console.log("✅ Subject updated successfully");

      res.json({
        message: "Progress updated based on completed sessions",
        subject: updatedSubject,
        calculatedProgress: newProgress,
      });
    } catch (error) {
      console.error("❌ Update progress error:", error);
      res.status(500).json({ message: "Internal server error" });
    }
  }
);

export default router;
export { updateSubjectProgressFromSessions };
