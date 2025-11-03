import mongoose, { Schema, Document } from 'mongoose';

export interface ICustomTask {
  id: string;
  text: string;
  order: number;
}

export interface IChallenge extends Document {
  _id: mongoose.Types.ObjectId;
  userId: mongoose.Types.ObjectId;
  challengeId: string;
  challengeDays: 21 | 45 | 60 | 75;
  challengeLevel: 'Soft' | 'Hard' | 'Custom';
  startDate: Date;
  expectedEndDate: Date;
  status: 'active' | 'completed' | 'failed' | 'abandoned';
  tasks?: ICustomTask[];
  totalDays: number;
  completedDays: number;
  currentStreak: number;
  longestStreak: number;
  avgCompletionRate: number;
  completedAt?: Date;
  failedAt?: Date;
  failureReason?: string;
  createdAt: Date;
  updatedAt: Date;
}


const ChallengeSchema: Schema = new Schema(
  {
    userId: {
      type: Schema.Types.ObjectId,
      ref: 'User',
      required: true,
      index: true,
    },
    challengeId: {
      type: String,
      required: true,
      unique: true,
      index: true,
    },
    challengeDays: {
      type: Number,
      required: true,
      enum: [21, 45, 60, 75],
    },
    challengeLevel: {
      type: String,
      required: true,
      enum: ['Soft', 'Hard', 'Custom'],
    },
    startDate: {
      type: Date,
      required: true,
    },
    expectedEndDate: {
      type: Date,
      required: true,
    },
    status: {
      type: String,
      required: true,
      enum: ['active', 'completed', 'failed', 'abandoned'],
      default: 'active',
    },
    totalDays: {
      type: Number,
      default: 0,
    },
    completedDays: {
      type: Number,
      default: 0,
    },
    currentStreak: {
      type: Number,
      default: 0,
    },
    longestStreak: {
      type: Number,
      default: 0,
    },
    avgCompletionRate: {
      type: Number,
      default: 0,
      min: 0,
      max: 1,
    },
    completedAt: {
      type: Date,
      default: null,
    },
    failedAt: {
      type: Date,
      default: null,
    },
    failureReason: {
      type: String,
      default: null,
    },
  },
  {
    timestamps: true,
  }
);

// Compound indexes
ChallengeSchema.index({ userId: 1, status: 1 });
ChallengeSchema.index({ userId: 1, createdAt: -1 });
ChallengeSchema.index({ challengeId: 1 }, { unique: true });

// Virtual to calculate days remaining
ChallengeSchema.virtual('daysRemaining').get(function (this: IChallenge) {
  if (this.status !== 'active') return 0;
  const today = new Date();
  const diffTime = this.expectedEndDate.getTime() - today.getTime();
  const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
  return Math.max(0, diffDays);
});

export default mongoose.model<IChallenge>('Challenge', ChallengeSchema);