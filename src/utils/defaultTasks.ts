import { v4 as uuidv4 } from 'uuid';

export const HARD_TASKS = [
  'Follow strict diet (no cheats/alcohol)',
  'Two 45-min workouts (1 outdoor)',
  'Drink 1 gallon of water',
  'Read 10 pages (nonfiction book)',
  'Take daily progress picture',
  'No cheat meals or alcohol',
];

export const SOFT_TASKS = [
  'Eat healthy & balanced diet',
  '45-min exercise (5 days/week)',
  'Drink 3 liters of water',
  'Read 10 pages (nonfiction)',
  'Practice mindfulness/reflection',
];

export function buildCustomTasksFromStrings(tasks: string[]) {
  return tasks.map((text, idx) => ({
    id: uuidv4(),
    text,
    order: idx + 1,
  }));
}

export function defaultCustomTasksForLevel(level: string) {
  if (level === 'Hard') return buildCustomTasksFromStrings(HARD_TASKS);
  if (level === 'Soft') return buildCustomTasksFromStrings(SOFT_TASKS);
  return [];
}

export default defaultCustomTasksForLevel;
