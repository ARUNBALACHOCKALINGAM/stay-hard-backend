import Challenge from '../models/Challenge';
import User from '../models/Users';
import DailyProgress from '../models/DailyProgress';
import { v4 as uuidv4 } from 'uuid';
import { generateTasksForLevel } from '../utils/defaultTasks';

import { getDayNumber } from '../utils/dateUtils';

/**
 * Ensures all DailyProgress entries exist for each day from challenge start to today.
 * Creates missing entries with correct dayNumber and tasks.
 */
export async function ensureDailyProgressUpToToday(userId: any, challengeId: string) {
  const challenge = await Challenge.findOne({ userId, challengeId });
  if (!challenge) throw new Error('Challenge not found');

  const startDate = new Date(challenge.startDate);
  const today = new Date();
  today.setUTCHours(0, 0, 0, 0);
  startDate.setUTCHours(0, 0, 0, 0);

  const daysElapsed = getDayNumber(startDate, today);
  const tasksTemplate = generateTasksForLevel(challenge.challengeLevel);

  let currentStreak = 0;
  let longestStreak = 0;
  let completedDays = 0;
  let totalCompletionRate = 0;
  let streakBuffer = 0;

  for (let day = 1; day <= daysElapsed && day <= challenge.challengeDays; day++) {
    const date = new Date(startDate);
    date.setDate(startDate.getDate() + (day - 1));
    const dateStr = date.toISOString().split('T')[0];

    let progress = await DailyProgress.findOne({ userId, challengeId, date: dateStr });
    if (!progress) {
      progress = await DailyProgress.create({
        userId,
        challengeId,
        date: dateStr,
        dayNumber: day,
        tasks: tasksTemplate.map(task => ({ ...task, completed: false, completedAt: null })),
        completionRate: 0,
      });
    }

    // For streak calculation, skip today unless today is complete
    const isToday = (day === daysElapsed);
    if (progress.completionRate === 1) {
      completedDays++;
      streakBuffer++;
      if (streakBuffer > longestStreak) longestStreak = streakBuffer;
    } else {
      // Only reset streak if not today, or if today is incomplete
      if (!isToday || (isToday && progress.completionRate < 1)) {
        streakBuffer = 0;
      }
    }
    totalCompletionRate += progress.completionRate;
  }

  // currentStreak is streakBuffer only if today is complete, else it's the streak up to yesterday
  let currentStreakFinal = streakBuffer;
  const todayProgress = await DailyProgress.findOne({ userId, challengeId, dayNumber: daysElapsed });
  if (todayProgress && todayProgress.completionRate < 1) {
    // If today is not complete, current streak is up to yesterday
    // Find the last streak before today
    currentStreakFinal = 0;
    for (let day = daysElapsed - 1; day >= 1; day--) {
      const prev = await DailyProgress.findOne({ userId, challengeId, dayNumber: day });
      if (prev && prev.completionRate === 1) {
        currentStreakFinal++;
      } else {
        break;
      }
    }
  }

  challenge.completedDays = completedDays;
  challenge.currentStreak = currentStreakFinal;
  challenge.longestStreak = longestStreak;
  challenge.avgCompletionRate = daysElapsed > 0 ? totalCompletionRate / daysElapsed : 0;
  challenge.totalDays = daysElapsed;
  await challenge.save();
}

/**
 * Ensures a user has an active challenge. If none exists, creates a default one.
 * This is idempotent - safe to call multiple times.
 * @returns The active challenge
 */
export async function ensureActiveChallenge(userId: any) {
  // Check for existing active challenge
  const existingActive = await Challenge.findOne({ userId, status: 'active' });
  if (existingActive) {
    return existingActive;
  }

  // No active challenge found - create default one
  return await createDefaultChallengeForUser(userId);
}

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

export default { createDefaultChallengeForUser, ensureActiveChallenge, ensureDailyProgressUpToToday };
