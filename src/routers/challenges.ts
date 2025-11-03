import { Router } from 'express';
import { challengeController } from '../controllers/challengeController';
import { validateObjectId } from '../middleware/validation';
import { authenticateUser } from '../middleware/auth';
import { Request, Response, NextFunction } from 'express';

// Custom validation middleware for challenge updates
const validateChallengeDays = (req: Request, res: Response, next: NextFunction) => {
  const { challengeDays } = req.body;
  
  if (!challengeDays || ![21, 45, 60, 75].includes(Number(challengeDays))) {
    return res.status(400).json({ 
      message: 'Invalid challenge days. Must be one of: 21, 45, 60, 75' 
    });
  }
  
  next();
};

const validateChallengeLevel = (req: Request, res: Response, next: NextFunction) => {
  const { challengeLevel, customTasks } = req.body;
  
  if (!challengeLevel || !['Soft', 'Hard', 'Custom'].includes(challengeLevel)) {
    return res.status(400).json({ 
      message: 'Invalid challenge level. Must be one of: Soft, Hard, Custom' 
    });
  }

  if (challengeLevel === 'Custom') {
    if (!customTasks || !Array.isArray(customTasks) || customTasks.length === 0) {
      return res.status(400).json({ 
        message: 'Custom tasks array required when setting level to Custom' 
      });
    }

    // Validate each custom task
    const invalidTasks = customTasks.filter(
      task => !task.id || !task.text || typeof task.order !== 'number'
    );

    if (invalidTasks.length > 0) {
      return res.status(400).json({ 
        message: 'Invalid custom tasks. Each task must have id, text, and order' 
      });
    }
  }
  
  next();
};

const router = Router();

/**
 * @route   POST /api/challenges/start
 * @desc    Start a default 21-day Soft challenge for the authenticated user
 * @access  Private
 */
router.post('/start', authenticateUser, challengeController.startDefaultChallenge);

/**
 * @route   GET /api/challenges/:id
 * @desc    Get challenge by ID
 * @access  Private
 */
router.get('/:id', authenticateUser, validateObjectId, challengeController.getChallenge);

/**
 * @route   PATCH /api/challenges/:id/days
 * @desc    Update challenge duration
 * @access  Private
 */
router.patch('/:id/days', 
  [authenticateUser, validateObjectId, validateChallengeDays],
  challengeController.updateDays
);

/**
 * @route   PATCH /api/challenges/:id/difficulty
 * @desc    Update challenge difficulty and optionally custom tasks
 * @access  Private
 */
router.patch('/:id/difficulty',
  [authenticateUser, validateObjectId, validateChallengeLevel],
  challengeController.updateDifficulty
);

/**
 * @route   POST /api/challenges/:id/reset
 * @desc    Reset challenge progress (new start date, reset stats)
 * @access  Private
 */
router.post('/:id/reset',
  [authenticateUser, validateObjectId],
  challengeController.resetProgress
);

export default router;