const mongoose = require('mongoose');

const tradingSignalSchema = new mongoose.Schema({
  symbol: {
    type: String,
    required: true,
    enum: ['NIFTY50', 'BANKNIFTY']
  },
  timestamp: {
    type: Date,
    required: true,
    default: Date.now
  },
  currentPrice: {
    type: Number,
    required: true
  },
  signal: {
    action: {
      type: String,
      enum: ['BUY', 'SELL', 'HOLD'],
      required: true
    },
    strength: {
      type: String,
      enum: ['STRONG', 'MODERATE', 'WEAK']
    },
    confidence: {
      type: Number,
      min: 0,
      max: 100,
      required: true
    },
    confidenceLevel: {
      type: String,
      enum: ['HIGH', 'MEDIUM', 'LOW']
    }
  },
  levels: {
    entry: Number,
    stopLoss: Number,
    target1: Number,
    target2: Number,
    target3: Number,
    riskRewardRatio: Number
  },
  indicators: {
    type: Object,
    default: {}
  },
  scoring: {
    trendScore: Number,
    momentumScore: Number,
    volumeScore: Number,
    volatilityScore: Number,
    patternScore: Number,
    totalScore: Number,
    normalizedScore: Number
  },
  reasoning: [String],
  alerts: [String],
  metadata: {
    timeframe: String,
    indicatorsUsed: Number,
    processingTime: Number
  },
  status: {
    type: String,
    enum: ['ACTIVE', 'EXPIRED', 'HIT_TARGET', 'HIT_SL'],
    default: 'ACTIVE'
  },
  expiresAt: Date,
  performance: {
    outcome: {
      type: String,
      enum: ['WIN', 'LOSS', 'PENDING'],
      default: 'PENDING'
    },
    entryFilled: Boolean,
    exitPrice: Number,
    profitLoss: Number,
    profitLossPercent: Number
  }
}, {
  timestamps: true
});

// Indexes for performance
tradingSignalSchema.index({ symbol: 1, timestamp: -1 });
tradingSignalSchema.index({ 'signal.confidence': -1, timestamp: -1 });
tradingSignalSchema.index({ status: 1, expiresAt: 1 });
tradingSignalSchema.index({ createdAt: -1 });

module.exports = mongoose.model('TradingSignal', tradingSignalSchema);
