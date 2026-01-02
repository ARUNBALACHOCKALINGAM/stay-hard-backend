import { Request, Response, NextFunction } from 'express';
import * as admin from 'firebase-admin';
import jwt from 'jsonwebtoken';
import bcrypt from 'bcryptjs';
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
    console.log('🔐 Auth middleware called for:', req.method, req.path);
    const authHeader = req.headers.authorization;
    
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      console.log('❌ No token provided or invalid format');
      return res.status(401).json({ message: 'No token provided' });
    }

    // Extract the token
    const token = authHeader.replace(/^Bearer\s+/i, '');
    // Try Firebase verification first
    try {
      console.log('Verifying Firebase token:', token);
      const decodedToken = await admin.auth().verifyIdToken(token);
      console.log('Decoded Firebase token:', decodedToken);

      let user = await User.findOne({ firebaseUid: decodedToken.uid });
      if (!user) {
        user = await User.create({
          firebaseUid: decodedToken.uid,
          email: decodedToken.email,
          name: decodedToken.name || 'Anonymous',
          emailVerified: decodedToken.email_verified || false,
          photoUrl: decodedToken.picture || null,
          lastLogin: new Date(),
          provider: 'google'
        });

        try {
          await createDefaultChallengeForUser(user._id);
        } catch (err) {
          console.warn('Failed to create default challenge for user:', err);
        }
      } else {
        await User.findByIdAndUpdate(user._id, { lastLogin: new Date() });
      }

      req.user = user;
      req.token = token;
      console.log('✅ Firebase auth successful');
      return next();
    } catch (firebaseErr) {
      // If Firebase verification fails, try JWT verification
      try {
        const secret = process.env.JWT_SECRET || 'dev_jwt_secret';
        console.log('Firebase verify failed, trying JWT verify');
        const decoded: any = jwt.verify(token, secret);
        if (!decoded || !decoded.userId) {
          throw new Error('Invalid JWT payload');
        }

        const user = await User.findById(decoded.userId);
        if (!user) return res.status(401).json({ message: 'User not found' });

        // Update last login
        await User.findByIdAndUpdate(user._id, { lastLogin: new Date() });

        req.user = user;
        req.token = token;
        console.log('✅ JWT auth successful');
        return next();
      } catch (jwtErr) {
        console.log('Both Firebase and JWT verification failed');
        return res.status(401).json({ message: 'Invalid token' });
      }
    }
  } catch (error) {
    return res.status(500).json({ message: 'Internal server error' });
  }
};

// Optional middleware to ensure Firebase admin is initialized
export const requireAuth = [authenticateUser];