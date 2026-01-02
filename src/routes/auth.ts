import { Router, Request, Response } from 'express';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import { authenticateUser } from '../middleware/auth';
import User from '../models/Users';
import { createDefaultChallengeForUser } from '../services/challengeService';

const router = Router();

const shapeUser = (user: any) => ({
  _id: user._id,
  name: user.name,
  email: user.email,
  photoUrl: user.photoUrl,
  firebaseUid: user.firebaseUid,
  currentChallengeId: user.currentChallengeId,
  emailVerified: user.emailVerified,
  provider: user.provider,
  lastLogin: user.lastLogin,
  createdAt: user.createdAt,
  updatedAt: user.updatedAt,
});

const sendAuthPayload = (res: Response, user: any, message = 'OK', status = 200) => {
  const token = signToken(user._id);
  return res.status(status).json({ message, token, user: shapeUser(user) });
};

// Helper to sign JWTs
const signToken = (userId: any) => {
  const secret: jwt.Secret = (process.env.JWT_SECRET as string) || 'dev_jwt_secret';
  const expiresIn: jwt.SignOptions['expiresIn'] = (process.env.JWT_EXPIRES_IN as unknown as jwt.SignOptions['expiresIn']) || '7d';
  return jwt.sign({ userId }, secret, { expiresIn });
};

/**
 * @route   GET /api/auth/me
 * @desc    Get current user's profile
 * @access  Private
 */
router.get('/me', authenticateUser, async (req, res) => {
  try {
    const user = await User.findById(req.user._id).select('-__v');
    res.json(user);
  } catch (error) {
    res.status(500).json({ message: 'Server error' });
  }
});

/**
 * @route POST /api/auth/signup
 * @desc  Create a local user (email/password)
 * @access Public
 */
router.post('/signup', async (req, res) => {
  try {
    const { email, password, name } = req.body;
    if (!email || !password || !name) {
      return res.status(400).json({ message: 'email, name and password are required' });
    }

    // Check if user already exists
    const existing = await User.findOne({ email: email.toLowerCase() });
    if (existing) return res.status(400).json({ message: 'User already exists' });

    const salt = await bcrypt.genSalt(10);
    const hash = await bcrypt.hash(password, salt);

    const user = await User.create({
      email: email.toLowerCase(),
      name,
      passwordHash: hash,
      provider: 'local',
      emailVerified: false,
      lastLogin: new Date(),
    } as any);

    // Create default challenge and initial progress
    try {
      await createDefaultChallengeForUser(user._id);
    } catch (err) {
      console.warn('Failed to create default challenge for new local user', err);
    }

    return sendAuthPayload(res, user, 'User created', 201);
  } catch (error) {
    console.error('Signup error', error);
    res.status(500).json({ message: 'Server error' });
  }
});

/**
 * @route POST /api/auth/signin
 * @desc  Sign in with email/password
 * @access Public
 */
router.post('/signin', async (req, res) => {
  try {
    const { email, password } = req.body;
    if (!email || !password) return res.status(400).json({ message: 'email and password required' });

    const user = await User.findOne({ email: email.toLowerCase() });
    if (!user || user.provider !== 'local' || !user.passwordHash) {
      return res.status(401).json({ message: 'Invalid credentials' });
    }

    const isMatch = await bcrypt.compare(password, user.passwordHash);
    if (!isMatch) return res.status(401).json({ message: 'Invalid credentials' });

    // Update lastLogin
    await User.findByIdAndUpdate(user._id, { lastLogin: new Date() });

    return sendAuthPayload(res, user, 'Signed in');
  } catch (error) {
    console.error('Signin error', error);
    res.status(500).json({ message: 'Server error' });
  }
});

/**
 * @route   PUT /api/auth/profile
 * @desc    Update user profile
 * @access  Private
 */
router.put('/profile', authenticateUser, async (req, res) => {
  try {
    const { name, photoUrl } = req.body;
    const updateData: { name?: string; photoUrl?: string } = {};

    if (name) updateData.name = name;
    if (photoUrl) updateData.photoUrl = photoUrl;

    const user = await User.findByIdAndUpdate(
      req.user._id,
      { $set: updateData },
      { new: true }
    ).select('-__v');

    res.json(user);
  } catch (error) {
    res.status(500).json({ message: 'Server error' });
  }
});

/**
 * @desc Verify an incoming token (Firebase ID token or backend JWT) and return fresh JWT + user profile
 */
const verifyAndRespond = async (req: Request, res: Response) => {
  try {
    const user = await User.findById(req.user._id).select('-__v');
    if (!user) return res.status(404).json({ message: 'User not found' });
    return sendAuthPayload(res, user, 'Token verified successfully');
  } catch (error) {
    return res.status(500).json({ message: 'Server error' });
  }
};

/**
 * @route   POST /api/auth/verify
 * @route   GET  /api/auth/verify
 * @desc    Verify token and issue backend JWT + user
 * @access  Public (requires Bearer token)
 */
router.post('/verify', authenticateUser, verifyAndRespond);
router.get('/verify', authenticateUser, verifyAndRespond);

export default router;