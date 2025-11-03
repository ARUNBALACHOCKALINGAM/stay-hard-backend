import { Request, Response } from 'express';
import DailyProgress, { ITask } from '../models/DailyProgress';
import Challenge from '../models/Challenge';
import { generateTasksForLevel } from '../utils/defaultTasks';

/**
 * Progress Controller - Handles daily task tracking and updates
 */
export const progressController = {
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
        const dayNumber = Math.floor(
          (challengeDate.getTime() - startDate.getTime()) / (1000 * 60 * 60 * 24)
        ) + 1;

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
