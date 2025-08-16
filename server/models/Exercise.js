const mongoose = require('mongoose');

const exerciseSchema = new mongoose.Schema({
  canonicalName: {
    type: String,
    required: true,
    unique: true
  },
  category: {
    type: String,
    enum: ['push', 'pull', 'legs', 'core', 'cardio', 'other'],
    default: 'other'
  },
  isBodyweight: {
    type: Boolean,
    default: false
  }
});

module.exports = mongoose.model('Exercise', exerciseSchema);