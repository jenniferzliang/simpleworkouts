const mongoose = require('mongoose');

const userSchema = new mongoose.Schema({
  email: {
    type: String,
    required: true,
    unique: true,
    index: true
  },
  name: {
    type: String,
    default: null
  },
  unitPreference: {
    type: String,
    enum: ['kg', 'lb'],
    default: 'lb'
  },
  timezone: {
    type: String,
    default: 'America/New_York'
  },
  deletedAt: {
    type: Date,
    default: null
  }
}, {
  timestamps: { createdAt: 'createdAt', updatedAt: 'updatedAt' }
});

// Soft delete middleware
userSchema.methods.softDelete = function() {
  this.deletedAt = new Date();
  return this.save();
};

// Query middleware to exclude deleted users
userSchema.pre(/^find/, function() {
  this.where({ deletedAt: null });
});

module.exports = mongoose.model('User', userSchema);