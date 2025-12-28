import express, { Request, Response, NextFunction } from 'express';
import dotenv from 'dotenv';
import connectDB from './config/database';
import mongoose from 'mongoose';
import cors from 'cors';
import * as admin from 'firebase-admin';

// Initialize Firebase Admin SDK
// Build a proper service account object (keys expected: project_id, client_email, private_key)
const initFirebaseAdmin = () => {
  // Prefer explicit service account parts from env
  const projectId = process.env.FIREBASE_PROJECT_ID;
  const clientEmail = process.env.FIREBASE_CLIENT_EMAIL;
  const rawPrivateKey = process.env.FIREBASE_PRIVATE_KEY;

  if (projectId && clientEmail && rawPrivateKey) {
    const serviceAccount = {
      project_id: projectId,
      client_email: clientEmail,
      private_key: rawPrivateKey.replace(/\\n/g, '\n'),
    } as admin.ServiceAccount;

    try {
      admin.initializeApp({
        credential: admin.credential.cert(serviceAccount),
      });
      console.log('✅ Firebase Admin initialized from environment service account');
      return;
    } catch (err) {
      console.error('Failed to initialize Firebase Admin with env credentials:', err);
      throw err;
    }
  }

  // Fallback: if GOOGLE_APPLICATION_CREDENTIALS is set, use application default
  if (process.env.GOOGLE_APPLICATION_CREDENTIALS) {
    try {
      admin.initializeApp({ credential: admin.credential.applicationDefault() });
      console.log('✅ Firebase Admin initialized using application default credentials');
      return;
    } catch (err) {
      console.error('Failed to initialize Firebase Admin with application default credentials:', err);
      throw err;
    }
  }

  console.warn('⚠️ Firebase Admin SDK not initialized: no service account found in environment. Set FIREBASE_PROJECT_ID, FIREBASE_CLIENT_EMAIL, and FIREBASE_PRIVATE_KEY (with escaped newlines) or set GOOGLE_APPLICATION_CREDENTIALS.');
};

// Load environment variables before initializing Firebase or other services
dotenv.config();

initFirebaseAdmin();

// Import routes
import userRoutes from './routes/users';
import challengeRoutes from './routes/challenges';
import progressRoutes from './routes/progress';
import galleryRoutes from './routes/gallery';
import authRoutes from './routes/auth';

const app = express();

// Middleware
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Connect to MongoDB
const mongoURI = process.env.MONGODB_URI || 'mongodb://localhost:27017/stay-hard';
mongoose.connect(mongoURI)
  .then(() => console.log('🌿 MongoDB Connected'))
  .catch(err => {
    console.error('MongoDB connection error:', err);
    // process.exit(1);
  });

// Enable CORS
app.use(cors());

// Routes
app.use('/api/auth', authRoutes);  // Auth routes should be first
app.use('/api/users', userRoutes);
app.use('/api/challenges', challengeRoutes);
app.use('/api/progress', progressRoutes);
app.use('/api/gallery', galleryRoutes);

// Error handling middleware
app.use((err: Error, req: Request, res: Response, next: NextFunction) => {
  console.error(err.stack);
  res.status(500).json({ 
    message: 'Something went wrong!',
    error: process.env.NODE_ENV === 'development' ? err.message : undefined
  });
});

// 404 handler
app.use((req: Request, res: Response) => {
  res.status(404).json({ message: 'Route not found' });
});

const PORT =  Number(process.env.PORT) || 8080;

const server = app.listen(PORT, "0.0.0.0", () => {
  console.log(`
🚀 Server running on port ${PORT}
📑 API Routes:
   - Auth:       http://localhost:${PORT}/api/auth
   - Users:      http://localhost:${PORT}/api/users
   - Challenges: http://localhost:${PORT}/api/challenges
   - Progress:   http://localhost:${PORT}/api/progress
   - Gallery:    http://localhost:${PORT}/api/gallery
  `);
});

// Handle unhandled promise rejections
process.on('unhandledRejection', (err: Error) => {
  console.error('Unhandled Promise Rejection:', err);
  // Close server & exit process
  server.close(() => process.exit(1));
});

export default app;