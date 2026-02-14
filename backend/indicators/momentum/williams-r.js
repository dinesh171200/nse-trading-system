/**
 * Williams %R
 * Category: Momentum
 * Signals: Overbought/Oversold oscillator
 */

const technicalIndicators = require('technicalindicators');

/**
 * Calculate Williams %R
 * @param {Array} candles - OHLC candles
 * @param {Number} period - Period (default: 14)
 * @returns {Object} Williams %R data with signal
 */
function calculateWilliamsR(candles, period = 14) {
  if (!candles || candles.length < period) {
    throw new Error(`Insufficient data for Williams %R. Need at least ${period} candles`);
  }

  const high = candles.map(c => c.ohlc.high);
  const low = candles.map(c => c.ohlc.low);
  const close = candles.map(c => c.ohlc.close);

  const wprData = technicalIndicators.WilliamsR.calculate({
    high,
    low,
    close,
    period
  });

  if (!wprData || wprData.length === 0) {
    throw new Error('Williams %R calculation failed');
  }

  const currentWR = wprData[wprData.length - 1];
  const previousWR = wprData.length > 1 ? wprData[wprData.length - 2] : currentWR;

  // Williams %R ranges from -100 to 0
  const isOverbought = currentWR > -20; // -20 to 0
  const isOversold = currentWR < -80; // -100 to -80

  const trend = currentWR > previousWR ? 'RISING' : currentWR < previousWR ? 'FALLING' : 'FLAT';

  // Calculate signal score
  const signalScore = calculateSignalScore(currentWR, trend, isOverbought, isOversold);

  return {
    name: 'Williams %R',
    category: 'momentum',
    value: currentWR,
    trend,
    isOverbought,
    isOversold,
    signal: {
      score: signalScore,
      action: getAction(signalScore),
      strength: getStrength(Math.abs(signalScore)),
      confidence: getConfidence(currentWR)
    },
    metadata: { period }
  };
}

function calculateSignalScore(wr, trend, isOverbought, isOversold) {
  let score = 0;

  // Overbought/Oversold zones
  if (isOversold) {
    score += 40; // Strong buy signal
    if (wr < -90) score += 20; // Extremely oversold
  } else if (isOverbought) {
    score -= 40; // Strong sell signal
    if (wr > -10) score -= 20; // Extremely overbought
  }

  // Trend direction
  if (trend === 'RISING') {
    score += 20;
    if (isOversold) score += 10; // Rising from oversold
  } else if (trend === 'FALLING') {
    score -= 20;
    if (isOverbought) score -= 10; // Falling from overbought
  }

  // Middle zone (neutral)
  if (wr > -60 && wr < -40) {
    score *= 0.5; // Reduce signal in neutral zone
  }

  return Math.max(-100, Math.min(100, score));
}

function getAction(score) {
  if (score >= 50) return 'STRONG_BUY';
  if (score >= 20) return 'BUY';
  if (score <= -50) return 'STRONG_SELL';
  if (score <= -20) return 'SELL';
  return 'HOLD';
}

function getStrength(absScore) {
  if (absScore >= 70) return 'VERY_STRONG';
  if (absScore >= 50) return 'STRONG';
  if (absScore >= 30) return 'MODERATE';
  return 'WEAK';
}

function getConfidence(wr) {
  if (wr > -10 || wr < -90) return 85; // Extreme zones
  if (wr > -20 || wr < -80) return 75; // Strong zones
  return 60;
}

module.exports = {
  calculateWilliamsR
};
