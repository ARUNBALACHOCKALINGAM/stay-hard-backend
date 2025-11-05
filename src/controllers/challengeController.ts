import { Request, Response } from 'express';
import Challenge, { IChallenge } from '../models/Challenge';
import User from '../models/Users';
import DailyProgress from '../models/DailyProgress';
import { v4 as uuidv4 } from 'uuid';
import { generateTasksForLevel } from '../utils/defaultTasks';

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
      const challenge = await Challenge.findOne({"challengeId": req.params.id});
      
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
      console.log('\n\n========================================');
      console.log('=== UPDATE DAYS CALLED ===');
      console.log('========================================');
      console.log('req.params.id:', req.params.id);
      console.log('req.body:', req.body);
      console.log('========================================\n');
      
      const { challengeDays } = req.body;
      
      // Validate challenge days
      if (!challengeDays || ![21, 45, 60, 75].includes(challengeDays)) {
        return res.status(400).json({ 
          message: 'Invalid challenge days. Must be one of: 21, 45, 60, 75' 
        });
      }

      const challenge = await Challenge.findOne({"challengeId": req.params.id});
      
      if (!challenge) {
        return res.status(404).json({ message: 'Challenge not found' });
      }

      // Only allow updating active challenges
      if (challenge.status !== 'active') {
        return res.status(400).json({ 
          message: 'Can only update duration of active challenges' 
        });
      }

      // 4. Calculate new end date based on current start date and new duration
      const newEndDate = new Date(challenge.startDate);
      newEndDate.setDate(newEndDate.getDate() + challengeDays);

      const updatedChallenge = await Challenge.findOneAndUpdate(
        {"challengeId":req.params.id},
        {
          $set: {
            challengeDays,
            expectedEndDate: newEndDate,
          }
        },
        { new: true, runValidators: true }
      );

      res.json({
        message: 'Challenge duration updated',
        challenge: updatedChallenge
      });
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
      console.log('=== UPDATE DIFFICULTY CALLED ===');
      console.log('req.params.id:', req.params.id);
      console.log('req.body:', req.body);
      
      const { challengeLevel, customTasks } = req.body;
      
      // Validate challenge level
      if (!challengeLevel || !['Soft', 'Hard', 'Custom'].includes(challengeLevel)) {
        return res.status(400).json({ 
          message: 'Invalid challenge level. Must be one of: Soft, Hard, Custom' 
        });
      }

      const challenge = await Challenge.findOne({"challengeId": req.params.id});
      
      if (!challenge) {
        return res.status(404).json({ message: 'Challenge not found' });
      }

      // Only allow updating active challenges
      if (challenge.status !== 'active') {
        return res.status(400).json({ 
          message: 'Can only update difficulty of active challenges' 
        });
      }

      // If changing to/from Custom, validate customTasks
      if (challengeLevel === 'Custom' && !customTasks) {
        return res.status(400).json({ 
          message: 'customTasks required when setting level to Custom' 
        });
      }

      // 1. Delete all existing progress entries for this challenge
      console.log(`[updateDifficulty] Attempting to delete progress for challengeId: ${challenge.challengeId}`);
      const existingDiffProgress = await DailyProgress.find({ challengeId: challenge.challengeId });
      console.log(`[updateDifficulty] Found ${existingDiffProgress.length} existing progress entries`);
      
      const deleteDiffResult = await DailyProgress.deleteMany({ challengeId: challenge.challengeId });
      console.log(`[updateDifficulty] Deleted ${deleteDiffResult.deletedCount} progress entries`);

      // 2. Generate tasks for the new difficulty level
      const todayTasks = challengeLevel === 'Custom' && customTasks
        ? customTasks.map((task: any) => ({
            id: task.id || uuidv4(),
            text: task.text,
            completed: false,
            completedAt: null
          }))
        : generateTasksForLevel(challengeLevel);

      // 3. Create a new progress entry for today with the new tasks
      const today = new Date().toISOString().split('T')[0]; // YYYY-MM-DD format
      await DailyProgress.create({
        userId: challenge.userId,
        challengeId: challenge.challengeId,
        date: today,
        dayNumber: 1,
        tasks: todayTasks,
        completionRate: 0
      });

      // 4. Update the challenge with new difficulty level
      const updateData: Partial<IChallenge> = {
        challengeLevel,
      };

      const updatedChallenge = await Challenge.findOneAndUpdate(
        { "challengeId": req.params.id },
        { $set: updateData },
        { new: true, runValidators: true }
      );

      res.json({
        message: 'Challenge difficulty updated and progress reset',
        challenge: updatedChallenge,
        debug: {
          deletedCount: deleteDiffResult.deletedCount,
          foundBeforeDeletion: existingDiffProgress.length,
          timestamp: new Date().toISOString()
        }
      });
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
      console.log('=== RESET PROGRESS CALLED ===');
      console.log('req.params.id:', req.params.id);
      
      const challenge = await Challenge.findOne({"challengeId": req.params.id});
      
      console.log('Challenge found:', challenge ? 'YES' : 'NO');
      if (challenge) {
        console.log('Challenge details:', { 
          _id: challenge._id, 
          challengeId: challenge.challengeId, 
          userId: challenge.userId 
        });
      }
      
      if (!challenge) {
        return res.status(404).json({ message: 'Challenge not found' });
      }

      // Only allow resetting active or failed challenges
      if (!['active', 'failed'].includes(challenge.status)) {
        return res.status(400).json({ 
          message: 'Can only reset active or failed challenges' 
        });
      }

      // 1. Delete all existing progress entries for this challenge
      console.log(`Attempting to delete progress for challengeId: ${req.params.id}`);
      console.log(`Challenge object challengeId: ${challenge.challengeId}`);
      
      // Check what exists before deletion
      const existingProgress = await DailyProgress.find({ challengeId: challenge.challengeId });
      console.log(`Found ${existingProgress.length} existing progress entries:`, existingProgress.map(p => ({ id: p._id, challengeId: p.challengeId, date: p.date })));
      
      const response = await DailyProgress.deleteMany({ challengeId: challenge.challengeId });
      console.log(`Deleted ${response.deletedCount} progress entries for challenge ${challenge.challengeId}`);
      // 2. Generate Soft level tasks for the reset
      const softTasks = generateTasksForLevel('Soft');

      // 3. Create a new progress entry for today with Soft tasks
      const today = new Date().toISOString().split('T')[0]; // YYYY-MM-DD format
      await DailyProgress.create({
        userId: challenge.userId,
        challengeId: challenge.challengeId,
        date: today,
        dayNumber: 1,
        tasks: softTasks,
        completionRate: 0
      });

      // 4. Reset the challenge to Soft level with current date
      const now = new Date();
      const challengeDays = 21; // Reset to 21 days (Soft)
      const newEndDate = new Date(now);
      newEndDate.setDate(now.getDate() + challengeDays);

      const updatedChallenge = await Challenge.findOneAndUpdate(
        {"challengeId": req.params.id},
        {
          $set: {
            challengeDays: challengeDays,
            challengeLevel: 'Soft',
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

      res.json({
        message: 'Challenge reset to Soft level with current date',
        challenge: updatedChallenge,
        debug: {
          deletedCount: response.deletedCount,
          foundBeforeDeletion: existingProgress.length,
          timestamp: new Date().toISOString()
        }
      });
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
      await User.findByIdAndUpdate(userId, { $set: { currentChallengeId: challenge.challengeId } });

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
