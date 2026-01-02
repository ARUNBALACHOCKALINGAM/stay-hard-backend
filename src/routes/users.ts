import { Router } from 'express';
import { userController } from '../controllers/userController';
import { validateUserInput, validateObjectId } from '../middleware/validation';
import { authenticateUser } from '../middleware/auth';

const router = Router();

/**
 * @route   POST /api/users
 * @desc    Create a new user
 * @access  Public
 * @body    { email: string, name: string, photoUrl?: string, googleId?: string }
 */
router.post('/', validateUserInput, userController.createUser);

/**
 * @route   GET /api/users/leaderboard
 * @desc    Get leaderboard (ranks by longest streak, completed challenges, total tasks completed)
 * @access  Public
 */
router.get('/leaderboard', userController.getLeaderboard);

/**
 * @route   GET /api/users/:id
 * @desc    Get user by ID
 * @access  Public
 * @param   id - User's MongoDB ID
 */
router.get('/:id', validateObjectId, userController.getUserById);

/**
 * @route   GET /api/users/email/:email
 * @desc    Get user by email
 * @access  Public
 * @param   email - User's email address
 */
router.get('/email/:email', userController.getUserByEmail);

/**
 * @route   PUT /api/users/:id
 * @desc    Update user
 * @access  Private
 * @param   id - User's MongoDB ID
 * @body    { name?: string, photoUrl?: string, currentChallengeId?: string }
 */
router.put('/:id', authenticateUser, validateObjectId, validateUserInput, userController.updateUser);


/**
 * @route   PUT /api/users/email/:id
 * @desc    Update email of user
 * @access  Private
 * @param   id - User's MongoDB ID
 * @body    {  email?: string}
 */
router.put('/email/:id', authenticateUser, validateObjectId, userController.updateEmail);

/**
 * @route   PUT /api/users/password/:id
 * @desc    Update password of user
 * @access  Private
 * @param   id - User's MongoDB ID
 * @body    {  password?: string}
 */
router.put('/password/:id', authenticateUser, validateObjectId, userController.updatePassword);

/**
 * @route   DELETE /api/users/:id
 * @desc    Delete user
 * @access  Private
 * @param   id - User's MongoDB ID
 */
router.delete('/:id', authenticateUser, validateObjectId, userController.deleteUser);

/**
 * @route   GET /api/users/:id/current-challenge
 * @desc    Get user's current challenge
 * @access  Private
 * @param   id - User's MongoDB ID
 */
router.get('/:id/current-challenge', authenticateUser, validateObjectId, userController.getCurrentChallenge);

/**
 * @route   GET /api/users/:id/achievements
 * @desc    Get user achievements (streaks, completed challenges/tasks, member since)
 * @access  Private
 * @param   id - User's MongoDB ID
 */
router.get('/:id/achievements', authenticateUser, validateObjectId, userController.getAchievements);



export default router;

// Note: To use these routes, in your app.ts:
/*
import userRoutes from './routers/users';
app.use('/api/users', userRoutes);
*/
