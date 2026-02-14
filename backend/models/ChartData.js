const mongoose = require('mongoose');

const chartDataSchema = new mongoose.Schema({
  symbol: {
    type: String,
    required: true,
    enum: ['NIFTY50', 'BANKNIFTY']
  },
  timeframe: {
    type: String,
    required: true,
    enum: ['1m', '5m', '15m', '30m', '1h', '1d']
  },
  timestamp: {
    type: Date,
    required: true
  },
  ohlc: {
    open: { type: Number, required: true },
    high: { type: Number, required: true },
    low: { type: Number, required: true },
    close: { type: Number, required: true }
  },
  volume: {
    type: Number,
    default: 0
  },
  metadata: {
    tickCount: Number,
    calculatedFrom: Date,
    calculatedTo: Date
  }
}, {
  timestamps: true
});

// Indexes for performance
chartDataSchema.index({ symbol: 1, timeframe: 1, timestamp: -1 });
chartDataSchema.index({ timestamp: -1 });

module.exports = mongoose.model('ChartData', chartDataSchema);
