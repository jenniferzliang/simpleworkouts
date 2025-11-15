// Local exercise database for validation and autocomplete
export interface Exercise {
  name: string;
  category: 'push' | 'pull' | 'legs' | 'core' | 'cardio' | 'other';
  isBodyweight: boolean;
  aliases: string[];
}

// Common exercises database
const EXERCISES: Exercise[] = [
  // Push exercises
  { name: 'Bench Press', category: 'push', isBodyweight: false, aliases: ['bench', 'barbell bench', 'bb bench'] },
  { name: 'Incline Bench Press', category: 'push', isBodyweight: false, aliases: ['incline bench', 'incline press'] },
  { name: 'Decline Bench Press', category: 'push', isBodyweight: false, aliases: ['decline bench', 'decline press'] },
  { name: 'Overhead Press', category: 'push', isBodyweight: false, aliases: ['ohp', 'military press', 'shoulder press', 'press'] },
  { name: 'Dumbbell Press', category: 'push', isBodyweight: false, aliases: ['db press', 'dumbbell bench'] },
  { name: 'Incline DB Press', category: 'push', isBodyweight: false, aliases: ['incline dumbbell press', 'incline db'] },
  { name: 'Push-ups', category: 'push', isBodyweight: true, aliases: ['pushups', 'push ups', 'pushup'] },
  { name: 'Dips', category: 'push', isBodyweight: true, aliases: ['dip', 'chest dips'] },
  { name: 'Tricep Dips', category: 'push', isBodyweight: true, aliases: ['triceps dips'] },
  { name: 'Tricep Extension', category: 'push', isBodyweight: false, aliases: ['skull crushers', 'triceps extension'] },
  { name: 'Lateral Raise', category: 'push', isBodyweight: false, aliases: ['side raise', 'lateral raises'] },
  { name: 'Front Raise', category: 'push', isBodyweight: false, aliases: ['front raises'] },

  // Pull exercises
  { name: 'Deadlift', category: 'pull', isBodyweight: false, aliases: ['dl', 'dead lift'] },
  { name: 'Barbell Row', category: 'pull', isBodyweight: false, aliases: ['bb row', 'bent over row', 'bent row'] },
  { name: 'Dumbbell Row', category: 'pull', isBodyweight: false, aliases: ['db row', 'single arm row'] },
  { name: 'Pull-ups', category: 'pull', isBodyweight: true, aliases: ['pullups', 'pull ups', 'pullup'] },
  { name: 'Chin-ups', category: 'pull', isBodyweight: true, aliases: ['chinups', 'chin ups', 'chinup'] },
  { name: 'Lat Pulldown', category: 'pull', isBodyweight: false, aliases: ['lat pull', 'pulldown'] },
  { name: 'Face Pull', category: 'pull', isBodyweight: false, aliases: ['face pulls'] },
  { name: 'Bicep Curl', category: 'pull', isBodyweight: false, aliases: ['curls', 'biceps curl', 'curl'] },
  { name: 'Hammer Curl', category: 'pull', isBodyweight: false, aliases: ['hammer curls'] },
  { name: 'Cable Row', category: 'pull', isBodyweight: false, aliases: ['seated row', 'cable rows'] },
  { name: 'T-Bar Row', category: 'pull', isBodyweight: false, aliases: ['tbar row', 't bar row'] },

  // Leg exercises
  { name: 'Squat', category: 'legs', isBodyweight: false, aliases: ['back squat', 'barbell squat', 'squats'] },
  { name: 'Front Squat', category: 'legs', isBodyweight: false, aliases: ['front squats'] },
  { name: 'Leg Press', category: 'legs', isBodyweight: false, aliases: ['legpress'] },
  { name: 'Leg Extension', category: 'legs', isBodyweight: false, aliases: ['leg extensions'] },
  { name: 'Leg Curl', category: 'legs', isBodyweight: false, aliases: ['leg curls', 'hamstring curl'] },
  { name: 'Lunges', category: 'legs', isBodyweight: true, aliases: ['lunge', 'walking lunges'] },
  { name: 'Bulgarian Split Squat', category: 'legs', isBodyweight: false, aliases: ['bulgarian squat', 'split squat'] },
  { name: 'Calf Raise', category: 'legs', isBodyweight: false, aliases: ['calf raises', 'calves'] },
  { name: 'Romanian Deadlift', category: 'legs', isBodyweight: false, aliases: ['rdl', 'romanian dl'] },
  { name: 'Hack Squat', category: 'legs', isBodyweight: false, aliases: ['hack squats'] },

  // Core exercises
  { name: 'Plank', category: 'core', isBodyweight: true, aliases: ['planks'] },
  { name: 'Side Plank', category: 'core', isBodyweight: true, aliases: ['side planks'] },
  { name: 'Sit-ups', category: 'core', isBodyweight: true, aliases: ['situps', 'sit ups', 'situp'] },
  { name: 'Crunches', category: 'core', isBodyweight: true, aliases: ['crunch'] },
  { name: 'Russian Twist', category: 'core', isBodyweight: true, aliases: ['russian twists'] },
  { name: 'Leg Raise', category: 'core', isBodyweight: true, aliases: ['leg raises', 'lying leg raise'] },
  { name: 'Hanging Leg Raise', category: 'core', isBodyweight: true, aliases: ['hanging leg raises'] },
  { name: 'Ab Wheel', category: 'core', isBodyweight: true, aliases: ['ab roller', 'wheel rollout'] },

  // Cardio
  { name: 'Running', category: 'cardio', isBodyweight: true, aliases: ['run', 'jog', 'jogging'] },
  { name: 'Cycling', category: 'cardio', isBodyweight: true, aliases: ['bike', 'biking'] },
  { name: 'Rowing', category: 'cardio', isBodyweight: true, aliases: ['row machine', 'erg'] },
  { name: 'Jump Rope', category: 'cardio', isBodyweight: true, aliases: ['jumping rope', 'skipping'] },
  { name: 'Burpees', category: 'cardio', isBodyweight: true, aliases: ['burpee'] }
];

