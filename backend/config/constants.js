module.exports = {
  // Indices
  INDICES: {
    NIFTY50: 'NIFTY50',
    BANKNIFTY: 'BANKNIFTY'
  },

  // NSE Symbols
  NSE_SYMBOLS: {
    NIFTY50: '^NSEI',
    BANKNIFTY: '^NSEBANK'
  },

  // Timeframes
  TIMEFRAMES: {
    ONE_MIN: '1m',
    FIVE_MIN: '5m',
    FIFTEEN_MIN: '15m',
    THIRTY_MIN: '30m',
    ONE_HOUR: '1h',
    ONE_DAY: '1d'
  },

  // Signal Thresholds
  SIGNAL_THRESHOLDS: {
    STRONG_BUY: 70,
    BUY: 50,
    HOLD: 50,
    SELL: 50,
    STRONG_SELL: 70
  },

  // Indicator Weights (Baseline - used when regime detection unavailable)
  INDICATOR_WEIGHTS: {
    TREND: 0.28,                    // Reduced from 0.30 to accommodate SMC indicators
    MOMENTUM: 0.25,
    VOLUME: 0.15,
    VOLATILITY: 0.10,
    PATTERNS: 0.07,                 // Reduced from 0.10 to accommodate SMC indicators
    SUPPORT_RESISTANCE: 0.15,       // Increased from 0.10 (now has 6 indicators vs 1)
    OPTIONS: 0.05
  },

  // Dynamic Weight Adjustments (multipliers applied to baseline based on market regime)
  REGIME_WEIGHT_ADJUSTMENTS: {
    STRONG_TRENDING: {
      TREND: 1.25,                  // +25%
      MOMENTUM: 1.12,               // +12%
      VOLUME: 1.20,                 // +20%
      SUPPORT_RESISTANCE: 0.67,     // -33%
      VOLATILITY: 0.60,             // -40%
      PATTERNS: 0.85                // -15%
    },
    WEAK_TRENDING: {
      TREND: 1.10,                  // +10%
      MOMENTUM: 1.05,               // +5%
      SUPPORT_RESISTANCE: 1.10,     // +10%
      VOLUME: 1.00,
      VOLATILITY: 1.00,
      PATTERNS: 1.00
    },
    RANGING: {
      SUPPORT_RESISTANCE: 1.67,     // +67%
      VOLATILITY: 1.50,             // +50%
      MOMENTUM: 1.12,               // +12%
      TREND: 0.71,                  // -29%
      VOLUME: 0.67,                 // -33%
      PATTERNS: 1.14                // +14%
    }
  },

  // Indicator Importance (within categories - used for power-weighted scoring)
  INDICATOR_IMPORTANCE: {
    // Momentum indicators
    'RSI 14': 1.0,
    'RSI 21': 0.9,
    'Stochastic': 0.95,
    'MACD': 1.0,
    'CCI': 0.85,
    'Williams %R': 0.85,
    'ROC': 0.80,
    'Ultimate Oscillator': 0.90,
    'PPO': 0.85,
    'Elder Ray': 0.90,
    'KST': 0.95,
    'RVI': 0.85,
    'Coppock Curve': 0.85,
    'Schaff Trend': 0.90,
    'WaveTrend': 0.90,
    'TRIX': 0.85,
    'TSI': 0.90,

    // Trend indicators
    'EMA 9': 0.85,
    'EMA 20': 1.0,
    'EMA 50': 1.1,
    'SMA 50': 1.0,
    'SMA 200': 1.1,
    'ADX': 1.0,
    'Supertrend': 0.95,
    'Parabolic SAR': 0.85,
    'Aroon': 0.85,
    'DEMA': 0.90,
    'TEMA': 0.90,
    'HMA': 0.95,
    'Mass Index': 0.85,

    // Volume indicators
    'OBV': 1.0,
    'MFI': 0.95,
    'VWAP': 1.0,
    'A/D': 0.90,
    'CMF': 0.90,
    'Klinger': 1.05,
    'PVT': 0.90,
    'NVI': 0.85,
    'PVI': 0.80,

    // Volatility indicators
    'Bollinger Bands': 1.0,
    'ATR': 0.95,
    'Keltner Channel': 0.90,
    'Donchian Channel': 0.85,
    'Ulcer Index': 0.80,
    'NATR': 0.85,
    'BB Bandwidth': 0.85,
    'BB %B': 0.90,

    // Support/Resistance indicators
    'Pivot Points': 1.0,
    'Enhanced SR Zones': 1.05,
    'Demand/Supply Zones': 1.0,
    'Fair Value Gap': 0.95,
    'Change of Character': 0.90,
    'Break of Structure': 0.90,

    // Composite indicators
    'QStick': 0.85,

    // Default importance for unspecified indicators
    default: 0.85
  },

  // Data Retention
  DATA_RETENTION: {
    TICK_DATA_DAYS: 7,
    CHART_DATA_DAYS: 30,
    SIGNAL_DATA_DAYS: 90
  }
};
