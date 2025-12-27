import { Router } from 'express';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import { authenticateUser } from '../middleware/auth';
import User from '../models/Users';
import { createDefaultChallengeForUser } from '../services/challengeService';

const router = Router();

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

    const token = signToken(user._id);
    res.status(201).json({ message: 'User created', user: { id: user._id, email: user.email, name: user.name }, token });
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

    const token = signToken(user._id);
    res.json({ message: 'Signed in', token, user: { id: user._id, email: user.email, name: user.name } });
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
 * @route   POST /api/auth/verify
 * @desc    Verify Firebase token and return user data
 * @access  Public
 */
router.post('/verify', authenticateUser, async (req, res) => {
  try {
    // The authenticateUser middleware already verified the token
    // and created/updated the user if necessary
    const user = await User.findById(req.user._id).select('-__v');
    res.json({ 
      user,
      message: 'Token verified successfully' 
    });
  } catch (error) {
    res.status(500).json({ message: 'Server error' });
  }
});

export default router;