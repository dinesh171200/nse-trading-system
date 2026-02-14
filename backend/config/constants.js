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

  // Indicator Weights
  INDICATOR_WEIGHTS: {
    TREND: 0.30,
    MOMENTUM: 0.25,
    VOLUME: 0.15,
    VOLATILITY: 0.10,
    PATTERNS: 0.10,
    SUPPORT_RESISTANCE: 0.10,
    OPTIONS: 0.05
  },

  // Data Retention
  DATA_RETENTION: {
    TICK_DATA_DAYS: 7,
    CHART_DATA_DAYS: 30,
    SIGNAL_DATA_DAYS: 90
  }
};
