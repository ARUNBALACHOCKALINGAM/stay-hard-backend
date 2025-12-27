import mongoose, { Schema, Document } from 'mongoose';

export interface IUser extends Document {
  _id: mongoose.Types.ObjectId;
  email: string;
  name: string;
  photoUrl?: string;
  firebaseUid?: string | null;  // Firebase User ID (optional for local users)
  passwordHash?: string | null; // bcrypt password hash for local users
  provider?: 'google' | 'local';
  currentChallengeId?: string;
  emailVerified: boolean;
  lastLogin?: Date;
  createdAt: Date;
  updatedAt: Date;
}

const UserSchema: Schema = new Schema(
  {
    email: {
      type: String,
      required: true,
      unique: true,
      lowercase: true,
      trim: true,
      index: true,
    },
    name: {
      type: String,
      required: true,
      trim: true,
    },
    photoUrl: {
      type: String,
      default: null,
    },
    firebaseUid: {
      type: String,
      required: false,
      unique: true,
      sparse: true,
      index: true,
    },
    passwordHash: {
      type: String,
      required: false,
      default: null,
    },
    provider: {
      type: String,
      enum: ['google', 'local'],
      default: 'google',
    },
    currentChallengeId: {
      type: String,
      default: null,
    },
    emailVerified: {
      type: Boolean,
      default: false,
    },
    lastLogin: {
      type: Date,
      default: null,
    }
  },
  {
    timestamps: true, // Automatically adds createdAt and updatedAt
  }
);

// Indexes
UserSchema.index({ email: 1 });
UserSchema.index({ firebaseUid: 1 });

export default mongoose.model<IUser>('User', UserSchema);