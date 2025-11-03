import { Router } from 'express';
import { authenticateUser } from '../middleware/auth';
import User from '../models/Users';

const router = Router();

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