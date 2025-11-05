import { Router } from 'express';
import { progressController } from '../controllers/progressController';
import { validateObjectId } from '../middleware/validation';
import { authenticateUser } from '../middleware/auth';
import { Request, Response, NextFunction } from 'express';

// Validate date format (YYYY-MM-DD)
const validateDate = (req: Request, res: Response, next: NextFunction) => {
  const { date } = req.query;
  
  if (!date || !/^\d{4}-\d{2}-\d{2}$/.test(date as string)) {
    return res.status(400).json({ 
      message: 'Invalid date format. Use YYYY-MM-DD' 
    });
  }

  // Check if date is valid
  const parsedDate = new Date(date as string);
  if (isNaN(parsedDate.getTime())) {
    return res.status(400).json({ message: 'Invalid date' });
  }

  next();
};

// Validate task status update
const validateTaskUpdate = (req: Request, res: Response, next: NextFunction) => {
  const { completed } = req.body;
  
  if (typeof completed !== 'boolean') {
    return res.status(400).json({ 
      message: 'completed field must be a boolean' 
    });
  }

  next();
};

const router = Router();

/**
 * @route   GET /api/progress
 * @desc    Get tasks for a specific date
 * @access  Private
 * @query   userId - User's MongoDB ID
 * @query   challengeId - Challenge ID
 * @query   date - Date in YYYY-MM-DD format
 */
router.get('/', [authenticateUser, validateDate], progressController.getTasksForDate);

/**
 * @route   GET /api/progress/challenge/:challengeId
 * @desc    Get all progress entries for a given challenge (scoped to authenticated user)
 * @access  Private
 */
router.get('/challenge/:challengeId', [authenticateUser], progressController.getAllProgressForChallenge);

/**
 * @route   PATCH /api/progress/:progressId/tasks/:taskId
 * @desc    Update task completion status
 * @access  Private
 * @param   progressId - DailyProgress document ID
 * @param   taskId - Task ID within the progress document
 * @body    { completed: boolean }
 */
router.patch('/:progressId/tasks/:taskId',
  [authenticateUser, validateTaskUpdate],
  progressController.updateTaskStatus
);

// Validate task text
const validateTaskText = (req: Request, res: Response, next: NextFunction) => {
  const { text } = req.body as { text?: string };
  if (!text || typeof text !== 'string' || text.trim().length === 0) {
    return res.status(400).json({ message: 'text is required' });
  }
  next();
};

/**
 * @route   POST /api/progress/:progressId/tasks
 * @desc    Add a new task (Custom difficulty only)
 * @access  Private
 */
router.post('/:progressId/tasks', [authenticateUser, validateTaskText], progressController.addTask);

/**
 * @route   PATCH /api/progress/:progressId/tasks/:taskId/text
 * @desc    Update task text (Custom difficulty only)
 * @access  Private
 */
router.patch('/:progressId/tasks/:taskId/text', [authenticateUser, validateTaskText], progressController.updateTaskText);

/**
 * @route   DELETE /api/progress/:progressId/tasks/:taskId
 * @desc    Delete a task (Custom difficulty only)
 * @access  Private
 */
router.delete('/:progressId/tasks/:taskId', [authenticateUser], progressController.deleteTask);

export default router;