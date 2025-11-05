import { Request, Response } from 'express';
import DailyProgress, { ITask } from '../models/DailyProgress';
import Challenge from '../models/Challenge';
import { generateTasksForLevel } from '../utils/defaultTasks';
import { getDayNumber } from '../utils/dateUtils';
import { v4 as uuidv4 } from 'uuid';

/**
 * Progress Controller - Handles daily task tracking and updates
 */
export const progressController = {
  /**
   * Get all progress entries for a given challenge for the authenticated user
   * GET /api/progress/challenge/:challengeId
   */
  getAllProgressForChallenge: async (req: Request, res: Response) => {
    try {
      const { challengeId } = req.params;
      if (!challengeId) {
        return res.status(400).json({ message: 'challengeId is required' });
      }

      // user comes from authenticateUser middleware
      const authUser: any = (req as any).user;
      if (!authUser?._id) {
        return res.status(401).json({ message: 'Unauthorized' });
      }

      // Ensure the challenge belongs to the user (any status)
      const challenge = await Challenge.findOne({
        challengeId,
        userId: authUser._id,
      });

      if (!challenge) {
        return res.status(404).json({ message: 'Challenge not found for this user' });
      }

      const items = await DailyProgress.find({
        challengeId,
        userId: authUser._id,
      }).sort({ date: 1 });

      return res.json({ items, count: items.length });
    } catch (error) {
      res.status(500).json({
        message: 'Error fetching progress for challenge',
        error: error instanceof Error ? error.message : 'Unknown error',
      });
    }
  },
  /**
   * Get tasks for a specific date
   * GET /api/progress
   * Query params: userId, challengeId, date (YYYY-MM-DD)
   */
  getTasksForDate: async (req: Request, res: Response) => {
    try {
      const { userId, challengeId, date } = req.query;

      if (!userId || !challengeId || !date) {
        return res.status(400).json({ 
          message: 'Missing required parameters: userId, challengeId, date' 
        });
      }

      // Find or create progress entry for the date
      let progress = await DailyProgress.findOne({
        userId,
        challengeId,
        date
      });

      if (!progress) {
        // Get the challenge to determine the day number and tasks
        const challenge = await Challenge.findOne({ 
          challengeId,
          userId,
          status: 'active'
        });

        if (!challenge) {
          return res.status(404).json({ 
            message: 'Active challenge not found' 
          });
        }

        // Calculate day number based on start date
        const challengeDate = new Date(date as string);
        const startDate = new Date(challenge.startDate);
        const dayNumber = getDayNumber(startDate, challengeDate);

        console.log('Calculated day number:', dayNumber);

        // Initialize tasks based on challenge level
        let tasks: ITask[] = [];
        
    
          
       tasks = generateTasksForLevel(challenge.challengeLevel);
        

        // Create new progress entry
        progress = await DailyProgress.create({
          userId,
          challengeId,
          date,
          dayNumber,
          tasks,
          completionRate: 0
        });
      }

      res.json(progress);
    } catch (error) {
      res.status(500).json({ 
        message: 'Error fetching tasks',
        error: error instanceof Error ? error.message : 'Unknown error'
      });
    }
  },

  /**
   * Update task completion status
   * PATCH /api/progress/:progressId/tasks/:taskId
   */
  updateTaskStatus: async (req: Request, res: Response) => {
    try {
      const { progressId, taskId } = req.params;
      const { completed } = req.body;

      if (typeof completed !== 'boolean') {
        return res.status(400).json({ 
          message: 'completed status must be a boolean' 
        });
      }

      const progress = await DailyProgress.findById(progressId);

      if (!progress) {
        return res.status(404).json({ message: 'Progress entry not found' });
      }

      // Find the task
      const taskIndex = progress.tasks.findIndex(t => t.id === taskId);
      if (taskIndex === -1) {
        return res.status(404).json({ message: 'Task not found' });
      }

      // Update task status
      progress.tasks[taskIndex].completed = completed;
      progress.tasks[taskIndex].completedAt = completed ? new Date() : undefined;

      // Recalculate completion rate
      progress.completionRate = progress.calculateCompletionRate();

      // If all tasks are completed, update challenge stats
      if (progress.completionRate === 1) {
        const challenge = await Challenge.findOne({ 
          challengeId: progress.challengeId,
          userId: progress.userId
        });

        if (challenge) {
          challenge.completedDays += 1;
          challenge.currentStreak += 1;
          challenge.longestStreak = Math.max(
            challenge.longestStreak,
            challenge.currentStreak
          );
          
          // Update average completion rate
          const totalDays = challenge.completedDays;
          challenge.avgCompletionRate = (
            (challenge.avgCompletionRate * (totalDays - 1) + 1) / totalDays
          );

          await challenge.save();
        }
      }

      await progress.save();
      res.json(progress);
    } catch (error) {
      res.status(500).json({ 
        message: 'Error updating task',
        error: error instanceof Error ? error.message : 'Unknown error'
      });
    }
  },

  /**
   * Add a new task (Custom difficulty only)
   * POST /api/progress/:progressId/tasks
   * body: { text: string }
   */
  addTask: async (req: Request, res: Response) => {
    try {
      const { progressId } = req.params;
      const { text } = req.body as { text?: string };

      if (!text || typeof text !== 'string' || text.trim().length === 0) {
        return res.status(400).json({ message: 'text is required' });
      }

      const progress = await DailyProgress.findById(progressId);
      if (!progress) {
        return res.status(404).json({ message: 'Progress entry not found' });
      }

      const challenge = await Challenge.findOne({
        challengeId: progress.challengeId,
        userId: progress.userId,
        status: 'active'
      });

      if (!challenge) {
        return res.status(404).json({ message: 'Active challenge not found' });
      }

      if (challenge.challengeLevel !== 'Custom') {
        return res.status(400).json({ message: 'Tasks can only be modified in Custom difficulty' });
      }

      const newTask: ITask = {
        id: uuidv4(),
        text: text.trim(),
        completed: false,
        completedAt: undefined,
      };

      progress.tasks.push(newTask);
      progress.completionRate = progress.calculateCompletionRate();
      await progress.save();

      res.status(201).json(progress);
    } catch (error) {
      res.status(500).json({
        message: 'Error adding task',
        error: error instanceof Error ? error.message : 'Unknown error'
      });
    }
  },

  /**
   * Update task text (Custom difficulty only)
   * PATCH /api/progress/:progressId/tasks/:taskId/text
   * body: { text: string }
   */
  updateTaskText: async (req: Request, res: Response) => {
    try {
      const { progressId, taskId } = req.params;
      const { text } = req.body as { text?: string };

      if (!text || typeof text !== 'string' || text.trim().length === 0) {
        return res.status(400).json({ message: 'text is required' });
      }

      const progress = await DailyProgress.findById(progressId);
      if (!progress) {
        return res.status(404).json({ message: 'Progress entry not found' });
      }

      const challenge = await Challenge.findOne({
        challengeId: progress.challengeId,
        userId: progress.userId,
        status: 'active'
      });

      if (!challenge) {
        return res.status(404).json({ message: 'Active challenge not found' });
      }

      if (challenge.challengeLevel !== 'Custom') {
        return res.status(400).json({ message: 'Tasks can only be modified in Custom difficulty' });
      }

      const idx = progress.tasks.findIndex(t => t.id === taskId);
      if (idx === -1) {
        return res.status(404).json({ message: 'Task not found' });
      }

      progress.tasks[idx].text = text.trim();
      // completion stays the same; recalc not strictly needed but safe
      progress.completionRate = progress.calculateCompletionRate();
      await progress.save();

      res.json(progress);
    } catch (error) {
      res.status(500).json({
        message: 'Error updating task text',
        error: error instanceof Error ? error.message : 'Unknown error'
      });
    }
  },

  /**
   * Delete a task (Custom difficulty only)
   * DELETE /api/progress/:progressId/tasks/:taskId
   */
  deleteTask: async (req: Request, res: Response) => {
    try {
      const { progressId, taskId } = req.params;

      const progress = await DailyProgress.findById(progressId);
      if (!progress) {
        return res.status(404).json({ message: 'Progress entry not found' });
      }

      const challenge = await Challenge.findOne({
        challengeId: progress.challengeId,
        userId: progress.userId,
        status: 'active'
      });

      if (!challenge) {
        return res.status(404).json({ message: 'Active challenge not found' });
      }

      if (challenge.challengeLevel !== 'Custom') {
        return res.status(400).json({ message: 'Tasks can only be modified in Custom difficulty' });
      }

      const before = progress.tasks.length;
      progress.tasks = progress.tasks.filter(t => t.id !== taskId);
      if (progress.tasks.length === before) {
        return res.status(404).json({ message: 'Task not found' });
      }

      progress.completionRate = progress.calculateCompletionRate();
      await progress.save();

      res.json(progress);
    } catch (error) {
      res.status(500).json({
        message: 'Error deleting task',
        error: error instanceof Error ? error.message : 'Unknown error'
      });
    }
  }
};

// Example usage in routes:
/*
import { Router } from 'express';
import { progressController } from '../controllers/progressController';
import { validateObjectId } from '../middleware/validation';

const router = Router();

// Get tasks for a date
router.get('/', progressController.getTasksForDate);

// Update task status
router.patch('/:progressId/tasks/:taskId', validateObjectId, progressController.updateTaskStatus);

export default router;
*/
