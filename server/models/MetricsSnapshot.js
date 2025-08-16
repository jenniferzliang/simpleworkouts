const mongoose = require('mongoose');

const metricsSnapshotSchema = new mongoose.Schema({
  userId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  bucketStart: {
    type: Date,
    required: true
  },
  granularity: {
    type: String,
    enum: ['day', 'week'],
    default: 'week'
  },
  totalTonnage: {
    type: mongoose.Schema.Types.Decimal128,
    default: 0
  },
  totalSets: {
    type: Number,
    default: 0
  },
  totalReps: {
    type: Number,
    default: 0
  },
  totalBwReps: {
    type: Number,
    default: 0
  }
});

// Compound index for efficient time-series queries
metricsSnapshotSchema.index({ userId: 1, granularity: 1, bucketStart: -1 });

// Ensure uniqueness per user, granularity, and bucket
metricsSnapshotSchema.index({ userId: 1, granularity: 1, bucketStart: 1 }, { unique: true });

module.exports = mongoose.model('MetricsSnapshot', metricsSnapshotSchema);