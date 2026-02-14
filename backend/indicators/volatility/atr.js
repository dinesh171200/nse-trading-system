/**
 * ATR - Average True Range
 * Category: Volatility
 * Signals: Volatility measurement and trend strength
 */

const technicalIndicators = require('technicalindicators');

/**
 * Calculate ATR
 * @param {Array} candles - OHLC candles
 * @param {Number} period - Period (default: 14)
 * @returns {Object} ATR data with signal
 */
function calculateATR(candles, period = 14) {
  if (!candles || candles.length < period + 1) {
    throw new Error(`Insufficient data for ATR. Need at least ${period + 1} candles`);
  }

  const high = candles.map(c => c.ohlc.high);
  const low = candles.map(c => c.ohlc.low);
  const close = candles.map(c => c.ohlc.close);

  const atrData = technicalIndicators.ATR.calculate({
    high,
    low,
    close,
    period
  });

  if (!atrData || atrData.length === 0) {
    throw new Error('ATR calculation failed');
  }

  const currentATR = atrData[atrData.length - 1];
  const currentPrice = close[close.length - 1];

  // Calculate ATR as percentage of price
  const atrPercent = (currentATR / currentPrice) * 100;

  // Calculate ATR trend (last 5 periods)
  const recentATR = atrData.slice(-Math.min(5, atrData.length));
  const atrTrend = recentATR[recentATR.length - 1] > recentATR[0] ? 'RISING' : 'FALLING';

  // Volatility classification
  let volatility = 'NORMAL';
  if (atrPercent > 2.5) {
    volatility = 'HIGH';
  } else if (atrPercent < 1.0) {
    volatility = 'LOW';
  }

  // Calculate signal score
  const signalScore = calculateSignalScore(atrPercent, atrTrend, volatility);

  return {
    name: 'ATR',
    category: 'volatility',
    value: currentATR,
    atrPercent,
    volatility,
    trend: atrTrend,
    signal: {
      score: signalScore,
      action: getAction(signalScore),
      strength: getStrength(Math.abs(signalScore)),
      confidence: getConfidence(atrPercent)
    },
    metadata: {
      period
    }
  };
}

function calculateSignalScore(atrPercent, atrTrend, volatility) {
  let score = 0;

  // ATR is primarily an informational indicator, not directional
  // But we can infer some signals

  // Low volatility = potential breakout coming
  if (volatility === 'LOW') {
    score += 15; // Slight bullish bias (breakouts often go up)
  }

  // High volatility with rising ATR = strong trend in progress
  if (volatility === 'HIGH' && atrTrend === 'RISING') {
    score += 10; // Trend acceleration
  }

  // Falling ATR after high volatility = potential reversal
  if (volatility === 'HIGH' && atrTrend === 'FALLING') {
    score -= 10; // Trend exhaustion
  }

  // Normal to rising ATR = healthy trend
  if (volatility === 'NORMAL' && atrTrend === 'RISING') {
    score += 5;
  }

  // ATR is mainly a risk management tool, not a strong directional signal
  // Keep scores modest
  return Math.max(-30, Math.min(30, score));
}

function getAction(score) {
  if (score >= 20) return 'BUY';
  if (score <= -20) return 'SELL';
  return 'HOLD';
}

function getStrength(absScore) {
  if (absScore >= 25) return 'MODERATE';
  return 'WEAK';
}

function getConfidence(atrPercent) {
  // ATR gives us confidence about volatility, not direction
  // Higher ATR = lower confidence in signals
  if (atrPercent > 3) return 40;
  if (atrPercent > 2) return 50;
  if (atrPercent > 1) return 60;
  return 70;
}

module.exports = {
  calculateATR
};
