const mongoose = require('mongoose');

const tradingSignalSchema = new mongoose.Schema({
  symbol: {
    type: String,
    required: true,
    enum: ['NIFTY50', 'BANKNIFTY', 'DOWJONES']
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
      enum: ['VERY_STRONG', 'STRONG', 'MODERATE', 'WEAK', 'VERY_WEAK']
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
    supportResistanceScore: Number,  // NEW: Support/Resistance category score
    totalScore: Number,
    normalizedScore: Number
  },
  reasoning: [String],
  alerts: [String],
  // ENHANCED: Market regime detection results
  marketRegime: {
    regime: {
      type: String,
      enum: ['STRONG_TRENDING', 'WEAK_TRENDING', 'RANGING', 'UNKNOWN']
    },
    volatility: {
      type: String,
      enum: ['VERY_HIGH', 'HIGH', 'ELEVATED', 'NORMAL', 'LOW', 'VERY_LOW', 'UNKNOWN']
    },
    confidence: Number,
    interpretation: String
  },
  // ENHANCED: Dynamic weights used for this signal
  dynamicWeights: {
    TREND: Number,
    MOMENTUM: Number,
    VOLUME: Number,
    VOLATILITY: Number,
    SUPPORT_RESISTANCE: Number,
    PATTERNS: Number
  },
  metadata: {
    timeframe: String,
    indicatorsUsed: Number,
    processingTime: Number,
    enhancedScoring: Boolean  // NEW: Flag for enhanced scoring system
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
    exitTime: Date,
    targetHit: {
      type: String,
      enum: ['TARGET1', 'TARGET2', 'TARGET3', 'STOPLOSS', 'NONE'],
      default: 'NONE'
    },
    profitLoss: Number,
    profitLossPercent: Number,
    remarks: String
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
