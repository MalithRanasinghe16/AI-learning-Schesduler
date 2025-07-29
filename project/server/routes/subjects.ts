import express, { Request, Response } from "express";
import Subject from "../models/Subject";
import ScheduleSession from "../models/ScheduleSession";
import Schedule from "../models/Schedule";
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

// Get schedules affected by subject deletion
router.get(
  "/:id/affected-schedules",
  authenticateToken,
  async (req: AuthRequest, res: Response): Promise<void> => {
    try {
      const subjectId = req.params.id;

      console.log("🔍 Finding affected schedules for subject:", subjectId);

      // Find schedule sessions that contain this subject
      const scheduleSessions = await ScheduleSession.find({
        subjectId: subjectId,
      });

      console.log("📅 Found schedule sessions:", scheduleSessions.length);

      if (scheduleSessions.length === 0) {
        res.json({
          schedules: [],
          count: 0,
        });
        return;
      }

      // Get unique schedule IDs
      const uniqueScheduleIds = [
        ...new Set(
          scheduleSessions.map((session) => session.scheduleId.toString())
        ),
      ];

      console.log("📋 Unique schedule IDs:", uniqueScheduleIds);

      // Find all schedules that contain this subject and belong to the user
      const affectedSchedules = await Schedule.find({
        _id: { $in: uniqueScheduleIds },
        userId: req.user!._id,
      });

      console.log("✅ Found affected schedules:", affectedSchedules.length);

      // Add session data to each schedule
      const schedulesWithSessions = affectedSchedules.map((schedule) => {
        const sessions = scheduleSessions.filter(
          (session) => session.scheduleId.toString() === schedule._id.toString()
        );

        return {
          ...schedule.toJSON(),
          blocks: sessions,
        };
      });

      res.json({
        schedules: schedulesWithSessions,
        count: affectedSchedules.length,
      });
    } catch (error) {
      console.error("❌ Error finding affected schedules:", error);
      res.status(500).json({
        message: "Internal server error",
        error: error.message || "Unknown error",
      });
    }
  }
);

// Enhanced delete with schedule adjustment
router.delete(
  "/:id/with-schedule-adjustment",
  authenticateToken,
  async (req: AuthRequest, res: Response): Promise<void> => {
    try {
      const subjectId = req.params.id;
      const userId = req.user!._id;

      // First, verify subject exists and belongs to user
      const subject = await Subject.findOne({
        _id: subjectId,
        userId: userId,
      });

      if (!subject) {
        res.status(404).json({ message: "Subject not found" });
        return;
      }

      // Find all active schedules that contain this subject
      const affectedSchedules = await Schedule.find({
        userId: userId,
        status: { $nin: ["completed", "archived"] },
      });

      // Find schedule sessions for this subject in active schedules
      const affectedScheduleSessions = await ScheduleSession.find({
        subjectId: subjectId,
        scheduleId: { $in: affectedSchedules.map((s) => s._id) },
        status: { $nin: ["completed"] },
      });

      const adjustmentSummary: any = {};

      // Group sessions by schedule
      const sessionsBySchedule = new Map();
      affectedScheduleSessions.forEach((session) => {
        const scheduleId = session.scheduleId.toString();
        if (!sessionsBySchedule.has(scheduleId)) {
          sessionsBySchedule.set(scheduleId, []);
        }
        sessionsBySchedule.get(scheduleId).push(session);
      });

      // Process each affected schedule
      for (const schedule of affectedSchedules) {
        const scheduleId = schedule._id.toString();
        const subjectSessions = sessionsBySchedule.get(scheduleId) || [];

        if (subjectSessions.length === 0) continue;

        // Calculate total time to redistribute
        const totalMinutesToRedistribute = subjectSessions.reduce(
          (total, session) => total + (session.duration || 0),
          0
        );

        // Get remaining subjects in this schedule
        const remainingScheduleSessions = await ScheduleSession.find({
          scheduleId: schedule._id,
          subjectId: { $ne: subjectId },
          status: { $nin: ["completed"] },
        });

        const remainingSubjectIds = [
          ...new Set(
            remainingScheduleSessions.map((session) =>
              session.subjectId.toString()
            )
          ),
        ];

        if (remainingSubjectIds.length === 0) {
          // No remaining subjects, just delete the subject sessions
          await ScheduleSession.deleteMany({
            scheduleId: schedule._id,
            subjectId: subjectId,
          });
        } else {
          // Get subject details for weighting calculation
          const remainingSubjects = await Subject.find({
            _id: { $in: remainingSubjectIds },
            userId: userId,
          });

          // Calculate distribution weights based on priority, remaining hours, and progress
          const subjectWeights = remainingSubjects.map((subj) => {
            const priorityWeight =
              subj.priority === "high" ? 3 : subj.priority === "medium" ? 2 : 1;
            const remainingHours = Math.max(
              0,
              (subj.estimatedHours || 0) -
                (subj.progress / 100) * (subj.estimatedHours || 0)
            );
            const progressWeight = Math.max(0.1, (100 - subj.progress) / 100); // Less progress = more weight

            return {
              subjectId: subj._id.toString(),
              weight: priorityWeight * (remainingHours + 1) * progressWeight,
              name: subj.name,
            };
          });

          const totalWeight = subjectWeights.reduce(
            (sum, w) => sum + w.weight,
            0
          );

          // Redistribute time proportionally
          const redistributionMap = new Map();
          subjectWeights.forEach((sw) => {
            const additionalMinutes = Math.round(
              (sw.weight / totalWeight) * totalMinutesToRedistribute
            );
            redistributionMap.set(sw.subjectId, additionalMinutes);
          });

          // Delete subject sessions
          await ScheduleSession.deleteMany({
            scheduleId: schedule._id,
            subjectId: subjectId,
          });

          // Extend remaining subjects' sessions
          for (const subjectId of remainingSubjectIds) {
            const additionalMinutes = redistributionMap.get(subjectId) || 0;
            if (additionalMinutes > 0) {
              const subjectSessions = await ScheduleSession.find({
                scheduleId: schedule._id,
                subjectId: subjectId,
                status: { $nin: ["completed"] },
              });

              if (subjectSessions.length > 0) {
                const distributionPerSession = Math.ceil(
                  additionalMinutes / subjectSessions.length
                );

                for (const session of subjectSessions) {
                  session.duration =
                    (session.duration || 0) + distributionPerSession;

                  // Update end time
                  if (session.startTime) {
                    const endTime = new Date(
                      session.startTime.getTime() + session.duration * 60000
                    );
                    session.endTime = endTime;
                  }

                  await session.save();
                }
              }
            }
          }

          // Store adjustment summary
          adjustmentSummary[scheduleId] = {
            redistributedHours: totalMinutesToRedistribute / 60,
            affectedSubjects: remainingSubjectIds.length,
            redistributionDetails: subjectWeights.map((sw) => ({
              subject: sw.name,
              additionalMinutes: redistributionMap.get(sw.subjectId) || 0,
            })),
          };
        }

        // Update schedule end date if needed
        const lastSession = await ScheduleSession.findOne({
          scheduleId: schedule._id,
        }).sort({ endTime: -1 });

        if (lastSession) {
          schedule.endDate = lastSession.endTime;
          await schedule.save();
        }
      }

      // Delete the subject
      await Subject.findByIdAndDelete(subjectId);

      // Also delete any remaining schedule sessions for this subject
      await ScheduleSession.deleteMany({ subjectId: subjectId });

      res.json({
        message: "Subject deleted and schedules adjusted successfully",
        adjustmentSummary,
        affectedSchedules: affectedSchedules.length,
      });
    } catch (error) {
      console.error("Error in enhanced subject deletion:", error);
      res.status(500).json({ message: "Internal server error" });
    }
  }
);

