import mongoose, { Document, Schema } from 'mongoose';
import bcrypt from 'bcryptjs';

export interface IUser extends Document {
  _id: string;
  email: string;
  password: string;
  firstName: string;
  lastName: string;
  learningPreferences: {
    preferredTimeSlots: string[];
    difficultyLevel: 'beginner' | 'intermediate' | 'advanced';
    learningStyle: 'visual' | 'auditory' | 'kinesthetic' | 'reading';
    dailyStudyGoal: number; // minutes
  };
  performanceMetrics: {
    completedSessions: number;
    averageScore: number;
    totalStudyTime: number; // minutes
    streakDays: number;
    lastActiveDate: Date;
  };
  createdAt: Date;
  updatedAt: Date;
  comparePassword(candidatePassword: string): Promise<boolean>;
}

const userSchema = new Schema<IUser>({
  email: {
    type: String,
    required: true,
    unique: true,
    lowercase: true,
    trim: true,
  },
  password: {
    type: String,
    required: true,
    minlength: 6,
  },
  firstName: {
    type: String,
    required: true,
    trim: true,
  },
  lastName: {
    type: String,
    required: true,
    trim: true,
  },
  learningPreferences: {
    preferredTimeSlots: [{
      type: String,
      // Allow both time slots and specific times
      validate: {
        validator: function(value: string) {
          // Allow time formats like "14:00" or predefined slots
          const timePattern = /^([01]?[0-9]|2[0-3]):[0-5][0-9]$/;
          const validSlots = ['morning', 'afternoon', 'evening', 'night'];
          return timePattern.test(value) || validSlots.includes(value);
        },
        message: 'Invalid time slot format. Use HH:MM or morning/afternoon/evening/night'
      }
    }],
    difficultyLevel: {
      type: String,
      enum: ['beginner', 'intermediate', 'advanced'],
      default: 'beginner'
    },
    learningStyle: {
      type: String,
      enum: ['visual', 'auditory', 'kinesthetic', 'reading'],
      default: 'visual'
    },
    dailyStudyGoal: {
      type: Number,
      default: 60 // 60 minutes
    }
  },
  performanceMetrics: {
    completedSessions: {
      type: Number,
      default: 0
    },
    averageScore: {
      type: Number,
      default: 0
    },
    totalStudyTime: {
      type: Number,
      default: 0
    },
    streakDays: {
      type: Number,
      default: 0
    },
    lastActiveDate: {
      type: Date,
      default: Date.now
    }
  }
}, {
  timestamps: true
});

// Hash password before saving
userSchema.pre('save', async function(next) {
  if (!this.isModified('password')) return next();
  
  try {
    const salt = await bcrypt.genSalt(12);
    this.password = await bcrypt.hash(this.password, salt);
    next();
  } catch (error) {
    next(error as Error);
  }
});

// Compare password method
userSchema.methods.comparePassword = async function(candidatePassword: string): Promise<boolean> {
  return bcrypt.compare(candidatePassword, this.password);
};

export default mongoose.model<IUser>('User', userSchema);