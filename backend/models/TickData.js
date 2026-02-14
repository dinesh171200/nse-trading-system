const mongoose = require('mongoose');

const tickDataSchema = new mongoose.Schema({
  symbol: {
    type: String,
    required: true,
    enum: ['NIFTY50', 'BANKNIFTY']
  },
  price: {
    type: Number,
    required: true
  },
  timestamp: {
    type: Date,
    required: true,
    default: Date.now
  },
  volume: {
    type: Number,
    default: 0
  },
  metadata: {
    open: Number,
    high: Number,
    low: Number,
    change: Number,
    changePercent: Number
  },
  source: {
    type: String,
    default: 'NSE'
  }
}, {
  timestamps: true
});

// Indexes for performance
tickDataSchema.index({ symbol: 1, timestamp: -1 });
tickDataSchema.index({ timestamp: -1 });

module.exports = mongoose.model('TickData', tickDataSchema);
