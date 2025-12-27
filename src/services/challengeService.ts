import Challenge from '../models/Challenge';
import User from '../models/Users';
import DailyProgress from '../models/DailyProgress';
import { v4 as uuidv4 } from 'uuid';
import { generateTasksForLevel } from '../utils/defaultTasks';

/**
 * Create a default challenge (21 days, Soft) for a user.
 * Marks any existing active challenges as inactive before creating a new one.
 */
export async function createDefaultChallengeForUser(userId: any) {
  // Mark any existing active challenges as inactive
  await Challenge.updateMany(
    { userId, status: 'active' },
    { $set: { status: 'inactive' } }
  );

  const user = await User.findById(userId);
  if (!user) throw new Error('User not found');

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
  });

  // Link to user
  user.currentChallengeId = challenge.challengeId;
  await user.save();

  // Create initial DailyProgress for day 1 with Soft tasks
  try {
    const today = new Date().toISOString().split('T')[0];
    const tasks = generateTasksForLevel('Soft');
    await DailyProgress.create({
      userId,
      challengeId: challenge.challengeId,
      date: today,
      dayNumber: 1,
      tasks,
      completionRate: 0,
    });
  } catch (err) {
    // don't fail the entire flow if progress creation fails
    console.warn('Failed to create initial DailyProgress for user', userId, err);
  }

  return challenge;
}

export default { createDefaultChallengeForUser };
