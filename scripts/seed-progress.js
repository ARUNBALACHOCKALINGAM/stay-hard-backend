// Script to seed 10 days of mock progress data
// Run with: node scripts/seed-progress.js

const { MongoClient, ObjectId } = require('mongodb');
require('dotenv').config();

const MONGODB_URI = process.env.MONGODB_URI || 'mongodb://localhost:27017/stay-hard';
const CHALLENGE_ID = '42fab2f2-5129-455e-9d0f-5ea3613965ce';
const USER_ID = new ObjectId('690ba6cf9eb254a9ab9a020c');

// Soft level tasks (matching your challenge)
const SOFT_TASKS = [
  'Eat healthy & balanced diet',
  '45-min exercise (5 days/week)',
  'Drink 3 liters of water',
  'Read 10 pages (nonfiction)',
  'Practice mindfulness/reflection'
];

// Generate random completion pattern for realism
function generateTasks(dayNumber) {
  // Higher completion rate for recent days
  const completionProbability = Math.min(0.6 + (dayNumber * 0.04), 0.95);
  
  return SOFT_TASKS.map((text, index) => {
    const completed = Math.random() < completionProbability;
    return {
      id: `task-${dayNumber}-${index}`,
      text: text,
      completed: completed,
      completedAt: completed ? new Date(Date.now() - (10 - dayNumber) * 24 * 60 * 60 * 1000) : null
    };
  });
}

// Generate progress entries for 10 days
function generateProgressData() {
  const startDate = new Date();
  startDate.setDate(startDate.getDate() - 9); // Start 9 days ago
  
  const progressData = [];
  
  for (let day = 1; day <= 10; day++) {
    const currentDate = new Date(startDate);
    currentDate.setDate(startDate.getDate() + (day - 1));
    const dateStr = currentDate.toISOString().split('T')[0]; // YYYY-MM-DD
    
    const tasks = generateTasks(day);
    const completedCount = tasks.filter(t => t.completed).length;
    const completionRate = completedCount / tasks.length;
    
    progressData.push({
      userId: USER_ID,
      challengeId: CHALLENGE_ID,
      date: dateStr,
      dayNumber: day,
      tasks: tasks,
      completionRate: completionRate,
      createdAt: currentDate,
      updatedAt: currentDate
    });
  }
  
  return progressData;
}

async function seedData() {
  const client = new MongoClient(MONGODB_URI);
  
  try {
    await client.connect();
    console.log('✅ Connected to MongoDB');
    
    const db = client.db();
    const collection = db.collection('dailyprogresses');
    
    // Delete existing progress for this challenge (optional)
    const deleteResult = await collection.deleteMany({
      challengeId: CHALLENGE_ID,
      userId: USER_ID
    });
    console.log(`🗑️  Deleted ${deleteResult.deletedCount} existing progress entries`);
    
    // Insert new progress data
    const progressData = generateProgressData();
    const result = await collection.insertMany(progressData);
    
    console.log(`✨ Inserted ${result.insertedCount} progress entries`);
    console.log('\n📊 Summary:');
    progressData.forEach((p, i) => {
      const completedTasks = p.tasks.filter(t => t.completed).length;
      console.log(`  Day ${p.dayNumber} (${p.date}): ${completedTasks}/${p.tasks.length} tasks (${Math.round(p.completionRate * 100)}%)`);
    });
    
  } catch (error) {
    console.error('❌ Error seeding data:', error);
  } finally {
    await client.close();
    console.log('\n👋 Connection closed');
  }
}

seedData();