// Complete all remaining sessions for a subject when it's marked as completed
router.patch(
  "/:id/complete-sessions",
  authenticateToken,
  async (req: AuthRequest, res: Response): Promise<void> => {
    try {
      const { id: subjectId } = req.params;
      console.log(
        "🎯 Completing all remaining sessions for subject:",
        subjectId
      );

      // Find all non-completed sessions for this subject
      const remainingSessions = await ScheduleSession.find({
        subjectId: subjectId,
        status: { $ne: "completed" },
      });

      console.log(
        `📅 Found ${remainingSessions.length} remaining sessions to complete`
      );

      if (remainingSessions.length === 0) {
        res.json({
          message: "No remaining sessions to complete",
          completedSessions: 0,
        });
        return;
      }

      // Mark all remaining sessions as completed
      const updateResult = await ScheduleSession.updateMany(
        {
          subjectId: subjectId,
          status: { $ne: "completed" },
        },
        {
          $set: {
            status: "completed",
            completionPercentage: 100,
          },
        }
      );

      console.log(
        `✅ Marked ${updateResult.modifiedCount} sessions as completed`
      );

      // Update the subject to be completed
      await Subject.findByIdAndUpdate(subjectId, {
        progress: 100,
        isCompleted: true,
      });

      // Get affected schedules for response
      const affectedSchedules = await Promise.all(
        [
          ...new Set(remainingSessions.map((session) => session.scheduleId)),
        ].map(async (scheduleId) => {
          const schedule = await Schedule.findById(scheduleId);
          return schedule ? { _id: schedule._id, name: schedule.name } : null;
        })
      );

      const validAffectedSchedules = affectedSchedules.filter(
        (schedule) => schedule !== null
      );

      res.json({
        message: "All remaining sessions marked as completed",
        completedSessions: updateResult.modifiedCount,
        affectedSchedules: validAffectedSchedules,
      });
    } catch (error) {
      console.error("Error completing subject sessions:", error);
      res
        .status(500)
        .json({ message: "Internal server error", error: error.message });
    }
  }
);

export default router;
export { updateSubjectProgressFromSessions };
