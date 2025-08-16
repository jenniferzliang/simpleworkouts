const mongoose = require('mongoose');

const workoutSessionSchema = new mongoose.Schema({
  userId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  performedAtLocal: {
    type: Date,
    required: true
  },
  performedDate: {
    type: Date,
    required: true
  },
  sourceText: {
    type: String,
    required: true
  },
  notes: {
    type: String,
    default: null
  },
  device: {
    type: String,
    default: null
  },
  // Cached totals for fast queries
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
  },
  deletedAt: {
    type: Date,
    default: null
  }
}, {
  timestamps: { createdAt: 'createdAt', updatedAt: 'updatedAt' }
});

// Index for efficient queries
workoutSessionSchema.index({ userId: 1, performedDate: -1 });

// Soft delete middleware
workoutSessionSchema.methods.softDelete = function() {
  this.deletedAt = new Date();
  return this.save();
};

// Query middleware to exclude deleted sessions
workoutSessionSchema.pre(/^find/, function() {
  this.where({ deletedAt: null });
});

// Method to recalculate totals from WorkoutExercise records
workoutSessionSchema.methods.recalculateTotals = async function() {
  const WorkoutExercise = mongoose.model('WorkoutExercise');
  const exercises = await WorkoutExercise.find({ sessionId: this._id });
  
  this.totalSets = exercises.reduce((sum, ex) => sum + ex.totalSets, 0);
  this.totalReps = exercises.reduce((sum, ex) => sum + ex.totalReps, 0);
  this.totalTonnage = exercises.reduce((sum, ex) => sum + parseFloat(ex.totalTonnage), 0);
  this.totalBwReps = exercises.reduce((sum, ex) => sum + ex.totalBwReps, 0);
  
  return this.save();
};

module.exports = mongoose.model('WorkoutSession', workoutSessionSchema);