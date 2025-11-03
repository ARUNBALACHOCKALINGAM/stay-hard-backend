import mongoose, { Schema, Document } from 'mongoose';

export interface ITask {
  id: string;
  text: string;
  completed: boolean;
  completedAt?: Date;
}

export interface IDailyProgress extends Document {
  _id: mongoose.Types.ObjectId;
  userId: mongoose.Types.ObjectId;
  challengeId: string;
  date: string; // ISO date string (YYYY-MM-DD)
  dayNumber: number;
  tasks: ITask[];
  completionRate: number;
  createdAt: Date;
  updatedAt: Date;
  // instance method added on the schema
  calculateCompletionRate(): number;
}

const TaskSchema = new Schema(
  {
    id: {
      type: String,
      required: true,
    },
    text: {
      type: String,
      required: true,
    },
    completed: {
      type: Boolean,
      required: true,
      default: false,
    },
    completedAt: {
      type: Date,
      default: null,
    },
  },
  { _id: false }
);

const DailyProgressSchema: Schema = new Schema(
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
      index: true,
    },
    date: {
      type: String, // Store as ISO string for easy comparison
      required: true,
    },
    dayNumber: {
      type: Number,
      required: true,
      min: 1,
    },
    tasks: {
      type: [TaskSchema],
      required: true,
      default: [],
    },
    completionRate: {
      type: Number,
      required: true,
      default: 0,
      min: 0,
      max: 1,
    },
  },
  {
    timestamps: true,
  }
);

// Compound indexes for efficient queries
DailyProgressSchema.index({ userId: 1, challengeId: 1, date: 1 }, { unique: true });
DailyProgressSchema.index({ userId: 1, date: 1 });
DailyProgressSchema.index({ challengeId: 1, dayNumber: 1 });

// Method to calculate completion rate
DailyProgressSchema.methods.calculateCompletionRate = function (this: IDailyProgress): number {
  if (!this.tasks || this.tasks.length === 0) return 0;
  const completedTasks = this.tasks.filter((task: ITask) => task.completed).length;
  return completedTasks / this.tasks.length;
};

// Pre-save hook to auto-calculate completion rate
DailyProgressSchema.pre('save', function (this: IDailyProgress, next: any) {
  if (typeof this.isModified === 'function' && this.isModified('tasks')) {
    // ensure calculateCompletionRate is callable and update the field
    this.completionRate = this.calculateCompletionRate();
  }
  next();
});

export default mongoose.model<IDailyProgress>('DailyProgress', DailyProgressSchema);