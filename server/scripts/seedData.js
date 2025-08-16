const mongoose = require('mongoose');
const { User, Exercise, ExerciseAlias } = require('../models');
require('dotenv').config();

// Seed data based on the product spec
const exercises = [
  { canonicalName: 'Bench Press', category: 'push', isBodyweight: false },
  { canonicalName: 'Squat', category: 'legs', isBodyweight: false },
  { canonicalName: 'Deadlift', category: 'pull', isBodyweight: false },
  { canonicalName: 'Overhead Press', category: 'push', isBodyweight: false },
  { canonicalName: 'Barbell Row', category: 'pull', isBodyweight: false },
  { canonicalName: 'Pull-up', category: 'pull', isBodyweight: true },
  { canonicalName: 'Push-up', category: 'push', isBodyweight: true },
  { canonicalName: 'Lat Pulldown', category: 'pull', isBodyweight: false },
  { canonicalName: 'Leg Press', category: 'legs', isBodyweight: false },
  { canonicalName: 'Plank', category: 'core', isBodyweight: true },
  { canonicalName: 'Incline Dumbbell Press', category: 'push', isBodyweight: false },
  { canonicalName: 'Dumbbell Row', category: 'pull', isBodyweight: false },
  { canonicalName: 'Leg Curl', category: 'legs', isBodyweight: false },
  { canonicalName: 'Leg Extension', category: 'legs', isBodyweight: false },
  { canonicalName: 'Bicep Curl', category: 'pull', isBodyweight: false },
  { canonicalName: 'Tricep Extension', category: 'push', isBodyweight: false },
  { canonicalName: 'Shoulder Press', category: 'push', isBodyweight: false },
  { canonicalName: 'Chest Fly', category: 'push', isBodyweight: false },
  { canonicalName: 'Hip Thrust', category: 'legs', isBodyweight: false },
  { canonicalName: 'Romanian Deadlift', category: 'legs', isBodyweight: false }
];

// Exercise aliases based on the spec
const aliases = [
  // Bench Press variations
  { exercise: 'Bench Press', aliases: ['BP', 'bench', 'flat bench', 'barbell bench'] },
  
  // Overhead Press variations  
  { exercise: 'Overhead Press', aliases: ['OHP', 'shoulder press', 'military press', 'standing press'] },
  
  // Pull-up variations
  { exercise: 'Pull-up', aliases: ['pullups', 'chin-up', 'chins', 'pull ups'] },
  
  // Lat Pulldown variations
  { exercise: 'Lat Pulldown', aliases: ['lat pull', 'pulldown', 'lat pull down'] },
  
  // Bicep Curl variations
  { exercise: 'Bicep Curl', aliases: ['curls', 'bicep curls', 'db curl', 'dumbbell curl', 'barbell curl'] },
  
  // Squat variations
  { exercise: 'Squat', aliases: ['back squat', 'squats', 'barbell squat'] },
  
  // Deadlift variations
  { exercise: 'Deadlift', aliases: ['deadlifts', 'DL', 'conventional deadlift'] },
  
  // Row variations
  { exercise: 'Barbell Row', aliases: ['bent over row', 'bb row', 'pendlay row'] },
  { exercise: 'Dumbbell Row', aliases: ['db row', 'one arm row', 'single arm row'] },
  
  // Push-up variations
  { exercise: 'Push-up', aliases: ['pushups', 'push ups', 'press ups'] },
  
  // Incline variations
  { exercise: 'Incline Dumbbell Press', aliases: ['incline db press', 'incline press', 'incline bench'] },
  
  // Leg exercises
  { exercise: 'Leg Press', aliases: ['leg press machine', 'seated leg press'] },
  { exercise: 'Leg Curl', aliases: ['hamstring curl', 'lying leg curl'] },
  { exercise: 'Leg Extension', aliases: ['quad extension', 'knee extension'] },
  
  // Core
  { exercise: 'Plank', aliases: ['planks', 'front plank', 'elbow plank'] },
  
  // Other
  { exercise: 'Hip Thrust', aliases: ['hip thrusts', 'glute bridge', 'barbell hip thrust'] },
  { exercise: 'Romanian Deadlift', aliases: ['RDL', 'stiff leg deadlift', 'rdls'] },
  { exercise: 'Tricep Extension', aliases: ['tricep extensions', 'overhead extension', 'skull crushers'] },
  { exercise: 'Shoulder Press', aliases: ['db shoulder press', 'seated press'] },
  { exercise: 'Chest Fly', aliases: ['db fly', 'pec fly', 'chest flyes'] }
];

async function seedDatabase() {
  try {
    // Connect to MongoDB
    await mongoose.connect(process.env.MONGODB_URI || 'mongodb://localhost:27017/simpleworkouts');
    console.log('Connected to MongoDB');

    // Clear existing data
    await Exercise.deleteMany({});
    await ExerciseAlias.deleteMany({});
    await User.deleteMany({});
    console.log('Cleared existing data');

    // Create default user for MVP
    const defaultUser = new User({
      _id: '000000000000000000000001',
      email: 'demo@simpleworkouts.com',
      name: 'Demo User',
      unitPreference: 'lb',
      timezone: 'America/New_York'
    });
    await defaultUser.save();
    console.log('Created default user');

    // Insert exercises
    const createdExercises = await Exercise.insertMany(exercises);
    console.log(`Created ${createdExercises.length} exercises`);

    // Create exercise name to ID mapping
    const exerciseMap = {};
    createdExercises.forEach(exercise => {
      exerciseMap[exercise.canonicalName] = exercise._id;
    });

    // Insert aliases
    const aliasDocuments = [];
    aliases.forEach(aliasGroup => {
      const exerciseId = exerciseMap[aliasGroup.exercise];
      if (exerciseId) {
        aliasGroup.aliases.forEach(alias => {
          aliasDocuments.push({
            exerciseId,
            alias: alias.toLowerCase()
          });
        });
      }
    });

    const createdAliases = await ExerciseAlias.insertMany(aliasDocuments);
    console.log(`Created ${createdAliases.length} exercise aliases`);

    console.log('Database seeded successfully!');
    console.log('\nAvailable exercises:');
    createdExercises.forEach(ex => {
      console.log(`- ${ex.canonicalName} (${ex.category}${ex.isBodyweight ? ', bodyweight' : ''})`);
    });

  } catch (error) {
    console.error('Error seeding database:', error);
  } finally {
    await mongoose.disconnect();
    console.log('Disconnected from MongoDB');
  }
}

// Run if called directly
if (require.main === module) {
  seedDatabase();
}

module.exports = { seedDatabase, exercises, aliases };