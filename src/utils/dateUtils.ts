export const getDayNumber = (startDate: Date, challengeDate: Date) => {
  const start = new Date(startDate);
  const current = new Date(challengeDate);

  // Normalize both to midnight UTC (prevents timezone drift)
  start.setUTCHours(0, 0, 0, 0);
  current.setUTCHours(0, 0, 0, 0);

  const diffDays = Math.floor(
    (current.getTime() - start.getTime()) / (1000 * 60 * 60 * 24)
  );

  return diffDays + 1;
};