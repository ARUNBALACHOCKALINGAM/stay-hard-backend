import Challenge from '../models/Challenge';
import User from '../models/Users';
import { v4 as uuidv4 } from 'uuid';

/**
 * Create a default challenge (21 days, Soft) for a user if they don't
 * already have an active one. Returns the challenge document.
 */
export async function createDefaultChallengeForUser(userId: any) {
  // Ensure no active challenge exists
  const existing = await Challenge.findOne({ userId, status: 'active' });
  if (existing) return existing;

  // Also avoid creating if user already has currentChallengeId set
  const user = await User.findById(userId);
  if (!user) throw new Error('User not found');
  if (user.currentChallengeId) {
    const c = await Challenge.findById(user.currentChallengeId);
    if (c) return c;
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
  });

  // Link to user
  user.currentChallengeId = challenge.challengeId;
  await user.save();

  return challenge;
}

export default { createDefaultChallengeForUser };
