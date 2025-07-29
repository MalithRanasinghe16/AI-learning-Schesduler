// Migration script to fix existing completed sessions
// This adds actualEndTime to completed sessions that don't have it

import mongoose from "mongoose";
import dotenv from "dotenv";

dotenv.config();

// Connect to MongoDB
const connectDB = async () => {
  try {
    await mongoose.connect(process.env.MONGODB_URI);
    console.log("🔗 Connected to MongoDB");
  } catch (error) {
    console.error("❌ MongoDB connection error:", error);
    process.exit(1);
  }
};

const ScheduleSessionSchema = new mongoose.Schema(
  {
    scheduleId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Schedule",
      required: true,
    },
    subjectId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Subject",
      required: true,
    },
    startTime: { type: Date, required: true },
    endTime: { type: Date, required: true },
    duration: { type: Number, required: true },
    status: {
      type: String,
      enum: ["scheduled", "in-progress", "completed", "missed", "rescheduled"],
      default: "scheduled",
    },
    priority: { type: Number, min: 1, max: 5, default: 3 },
    sessionType: {
      type: String,
      enum: ["study", "review", "practice", "break"],
      default: "study",
    },
    adaptationReason: { type: String },
    actualStartTime: { type: Date },
    actualEndTime: { type: Date },
    focusScore: { type: Number, min: 1, max: 10 },
    notes: { type: String },
    completionPercentage: { type: Number, min: 0, max: 100, default: 0 },
  },
  {
    timestamps: true,
  }
);

const ScheduleSession = mongoose.model(
  "ScheduleSession",
  ScheduleSessionSchema
);

const fixCompletedSessions = async () => {
  try {
    console.log("🔄 Finding completed sessions without actualEndTime...");

    // Find completed sessions that don't have actualEndTime
    const sessionsToFix = await ScheduleSession.find({
      status: "completed",
      actualEndTime: { $exists: false },
    });

    console.log(`📊 Found ${sessionsToFix.length} sessions to fix`);

    if (sessionsToFix.length === 0) {
      console.log("✅ No sessions need fixing");
      return;
    }

    // Update each session
    for (const session of sessionsToFix) {
      // Use updatedAt as the actualEndTime since that's when it was marked as completed
      const actualEndTime = session.updatedAt || session.endTime;

      await ScheduleSession.findByIdAndUpdate(session._id, {
        actualEndTime: actualEndTime,
      });

      console.log(
        `✅ Fixed session ${session._id} - actualEndTime: ${actualEndTime}`
      );
    }

    console.log(`🎉 Successfully fixed ${sessionsToFix.length} sessions`);
  } catch (error) {
    console.error("❌ Error fixing sessions:", error);
    throw error;
  }
};

const main = async () => {
  try {
    await connectDB();
    await fixCompletedSessions();
    console.log("🏁 Migration completed successfully");
  } catch (error) {
    console.error("❌ Migration failed:", error);
  } finally {
    await mongoose.connection.close();
    console.log("🔌 Database connection closed");
  }
};

main();
