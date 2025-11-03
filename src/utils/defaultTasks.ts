// src/utils/taskGenerator.ts

import { v4 as uuidv4 } from 'uuid'; // Use a UUID generator for consistent 'id'

const softTasks = [
  'Eat healthy & balanced diet',
  '45-min exercise (5 days/week)',
  'Drink 3 liters of water',
  'Read 10 pages (nonfiction)',
  'Practice mindfulness/reflection'
];
 
const hardTasks = [
  'Follow strict diet (no cheats/alcohol)',
  'Two 45-min workouts (1 outdoor)',
  'Drink 1 gallon of water',
  'Read 10 pages (nonfiction book)',
  'Take daily progress picture',
  'No cheat meals or alcohol'
];

/**
 * Generates tasks array in the required MongoDB format based on the challenge level.
 */
const generateTasksForLevel = (level: 'Soft' | 'Hard' | 'Custom'): any[] => {
  const taskStrings = level === 'Hard' ? hardTasks : softTasks;
  
  return taskStrings.map((text, index) => ({
    id: uuidv4(), // Generate a unique client-side ID
    text: text,
    completed: false,
    completedAt: null,
    // Note: If you had an `order` field, you would include it here: order: index,
  }));
};

export { generateTasksForLevel };