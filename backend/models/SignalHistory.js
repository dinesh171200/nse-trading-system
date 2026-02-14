/**
 * Signal History Model
 * Stores all signals generated during replay/live trading
 */

const mongoose = require('mongoose');

const signalHistorySchema = new mongoose.Schema({
  // Symbol info
  symbol: {
    type: String,
    required: true,
    enum: ['NIFTY50', 'BANKNIFTY']
  },

  // Timeframe
  timeframe: {
    type: String,
    required: true,
    enum: ['1m', '5m', '15m', '30m', '1h', '1d']
  },

  // Market time (for replay)
  marketTime: {
    type: Date,
    required: true
  },

  // Signal details
  signal: {
    action: String,
    strength: String,
    confidence: Number,
    confidenceLevel: String
  },

  // Price at signal generation
  price: {
    type: Number,
    required: true
  },

  // Trading levels
  levels: {
    entry: Number,
    stopLoss: Number,
    target1: Number,
    target2: Number,
    target3: Number,
    riskRewardRatio: Number
  },

  // Indicator scores
  scoring: {
    trendScore: Number,
    momentumScore: Number,
    volumeScore: Number,
    volatilityScore: Number,
    patternScore: Number,
    supportResistanceScore: Number,
    totalScore: Number,
    normalizedScore: Number
  },

  // Reasoning
  reasoning: [String],

  // Metadata
  metadata: {
    replaySession: String,
    candlesAnalyzed: Number,
    indicatorsUsed: Number,
    processingTime: Number
  },

  // Created timestamp
  createdAt: {
    type: Date,
    default: Date.now
  }
});

// Indexes for efficient queries
signalHistorySchema.index({ symbol: 1, marketTime: -1 });
signalHistorySchema.index({ createdAt: -1 });
signalHistorySchema.index({ 'signal.action': 1, 'signal.confidence': -1 });

const SignalHistory = mongoose.model('SignalHistory', signalHistorySchema);

module.exports = SignalHistory;
