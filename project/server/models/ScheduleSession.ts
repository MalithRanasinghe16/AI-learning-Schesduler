import mongoose, { Schema, Document } from 'mongoose';

export interface IScheduleSession extends Document {
  _id: string;
  scheduleId: string;
  subjectId: string;
  startTime: Date;
  endTime: Date;
  duration: number; // minutes
  status: 'scheduled' | 'in-progress' | 'completed' | 'missed' | 'rescheduled';
  priority: number; // 1-5
  sessionType: 'study' | 'review' | 'practice' | 'break';
  adaptationReason?: string;
  actualStartTime?: Date;
  actualEndTime?: Date;
  focusScore?: number;
  notes?: string;
  completionPercentage?: number;
  createdAt: Date;
  updatedAt: Date;
}

const ScheduleSessionSchema = new Schema({
  scheduleId: { type: Schema.Types.ObjectId, ref: 'Schedule', required: true },
  subjectId: { type: Schema.Types.ObjectId, ref: 'Subject', required: true },
  startTime: { type: Date, required: true },
  endTime: { type: Date, required: true },
  duration: { type: Number, required: true }, // in minutes
  status: { 
    type: String, 
    enum: ['scheduled', 'in-progress', 'completed', 'missed', 'rescheduled'], 
    default: 'scheduled' 
  },
  priority: { type: Number, min: 1, max: 5, default: 3 },
  sessionType: { 
    type: String, 
    enum: ['study', 'review', 'practice', 'break'], 
    default: 'study' 
  },
  adaptationReason: { type: String },
  actualStartTime: { type: Date },
  actualEndTime: { type: Date },
  focusScore: { type: Number, min: 1, max: 10 },
  notes: { type: String },
  completionPercentage: { type: Number, min: 0, max: 100, default: 0 }
}, {
  timestamps: true
});

// Indexes for better performance
ScheduleSessionSchema.index({ scheduleId: 1 });
ScheduleSessionSchema.index({ subjectId: 1 });
ScheduleSessionSchema.index({ startTime: 1, endTime: 1 });
ScheduleSessionSchema.index({ status: 1 });
ScheduleSessionSchema.index({ scheduleId: 1, startTime: 1 });

// Virtual for getting actual duration
ScheduleSessionSchema.virtual('actualDuration').get(function() {
  if (this.actualStartTime && this.actualEndTime) {
    return Math.round((this.actualEndTime.getTime() - this.actualStartTime.getTime()) / (1000 * 60));
  }
  return null;
});

export default mongoose.model<IScheduleSession>('ScheduleSession', ScheduleSessionSchema);