// Create a search index for faster lookups
const exerciseMap = new Map<string, Exercise>();
const aliasMap = new Map<string, Exercise>();

// Initialize maps
EXERCISES.forEach(exercise => {
  exerciseMap.set(exercise.name.toLowerCase(), exercise);
  exercise.aliases.forEach(alias => {
    aliasMap.set(alias.toLowerCase(), exercise);
  });
});

// Get exercise by name (case-insensitive, checks aliases)
export function getExerciseByName(name: string): Exercise | null {
  const normalized = name.toLowerCase().trim();

  // Try exact match first
  const exact = exerciseMap.get(normalized);
  if (exact) return exact;

  // Try alias match
  const byAlias = aliasMap.get(normalized);
  if (byAlias) return byAlias;

  // Try partial match (contains)
  for (const [key, exercise] of exerciseMap) {
    if (key.includes(normalized) || normalized.includes(key)) {
      return exercise;
    }
  }

  return null;
}

// Get all exercises
export function getAllExercises(): Exercise[] {
  return EXERCISES;
}

// Get exercises by category
export function getExercisesByCategory(category: Exercise['category']): Exercise[] {
  return EXERCISES.filter(ex => ex.category === category);
}

// Search exercises (for autocomplete)
export function searchExercises(query: string): Exercise[] {
  const normalized = query.toLowerCase().trim();
  if (!normalized) return [];

  const results: Exercise[] = [];
  const seen = new Set<string>();

  // Exact matches first
  for (const [key, exercise] of exerciseMap) {
    if (key === normalized && !seen.has(exercise.name)) {
      results.push(exercise);
      seen.add(exercise.name);
    }
  }

  // Starts with matches
  for (const [key, exercise] of exerciseMap) {
    if (key.startsWith(normalized) && !seen.has(exercise.name)) {
      results.push(exercise);
      seen.add(exercise.name);
    }
  }

  // Contains matches
  for (const [key, exercise] of exerciseMap) {
    if (key.includes(normalized) && !seen.has(exercise.name)) {
      results.push(exercise);
      seen.add(exercise.name);
    }
  }

  // Alias matches
  for (const [alias, exercise] of aliasMap) {
    if (alias.includes(normalized) && !seen.has(exercise.name)) {
      results.push(exercise);
      seen.add(exercise.name);
    }
  }

  return results.slice(0, 10); // Limit to 10 results
}

// Add custom exercise to local storage
export function addCustomExercise(exercise: Exercise): void {
  const customExercises = getCustomExercises();
  customExercises.push(exercise);
  localStorage.setItem('custom_exercises', JSON.stringify(customExercises));

  // Update maps
  exerciseMap.set(exercise.name.toLowerCase(), exercise);
  exercise.aliases.forEach(alias => {
    aliasMap.set(alias.toLowerCase(), exercise);
  });
}

// Get custom exercises from local storage
export function getCustomExercises(): Exercise[] {
  try {
    const data = localStorage.getItem('custom_exercises');
    return data ? JSON.parse(data) : [];
  } catch (error) {
    console.error('Error reading custom exercises:', error);
    return [];
  }
}

// Initialize custom exercises on load
const customExercises = getCustomExercises();
customExercises.forEach(exercise => {
  exerciseMap.set(exercise.name.toLowerCase(), exercise);
  exercise.aliases.forEach(alias => {
    aliasMap.set(alias.toLowerCase(), exercise);
  });
});
