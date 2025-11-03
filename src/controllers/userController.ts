import { Request, Response } from 'express';
import User, { IUser } from '../models/Users';
import Challenge from '../models/Challenge';
import { v4 as uuidv4 } from 'uuid';

/**
 * User Controller - Handles all user-related operations
 */
export const userController = {
  /**
   * Create a new user
   * POST /api/users
   */
  createUser: async (req: Request, res: Response) => {
    try {
      const { email, name, photoUrl, googleId } = req.body;

      // Check if user already exists
      const existingUser = await User.findOne({ email });
      if (existingUser) {
        return res.status(400).json({ message: 'User already exists' });
      }

      // Create new user
      const user = new User({
        email,
        name,
        photoUrl,
        googleId,
      });

      await user.save();

      // Auto-create default challenge (21 days, Soft) and link to user if none exists
      try {
        const existing = await Challenge.findOne({ userId: user._id, status: 'active' });
        if (!existing && !user.currentChallengeId) {
          const now = new Date();
          const challengeDays = 21;
          const expectedEndDate = new Date(now);
          expectedEndDate.setDate(now.getDate() + challengeDays);

          const challenge = await Challenge.create({
            userId: user._id,
            challengeId: uuidv4(),
            challengeDays,
            challengeLevel: 'Soft',
            startDate: now,
            expectedEndDate,
            status: 'active',
          });

          user.currentChallengeId = challenge._id.toString();
          await user.save();
        }
      } catch (innerErr) {
        console.warn('Failed to create default challenge for new user:', innerErr);
        // Proceed without failing user creation
      }

      res.status(201).json(user);
    } catch (error) {
      res.status(500).json({ message: 'Error creating user', error });
    }
  },

  /**
   * Get user by ID
   * GET /api/users/:id
   */
  getUserById: async (req: Request, res: Response) => {
    try {
      const user = await User.findById(req.params.id);
      if (!user) {
        return res.status(404).json({ message: 'User not found' });
      }
      res.json(user);
    } catch (error) {
      res.status(500).json({ message: 'Error fetching user', error });
    }
  },

  /**
   * Get user by email
   * GET /api/users/email/:email
   */
  getUserByEmail: async (req: Request, res: Response) => {
    try {
      const user = await User.findOne({ email: req.params.email });
      if (!user) {
        return res.status(404).json({ message: 'User not found' });
      }
      res.json(user);
    } catch (error) {
      res.status(500).json({ message: 'Error fetching user', error });
    }
  },

  /**
   * Update user
   * PUT /api/users/:id
   */
  updateUser: async (req: Request, res: Response) => {
    try {
      const updates = {
        name: req.body.name,
        photoUrl: req.body.photoUrl,
        currentChallengeId: req.body.currentChallengeId,
      };

      const user = await User.findByIdAndUpdate(
        req.params.id,
        { $set: updates },
        { new: true, runValidators: true }
      );

      if (!user) {
        return res.status(404).json({ message: 'User not found' });
      }

      res.json(user);
    } catch (error) {
      res.status(500).json({ message: 'Error updating user', error });
    }
  },

  /**
   * Delete user
   * DELETE /api/users/:id
   */
  deleteUser: async (req: Request, res: Response) => {
    try {
      const user = await User.findByIdAndDelete(req.params.id);
      if (!user) {
        return res.status(404).json({ message: 'User not found' });
      }
      res.json({ message: 'User deleted successfully' });
    } catch (error) {
      res.status(500).json({ message: 'Error deleting user', error });
    }
  },

  /**
   * Get current challenge for user
   * GET /api/users/:id/current-challenge
   */
  getCurrentChallenge: async (req: Request, res: Response) => {
    try {
      const user = await User.findById(req.params.id);
      if (!user) {
        return res.status(404).json({ message: 'User not found' });
      }

      if (!user.currentChallengeId) {
        return res.status(404).json({ message: 'No active challenge found' });
      }

      res.json({ currentChallengeId: user.currentChallengeId });
    } catch (error) {
      res.status(500).json({ message: 'Error fetching current challenge', error });
    }
  },
};

// Example usage:
/*
// In your routes file (e.g., routes/userRoutes.ts):
import { Router } from 'express';
import { userController } from '../controllers/userController';

const router = Router();

router.post('/', userController.createUser);
router.get('/:id', userController.getUserById);
router.get('/email/:email', userController.getUserByEmail);
router.put('/:id', userController.updateUser);
router.delete('/:id', userController.deleteUser);
router.get('/:id/current-challenge', userController.getCurrentChallenge);

export default router;

// In your app.ts:
import userRoutes from './routes/userRoutes';
app.use('/api/users', userRoutes);
*/