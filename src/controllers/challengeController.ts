import { Request, Response } from 'express';
import Challenge, { IChallenge } from '../models/Challenge';
import User from '../models/Users';
import { v4 as uuidv4 } from 'uuid';

/**
 * Challenge Controller - Handles challenge-related operations
 */
export const challengeController = {
  /**
   * Get challenge by ID
   * GET /api/challenges/:id
   */
  getChallenge: async (req: Request, res: Response) => {
    try {
      const challenge = await Challenge.findById(req.params.id);
      
      if (!challenge) {
        return res.status(404).json({ message: 'Challenge not found' });
      }

      res.json(challenge);
    } catch (error) {
      res.status(500).json({ 
        message: 'Error fetching challenge',
        error: error instanceof Error ? error.message : 'Unknown error'
      });
    }
  },

  /**
   * Update challenge duration
   * PATCH /api/challenges/:id/days
   */
  updateDays: async (req: Request, res: Response) => {
    try {
      const { challengeDays } = req.body;
      
      // Validate challenge days
      if (!challengeDays || ![21, 45, 60, 75].includes(challengeDays)) {
        return res.status(400).json({ 
          message: 'Invalid challenge days. Must be one of: 21, 45, 60, 75' 
        });
      }

      const challenge = await Challenge.findById(req.params.id);
      
      if (!challenge) {
        return res.status(404).json({ message: 'Challenge not found' });
      }

      // Only allow updating active challenges
      if (challenge.status !== 'active') {
        return res.status(400).json({ 
          message: 'Can only update duration of active challenges' 
        });
      }

      // Calculate new end date based on current start date and new duration
      const newEndDate = new Date(challenge.startDate);
      newEndDate.setDate(newEndDate.getDate() + challengeDays);

      const updatedChallenge = await Challenge.findByIdAndUpdate(
        req.params.id,
        {
          $set: {
            challengeDays,
            expectedEndDate: newEndDate,
          }
        },
        { new: true, runValidators: true }
      );

      res.json(updatedChallenge);
    } catch (error) {
      res.status(500).json({ 
        message: 'Error updating challenge days',
        error: error instanceof Error ? error.message : 'Unknown error'
      });
    }
  },

  /**
   * Update challenge difficulty
   * PATCH /api/challenges/:id/difficulty
   */
  updateDifficulty: async (req: Request, res: Response) => {
    try {
      const { challengeLevel } = req.body;
      
      // Validate challenge level
      if (!challengeLevel || !['Soft', 'Hard', 'Custom'].includes(challengeLevel)) {
        return res.status(400).json({ 
          message: 'Invalid challenge level. Must be one of: Soft, Hard, Custom' 
        });
      }

      const challenge = await Challenge.findById(req.params.id);
      
      if (!challenge) {
        return res.status(404).json({ message: 'Challenge not found' });
      }

      // Only allow updating active challenges
      if (challenge.status !== 'active') {
        return res.status(400).json({ 
          message: 'Can only update difficulty of active challenges' 
        });
      }

      // If changing to/from Custom, handle customTasks
      if (challengeLevel === 'Custom' && !req.body.customTasks) {
        return res.status(400).json({ 
          message: 'customTasks required when setting level to Custom' 
        });
      }

      const updateData: Partial<IChallenge> = {
        challengeLevel,
      };

      // Update custom tasks if provided
      if (challengeLevel === 'Custom' && req.body.customTasks) {
        updateData.customTasks = req.body.customTasks;
      } else if (challengeLevel !== 'Custom') {
        // Remove custom tasks if moving away from Custom level
        updateData.customTasks = [];
      }

      const updatedChallenge = await Challenge.findByIdAndUpdate(
        req.params.id,
        { $set: updateData },
        { new: true, runValidators: true }
      );

      res.json(updatedChallenge);
    } catch (error) {
      res.status(500).json({ 
        message: 'Error updating challenge difficulty',
        error: error instanceof Error ? error.message : 'Unknown error'
      });
    }
  },

  /**
   * Reset challenge progress
   * POST /api/challenges/:id/reset
   */
  resetProgress: async (req: Request, res: Response) => {
    try {
      const challenge = await Challenge.findById(req.params.id);
      
      if (!challenge) {
        return res.status(404).json({ message: 'Challenge not found' });
      }

      // Only allow resetting active or failed challenges
      if (!['active', 'failed'].includes(challenge.status)) {
        return res.status(400).json({ 
          message: 'Can only reset active or failed challenges' 
        });
      }

      const now = new Date();
      const newEndDate = new Date(now);
      newEndDate.setDate(now.getDate() + challenge.challengeDays);

      const updatedChallenge = await Challenge.findByIdAndUpdate(
        req.params.id,
        {
          $set: {
            startDate: now,
            expectedEndDate: newEndDate,
            status: 'active',
            totalDays: 0,
            completedDays: 0,
            currentStreak: 0,
            avgCompletionRate: 0,
            failedAt: null,
            failureReason: null,
          }
        },
        { new: true, runValidators: true }
      );

      res.json(updatedChallenge);
    } catch (error) {
      res.status(500).json({ 
        message: 'Error resetting challenge',
        error: error instanceof Error ? error.message : 'Unknown error'
      });
    }
  }
,

  /**
   * Start a default challenge for the authenticated user
   * POST /api/challenges/start
   */
  startDefaultChallenge: async (req: Request, res: Response) => {
    try {
      // req.user is attached by authenticateUser middleware
      const authUser: any = (req as any).user;
      if (!authUser || !authUser._id) {
        return res.status(401).json({ message: 'Unauthorized' });
      }

      const userId = authUser._id;

      // If user already has an active challenge, return it (idempotent)
      const existing = await Challenge.findOne({ userId, status: 'active' });
      if (existing) {
        return res.json({ message: 'Active challenge already exists', challenge: existing });
      }

      const now = new Date();
      const challengeDays = 21;
      const expectedEndDate = new Date(now);
      expectedEndDate.setDate(now.getDate() + challengeDays);

      const challenge = await Challenge.create({
        userId,
        challengeId: uuidv4(),
        challengeDays,
        challengeLevel: 'Soft',
        startDate: now,
        expectedEndDate,
        status: 'active',
      } as Partial<IChallenge>);

      // Link to user
      await User.findByIdAndUpdate(userId, { $set: { currentChallengeId: challenge._id } });

      return res.status(201).json({ message: 'Default challenge started', challenge });
    } catch (error) {
      return res.status(500).json({
        message: 'Error starting default challenge',
        error: error instanceof Error ? error.message : 'Unknown error'
      });
    }
  }
};

// Example usage in routes:
/*
import { Router } from 'express';
import { challengeController } from '../controllers/challengeController';
import { validateObjectId } from '../middleware/validation';

const router = Router();

router.get('/:id', validateObjectId, challengeController.getChallenge);
router.patch('/:id/days', validateObjectId, challengeController.updateDays);
router.patch('/:id/difficulty', validateObjectId, challengeController.updateDifficulty);
router.post('/:id/reset', validateObjectId, challengeController.resetProgress);

export default router;
*/
