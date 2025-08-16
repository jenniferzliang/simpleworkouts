const mongoose = require('mongoose');

const exerciseAliasSchema = new mongoose.Schema({
  exerciseId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Exercise',
    required: true
  },
  alias: {
    type: String,
    required: true,
    index: true
  }
});

// Compound index for efficient alias lookups
exerciseAliasSchema.index({ alias: 1, exerciseId: 1 });

module.exports = mongoose.model('ExerciseAlias', exerciseAliasSchema);