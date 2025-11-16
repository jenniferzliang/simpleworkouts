const { WorkoutParser } = require('./src/utils/workoutParser.ts');

const parser = new WorkoutParser();
const result = parser.parseWorkoutText('overhead press 7,8x25, 6x30', 'lb');

console.log('Number of sets:', result.exercises[0].sets.length);
result.exercises[0].sets.forEach(set => {
  console.log(`Set ${set.setNumber}: ${set.reps} reps @ ${set.weight} ${set.unit}`);
});
