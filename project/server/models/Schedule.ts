import mongoose, { Schema, Document } from 'mongoose';

export interface IAdaptation {
  timestamp: Date;
  type: 'reschedule' | 'duration_change' | 'priority_adjust' | 'auto_reschedule';
  reason: string;
  oldValue: any;
  newValue: any;
}

export interface ISchedule extends Document {
  _id: string;
  userId: string;
  name: string;
  startDate: Date;
  endDate: Date;
  status: 'active' | 'completed' | 'archived';
  adaptations: IAdaptation[];
  preferences: {
    dailyStudyHours: number;
    preferredTimeSlots: string[];
    sessionDuration: number;
    breakDuration: number;
  };
  createdAt: Date;
  updatedAt: Date;
}

const AdaptationSchema = new Schema({
  timestamp: { type: Date, default: Date.now },
  type: { 
    type: String, 
    enum: ['reschedule', 'duration_change', 'priority_adjust', 'auto_reschedule'],
    required: true 
  },
  reason: { type: String, required: true },
  oldValue: Schema.Types.Mixed,
  newValue: Schema.Types.Mixed
});

const ScheduleSchema = new Schema({
  userId: { type: Schema.Types.ObjectId, ref: 'User', required: true },
  name: { type: String, required: true },
  startDate: { type: Date, required: true },
  endDate: { type: Date, required: true },
  status: { 
    type: String, 
    enum: ['active', 'completed', 'archived'], 
    default: 'active' 
  },
  adaptations: [AdaptationSchema],
  preferences: {
    dailyStudyHours: { type: Number, default: 4 },
    preferredTimeSlots: [{ type: String }],
    sessionDuration: { type: Number, default: 90 },
    breakDuration: { type: Number, default: 15 }
  }
}, {
  timestamps: true
});

// Indexes for better performance
ScheduleSchema.index({ userId: 1 });
ScheduleSchema.index({ userId: 1, status: 1 });
ScheduleSchema.index({ startDate: 1, endDate: 1 });

export default mongoose.model<ISchedule>('Schedule', ScheduleSchema);
