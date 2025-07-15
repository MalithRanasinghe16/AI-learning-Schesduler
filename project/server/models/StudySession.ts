import mongoose, { Document, Schema } from 'mongoose';

export interface IStudySession extends Document {
  _id: string;
  userId: string;
  subjectId: string;
  scheduledDate: Date;
  actualStartTime?: Date;
  actualEndTime?: Date;
  plannedDuration: number; // minutes
  actualDuration?: number; // minutes
  status: 'scheduled' | 'in-progress' | 'completed' | 'missed' | 'cancelled';
  focusScore?: number; // 1-10
  difficultyRating?: number; // 1-10
  notes?: string;
  aiRecommendations: {
    nextSessionDuration: number;
    difficultyAdjustment: string;
    recommendedBreaks: number;
  };
  createdAt: Date;
  updatedAt: Date;
}

const studySessionSchema = new Schema<IStudySession>({
  userId: {
    type: String,
    required: true,
    ref: 'User'
  },
  subjectId: {
    type: String,
    required: true,
    ref: 'Subject'
  },
  scheduledDate: {
    type: Date,
    required: true
  },
  actualStartTime: {
    type: Date
  },
  actualEndTime: {
    type: Date
  },
  plannedDuration: {
    type: Number,
    required: true,
    min: 15 // minimum 15 minutes
  },
  actualDuration: {
    type: Number,
    min: 0
  },
  status: {
    type: String,
    enum: ['scheduled', 'in-progress', 'completed', 'missed', 'cancelled'],
    default: 'scheduled'
  },
  focusScore: {
    type: Number,
    min: 1,
    max: 10
  },
  difficultyRating: {
    type: Number,
    min: 1,
    max: 10
  },
  notes: {
    type: String,
    trim: true
  },
  aiRecommendations: {
    nextSessionDuration: {
      type: Number,
      default: 60
    },
    difficultyAdjustment: {
      type: String,
      default: 'maintain'
    },
    recommendedBreaks: {
      type: Number,
      default: 2
    }
  }
}, {
  timestamps: true
});

export default mongoose.model<IStudySession>('StudySession', studySessionSchema);