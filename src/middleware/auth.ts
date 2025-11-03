import { Request, Response, NextFunction } from 'express';
import * as admin from 'firebase-admin';
import User from '../models/Users';
import { createDefaultChallengeForUser } from '../services/challengeService';

// Extend Express Request type to include user
declare global {
  namespace Express {
    interface Request {
      user?: any;
      token?: string;
    }
  }
}

export const authenticateUser = async (
  req: Request,
  res: Response,
  next: NextFunction
) => {
  try {
    const authHeader = req.headers.authorization;
    
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return res.status(401).json({ message: 'No token provided' });
    }

    // Extract the token
    const token = authHeader.split('Bearer ')[1];

    try {
      // Verify the Firebase token
      const decodedToken = await admin.auth().verifyIdToken(token);
      
      // Find or create user in our database
      let user = await User.findOne({ firebaseUid: decodedToken.uid });
      
      if (!user) {
        // Create new user if they don't exist
        user = await User.create({
          firebaseUid: decodedToken.uid,
          email: decodedToken.email,
          name: decodedToken.name || 'Anonymous',
          emailVerified: decodedToken.email_verified || false,
          photoUrl: decodedToken.picture || null,
          lastLogin: new Date()
        });

        // Auto-create default challenge for new users (idempotent)
        try {
          await createDefaultChallengeForUser(user._id);
        } catch (err) {
          console.warn('Failed to create default challenge for user:', err);
        }
      } else {
        // Update last login
        await User.findByIdAndUpdate(user._id, {
          lastLogin: new Date()
        });
      }

      // Attach user and token to request object
      req.user = user;
      req.token = token;
      
      next();
    } catch (error) {
      return res.status(401).json({ message: 'Invalid token' });
    }
  } catch (error) {
    return res.status(500).json({ message: 'Internal server error' });
  }
};

// Optional middleware to ensure Firebase admin is initialized
export const requireAuth = [authenticateUser];