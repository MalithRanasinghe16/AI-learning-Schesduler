import express from "express";
import mongoose from "mongoose";
import { auth } from "../middleware/auth";
import ScheduleSession from "../models/ScheduleSession";
import Schedule from "../models/Schedule";
import { scheduleGenerator } from "../services/scheduleGenerator";
import { updateSubjectProgressFromSessions } from "./subjects";
import { startOfDay, endOfDay } from "date-fns";

const router = express.Router();

// Simple test endpoint to confirm backend is running updated code
router.get("/test", auth, async (req, res) => {
  console.log("🧪 TEST ENDPOINT CALLED - Backend is running updated code!");
  res.json({
    message: "Backend running updated code",
    timestamp: new Date().toISOString(),
    userId: req.user.id,
  });
});

// Get schedule sessions with filters
router.get("/", auth, async (req, res) => {
  try {
    const { scheduleId, startDate, endDate, status } = req.query;

    console.log("🔍 Schedule sessions request:", {
      scheduleId,
      startDate,
      endDate,
      status,
      userId: req.user.id,
    });

    const filter: any = {};

    // Add schedule filter if provided
    if (scheduleId) {
      filter.scheduleId = scheduleId;
      console.log("🔍 Filter by scheduleId:", scheduleId);
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
    if (status && status !== "all") {
      filter.status = status;
    }

    console.log("🔍 Session query filter:", filter);

    // First, find sessions without populate to see raw results
    const rawSessions = await ScheduleSession.find(filter).sort({
      startTime: 1,
    });
    console.log("📊 Raw sessions found:", rawSessions.length);

    // If no sessions found and we have a scheduleId, do comprehensive debugging
    if (rawSessions.length === 0 && scheduleId) {
      console.log("🔬 NO SESSIONS FOUND - Comprehensive debugging...");

      // Test different query types
      const asString = await ScheduleSession.find({ scheduleId: scheduleId });
      const asObjectId = await ScheduleSession.find({
        scheduleId: new mongoose.Types.ObjectId(scheduleId as string),
      });

      console.log("📊 Sessions with string query:", asString.length);
      console.log("📊 Sessions with ObjectId query:", asObjectId.length);

      // Check if any sessions exist at all for any schedule
      const totalSessions = await ScheduleSession.countDocuments({});
      console.log("📊 Total sessions in database:", totalSessions);

      // Check if schedule exists and user owns it
      const schedule = await Schedule.findOne({
        _id: scheduleId,
        userId: req.user.id,
      });
      console.log("📊 Schedule exists and user owns it:", !!schedule);

      if (schedule) {
        console.log("📊 Schedule details:", {
          id: schedule._id,
          name: schedule.name,
          userId: schedule.userId,
          requestUserId: req.user.id,
        });
      }

      // If we found sessions with different query types, use them
      if (asString.length > 0) {
        console.log("✅ Using string query result");
        const sessions = await ScheduleSession.find({ scheduleId: scheduleId })
          .populate("subjectId", "name difficulty priority category")
          .sort({ startTime: 1 });
        console.log(
          "✅ Returning sessions after string query:",
          sessions.length
        );
        return res.json({ sessions });
      } else if (asObjectId.length > 0) {
        console.log("✅ Using ObjectId query result");
        const sessions = await ScheduleSession.find({
          scheduleId: new mongoose.Types.ObjectId(scheduleId as string),
        })
          .populate("subjectId", "name difficulty priority category")
          .sort({ startTime: 1 });
        console.log(
          "✅ Returning sessions after ObjectId query:",
          sessions.length
        );
        return res.json({ sessions });
      }
    }

    if (rawSessions.length > 0) {
      console.log("📋 Sample raw session:", {
        id: rawSessions[0]._id,
        scheduleId: rawSessions[0].scheduleId,
        scheduleIdType: typeof rawSessions[0].scheduleId,
      });
    }

    // Now get sessions with populate
    const sessions = await ScheduleSession.find(filter)
      .populate("subjectId", "name difficulty priority category")
      .sort({ startTime: 1 });

    console.log("📊 Sessions after populate:", sessions.length);

    // Only verify schedule ownership if we have a specific scheduleId
    if (scheduleId && sessions.length > 0) {
      console.log("🔍 Verifying schedule ownership...");

      const schedule = await Schedule.findOne({
        _id: scheduleId,
        userId: req.user.id,
      });

      if (!schedule) {
        console.warn("⚠️ User does not own the requested schedule");
        return res.json({ sessions: [] });
      }

      console.log("✅ Schedule ownership verified");
    }

    console.log("✅ Returning sessions:", sessions.length);

    res.json({ sessions: sessions });
  } catch (error) {
    console.error("❌ Error fetching sessions:", error);
    res.status(500).json({ message: "Error fetching sessions" });
  }
});

// Get today's sessions
router.get("/today", auth, async (req, res) => {
  try {
    const today = new Date();
    const startOfToday = startOfDay(today);
    const endOfToday = endOfDay(today);

    const sessions = await ScheduleSession.find({
      startTime: {
        $gte: startOfToday,
        $lte: endOfToday,
      },
    })
      .populate("subjectId", "name difficulty priority category")
      .populate("scheduleId", "name userId")
      .sort({ startTime: 1 });

    // Filter by user ownership
    const userSessions = sessions.filter(
      (session) =>
        session.scheduleId && (session.scheduleId as any).userId === req.user.id
    );

    res.json({ sessions: userSessions });
  } catch (error) {
    console.error("Error fetching today's sessions:", error);
    res.status(500).json({ message: "Error fetching today's sessions" });
  }
});

// Get today's sessions for a specific schedule
router.get("/today/:scheduleId", auth, async (req, res) => {
  try {
    const { scheduleId } = req.params;
    const today = new Date();
    const startOfToday = startOfDay(today);
    const endOfToday = endOfDay(today);

    console.log("🔍 Getting today's sessions for schedule:", {
      scheduleId,
      userId: req.user.id,
      today: today.toISOString(),
      startOfToday: startOfToday.toISOString(),
      endOfToday: endOfToday.toISOString(),
    });

    // First verify the schedule belongs to the user
    const schedule = await Schedule.findOne({
      _id: scheduleId,
      userId: req.user.id,
    });
    if (!schedule) {
      console.log("❌ Schedule not found or access denied:", {
        scheduleId,
        userId: req.user.id,
      });
      return res
        .status(404)
        .json({ message: "Schedule not found or access denied" });
    }

    const sessions = await ScheduleSession.find({
      scheduleId: scheduleId,
      startTime: {
        $gte: startOfToday,
        $lte: endOfToday,
      },
    })
      .populate("subjectId", "name difficulty priority category")
      .populate("scheduleId", "name userId")
      .sort({ startTime: 1 });

    console.log("✅ Found today's sessions for schedule:", {
      scheduleId,
      scheduleName: schedule.name,
      sessionCount: sessions.length,
      sessions: sessions.map((s) => ({
        id: s._id,
        subject: (s.subjectId as any)?.name,
        startTime: s.startTime,
        status: s.status,
      })),
    });

    res.json({ sessions });
  } catch (error) {
    console.error("❌ Error fetching today's sessions for schedule:", error);
    res
      .status(500)
      .json({ message: "Error fetching today's sessions for schedule" });
  }
});

// Get specific session
router.get("/:id", auth, async (req, res) => {
  try {
    const session = await ScheduleSession.findById(req.params.id)
      .populate("subjectId", "name difficulty priority category")
      .populate("scheduleId", "name userId");

    if (!session) {
      return res.status(404).json({ message: "Session not found" });
    }

    // Verify user ownership through schedule
    if (
      !(session.scheduleId as any)?.userId ||
      (session.scheduleId as any).userId !== req.user.id
    ) {
      return res.status(403).json({ message: "Access denied" });
    }

    res.json({ session });
  } catch (error) {
    console.error("Error fetching session:", error);
    res.status(500).json({ message: "Error fetching session" });
  }
});

// Create new session
router.post("/", auth, async (req, res) => {
  try {
    const { scheduleId, subjectId, startTime, endTime, sessionType, status } =
      req.body;

    // Verify schedule ownership
    const schedule = await Schedule.findOne({
      _id: scheduleId,
      userId: req.user.id,
    });
    if (!schedule) {
      return res
        .status(403)
        .json({ message: "Schedule not found or access denied" });
    }

    const session = new ScheduleSession({
      scheduleId,
      subjectId,
      startTime: new Date(startTime),
      endTime: new Date(endTime),
      sessionType: sessionType || "study",
      status: status || "scheduled",
      duration: Math.round(
        (new Date(endTime).getTime() - new Date(startTime).getTime()) /
          (1000 * 60)
      ),
    });

    await session.save();

    const populatedSession = await ScheduleSession.findById(
      session._id
    ).populate("subjectId", "name difficulty priority category");

    res.status(201).json({ session: populatedSession });
  } catch (error) {
    console.error("Error creating session:", error);
    res.status(500).json({ message: "Error creating session" });
  }
});

// Update session
router.put("/:id", auth, async (req, res) => {
  try {
    console.log("🔍 PUT /schedule-sessions/:id called");
    console.log("🔍 Session ID:", req.params.id);
    console.log("🔍 User ID:", req.user.id);

    const session = await ScheduleSession.findById(req.params.id).populate(
      "scheduleId",
      "userId"
    );

    if (!session) {
      console.log("❌ Session not found");
      return res.status(404).json({ message: "Session not found" });
    }

    console.log("✅ Session found for PUT update");

    // Verify user ownership through schedule
    const scheduleUserId = (session.scheduleId as any)?.userId;
    const requestUserId = req.user.id;

    if (!scheduleUserId) {
      console.log("❌ Access denied - no schedule userId found");
      return res.status(403).json({ message: "Access denied" });
    }

    // Handle both string and ObjectId comparisons
    const userIdMatch = scheduleUserId.toString() === requestUserId.toString();

    if (!userIdMatch) {
      console.log("❌ Access denied - user ID mismatch");
      console.log("Schedule userId:", scheduleUserId, typeof scheduleUserId);
      console.log("Request userId:", requestUserId, typeof requestUserId);
      return res.status(403).json({ message: "Access denied" });
    }

    console.log("✅ User ownership verified for PUT update");

    const updatedSession = await ScheduleSession.findByIdAndUpdate(
      req.params.id,
      req.body,
      { new: true }
    ).populate("subjectId", "name difficulty priority category");

    res.json({ session: updatedSession });
  } catch (error) {
    console.error("Error updating session:", error);
    res.status(500).json({ message: "Error updating session" });
  }
});

// Update session status (patch)
router.patch("/:id/status", auth, async (req, res) => {
  try {
    const { status } = req.body;

    console.log("🔍 PATCH /schedule-sessions/:id/status called");
    console.log("🔍 Session ID:", req.params.id);
    console.log("🔍 User ID:", req.user.id);
    console.log("🔍 Status:", status);

    const session = await ScheduleSession.findById(req.params.id).populate(
      "scheduleId",
      "userId"
    );

    if (!session) {
      console.log("❌ Session not found");
      return res.status(404).json({ message: "Session not found" });
    }

    console.log("✅ Session found:", {
      sessionId: session._id,
      scheduleId: session.scheduleId,
      scheduleIdType: typeof session.scheduleId,
    });

    // Debug the populated schedule
    if (session.scheduleId) {
      console.log("📋 Populated schedule:", {
        scheduleId: (session.scheduleId as any)._id,
        scheduleUserId: (session.scheduleId as any).userId,
        scheduleUserIdType: typeof (session.scheduleId as any).userId,
        requestUserId: req.user.id,
        requestUserIdType: typeof req.user.id,
        idsMatch: (session.scheduleId as any).userId === req.user.id,
        idsMatchString:
          (session.scheduleId as any).userId?.toString() ===
          req.user.id?.toString(),
      });
    } else {
      console.log("❌ Schedule not populated or not found");
    }

    // Verify user ownership through schedule
    const scheduleUserId = (session.scheduleId as any)?.userId;
    const requestUserId = req.user.id;

    if (!scheduleUserId) {
      console.log("❌ Access denied - no schedule userId found");
      return res.status(403).json({ message: "Access denied" });
    }

    // Handle both string and ObjectId comparisons
    const userIdMatch = scheduleUserId.toString() === requestUserId.toString();

    if (!userIdMatch) {
      console.log("❌ Access denied - user ID mismatch");
      console.log("Schedule userId:", scheduleUserId, typeof scheduleUserId);
      console.log("Request userId:", requestUserId, typeof requestUserId);
      return res.status(403).json({ message: "Access denied" });
    }

    console.log("✅ User ownership verified");

    const updateData: any = { status };

    // If marking as completed, add completion time
    if (status === "completed") {
      const completionTime = new Date();
      updateData.completedAt = completionTime;
      updateData.actualEndTime = completionTime; // For analytics queries
    }

    // If starting a session, add start time
    if (status === "in-progress") {
      const startTime = new Date();
      updateData.startedAt = startTime;
      updateData.actualStartTime = startTime; // For analytics queries
    }

    const updatedSession = await ScheduleSession.findByIdAndUpdate(
      req.params.id,
      updateData,
      { new: true }
    ).populate("subjectId", "name difficulty priority category");

    // If the session was marked as completed, update subject progress
    if (status === "completed" && updatedSession) {
      console.log("🔄 Session completed, updating subject progress...");
      try {
        await updateSubjectProgressFromSessions(
          updatedSession.subjectId.toString()
        );
        console.log("✅ Subject progress updated successfully");
      } catch (progressError) {
        console.error("❌ Error updating subject progress:", progressError);
        // Don't fail the session update if progress update fails
      }
    }

    res.json({ session: updatedSession });
  } catch (error) {
    console.error("Error updating session status:", error);
    res.status(500).json({ message: "Error updating session status" });
  }
});

// Start session
router.post("/:id/start", auth, async (req, res) => {
  try {
    const session = await ScheduleSession.findById(req.params.id).populate(
      "scheduleId",
      "userId"
    );

    if (!session) {
      return res.status(404).json({ message: "Session not found" });
    }

    // Verify user ownership through schedule
    if (
      !(session.scheduleId as any)?.userId ||
      (session.scheduleId as any).userId !== req.user.id
    ) {
      return res.status(403).json({ message: "Access denied" });
    }

    const updatedSession = await ScheduleSession.findByIdAndUpdate(
      req.params.id,
      {
        status: "in-progress",
        startedAt: new Date(),
      },
      { new: true }
    ).populate("subjectId", "name difficulty priority category");

    res.json({ session: updatedSession });
  } catch (error) {
    console.error("Error starting session:", error);
    res.status(500).json({ message: "Error starting session" });
  }
});

// Complete session
router.post("/:id/complete", auth, async (req, res) => {
  try {
    const { focusScore, actualDuration } = req.body;

    const session = await ScheduleSession.findById(req.params.id).populate(
      "scheduleId",
      "userId"
    );

    if (!session) {
      return res.status(404).json({ message: "Session not found" });
    }

    // Verify user ownership through schedule
    if (
      !(session.scheduleId as any)?.userId ||
      (session.scheduleId as any).userId !== req.user.id
    ) {
      return res.status(403).json({ message: "Access denied" });
    }

    const updateData: any = {
      status: "completed",
      completedAt: new Date(),
    };

    if (focusScore !== undefined) {
      updateData.focusScore = focusScore;
    }

    if (actualDuration !== undefined) {
      updateData.actualDuration = actualDuration;
    }

    const updatedSession = await ScheduleSession.findByIdAndUpdate(
      req.params.id,
      updateData,
      { new: true }
    ).populate("subjectId", "name difficulty priority category");

    res.json({ session: updatedSession });
  } catch (error) {
    console.error("Error completing session:", error);
    res.status(500).json({ message: "Error completing session" });
  }
});

// Reschedule session
router.post("/:id/reschedule", auth, async (req, res) => {
  try {
    const { startTime, endTime } = req.body;

    const session = await ScheduleSession.findById(req.params.id).populate(
      "scheduleId",
      "userId"
    );

    if (!session) {
      return res.status(404).json({ message: "Session not found" });
    }

    // Verify user ownership through schedule
    if (
      !(session.scheduleId as any)?.userId ||
      (session.scheduleId as any).userId !== req.user.id
    ) {
      return res.status(403).json({ message: "Access denied" });
    }

    const updatedSession = await ScheduleSession.findByIdAndUpdate(
      req.params.id,
      {
        startTime: new Date(startTime),
        endTime: new Date(endTime),
        duration: Math.round(
          (new Date(endTime).getTime() - new Date(startTime).getTime()) /
            (1000 * 60)
        ),
      },
      { new: true }
    ).populate("subjectId", "name difficulty priority category");

    res.json({ session: updatedSession });
  } catch (error) {
    console.error("Error rescheduling session:", error);
    res.status(500).json({ message: "Error rescheduling session" });
  }
});

// Delete session
router.delete("/:id", auth, async (req, res) => {
  try {
    const session = await ScheduleSession.findById(req.params.id).populate(
      "scheduleId",
      "userId"
    );

    if (!session) {
      return res.status(404).json({ message: "Session not found" });
    }

    // Verify user ownership through schedule
    if (
      !(session.scheduleId as any)?.userId ||
      (session.scheduleId as any).userId !== req.user.id
    ) {
      return res.status(403).json({ message: "Access denied" });
    }

    await ScheduleSession.findByIdAndDelete(req.params.id);

    res.json({ message: "Session deleted successfully" });
  } catch (error) {
    console.error("Error deleting session:", error);
    res.status(500).json({ message: "Error deleting session" });
  }
});

// Debug endpoint - check session ownership (no auth required for debugging)
router.get("/debug-session/:id", async (req, res) => {
  try {
    const sessionId = req.params.id;
    console.log("🐛 DEBUG SESSION OWNERSHIP for:", sessionId);

    const session = await ScheduleSession.findById(sessionId).populate(
      "scheduleId"
    );

    if (!session) {
      console.log("❌ Session not found");
      return res.json({ error: "Session not found" });
    }

    console.log("✅ Session found:", {
      sessionId: session._id,
      scheduleId: session.scheduleId,
      scheduleDetails: session.scheduleId,
    });

    const schedule = await Schedule.findById(session.scheduleId);

    console.log("📋 Schedule details:", {
      scheduleId: schedule?._id,
      scheduleUserId: schedule?.userId,
      scheduleUserIdType: typeof schedule?.userId,
    });

    res.json({
      sessionId: session._id,
      scheduleId: session.scheduleId,
      schedule: {
        id: schedule?._id,
        userId: schedule?.userId,
        userIdType: typeof schedule?.userId,
        name: schedule?.name,
      },
    });
  } catch (error) {
    console.error("🐛 Debug session error:", error);
    res.status(500).json({ error: error.message });
  }
});

export default router;
