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
  const { challengeLevel } = req.body;
  
  if (!challengeLevel || !['Soft', 'Hard', 'Custom'].includes(challengeLevel)) {
    return res.status(400).json({ 
      message: 'Invalid challenge level. Must be one of: Soft, Hard, Custom' 
    });
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
router.get('/:id', authenticateUser, challengeController.getChallenge);

/**
 * @route   PATCH /api/challenges/:id/days
 * @desc    Update challenge duration
 * @access  Private
 */
router.patch('/:id/days', 
  [authenticateUser, validateChallengeDays],
  challengeController.updateDays
);

/**
 * @route   PATCH /api/challenges/:id/difficulty
 * @desc    Update challenge difficulty and optionally custom tasks
 * @access  Private
 */
router.patch('/:id/difficulty',
  [authenticateUser, validateChallengeLevel],
  challengeController.updateDifficulty
);

/**
 * @route   POST /api/challenges/:id/reset
 * @desc    Reset challenge progress (new start date, reset stats)
 * @access  Private
 */
router.post('/:id/reset',
  [authenticateUser],
  (req, res, next) => {
    console.log('\n🔵 ROUTE HIT: POST /api/challenges/:id/reset');
    console.log('🔵 Challenge ID from URL:', req.params.id);
    console.log('🔵 User from auth middleware:', (req as any).user ? 'Present' : 'Missing');
    next();
  },
  challengeController.resetProgress
);

export default router;