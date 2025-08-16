const mongoose = require('mongoose');

// Set object schema for individual sets
const setSchema = new mongoose.Schema({
  setNumber: {
    type: Number,
    required: true
  },
  reps: {
    type: Number,
    required: true
  },
  weight: {
    type: mongoose.Schema.Types.Decimal128,
    default: null
  },
  unit: {
    type: String,
    enum: ['kg', 'lb', null],
    default: null
  },
  isBodyweight: {
    type: Boolean,
    default: false
  }
}, { _id: false });

const workoutExerciseSchema = new mongoose.Schema({
  sessionId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'WorkoutSession',
    required: true
  },
  exerciseId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Exercise',
    required: true
  },
  sequence: {
    type: Number,
    required: true
  },
  sets: [setSchema],
  // Cached totals for this exercise in the session
  totalSets: {
    type: Number,
    default: 0
  },
  totalReps: {
    type: Number,
    default: 0
  },
  totalTonnage: {
    type: mongoose.Schema.Types.Decimal128,
    default: 0
  },
  totalBwReps: {
    type: Number,
    default: 0
  }
});

// Compound index for efficient queries
workoutExerciseSchema.index({ sessionId: 1, sequence: 1 });

// Ensure sequence uniqueness per session
workoutExerciseSchema.index({ sessionId: 1, sequence: 1 }, { unique: true });

// Method to recalculate totals from sets array
workoutExerciseSchema.methods.recalculateTotals = function() {
  this.totalSets = this.sets.length;
  this.totalReps = this.sets.reduce((sum, set) => sum + set.reps, 0);
  
  // Calculate tonnage (excluding bodyweight sets)
  this.totalTonnage = this.sets
    .filter(set => !set.isBodyweight && set.weight)
    .reduce((sum, set) => sum + (parseFloat(set.weight) * set.reps), 0);
  
  // Calculate bodyweight reps
  this.totalBwReps = this.sets
    .filter(set => set.isBodyweight)
    .reduce((sum, set) => sum + set.reps, 0);
    
  return this;
};

// Pre-save middleware to recalculate totals
workoutExerciseSchema.pre('save', function(next) {
  this.recalculateTotals();
  next();
});

module.exports = mongoose.model('WorkoutExercise', workoutExerciseSchema);