/**
 * ADX - Average Directional Index
 * Category: Trend
 * Signals: Trend strength measurement
 */

const technicalIndicators = require('technicalindicators');

/**
 * Calculate ADX
 * @param {Array} candles - OHLC candles
 * @param {Number} period - Period (default: 14)
 * @returns {Object} ADX data with signal
 */
function calculateADX(candles, period = 14) {
  if (!candles || candles.length < period * 2) {
    throw new Error(`Insufficient data for ADX. Need at least ${period * 2} candles`);
  }

  const high = candles.map(c => c.ohlc.high);
  const low = candles.map(c => c.ohlc.low);
  const close = candles.map(c => c.ohlc.close);

  const adxData = technicalIndicators.ADX.calculate({
    high,
    low,
    close,
    period
  });

  if (!adxData || adxData.length === 0) {
    throw new Error('ADX calculation failed');
  }

  const current = adxData[adxData.length - 1];
  const previous = adxData.length > 1 ? adxData[adxData.length - 2] : current;

  // ADX interpretation
  let trendStrength = 'WEAK';
  if (current.adx > 50) {
    trendStrength = 'VERY_STRONG';
  } else if (current.adx > 25) {
    trendStrength = 'STRONG';
  } else if (current.adx > 20) {
    trendStrength = 'MODERATE';
  }

  // Directional Movement
  const trend = current.pdi > current.mdi ? 'UPTREND' : current.pdi < current.mdi ? 'DOWNTREND' : 'SIDEWAYS';
  const diDifference = Math.abs(current.pdi - current.mdi);

  // ADX trend
  const adxTrend = current.adx > previous.adx ? 'RISING' : 'FALLING';

  // Calculate signal score
  const signalScore = calculateSignalScore(current, trend, trendStrength, diDifference, adxTrend);

  return {
    name: 'ADX',
    category: 'trend',
    adx: current.adx,
    pdi: current.pdi,
    mdi: current.mdi,
    trendStrength,
    trend,
    adxTrend,
    signal: {
      score: signalScore,
      action: getAction(signalScore),
      strength: getStrength(Math.abs(signalScore)),
      confidence: getConfidence(current.adx, diDifference)
    },
    metadata: { period }
  };
}

function calculateSignalScore(current, trend, trendStrength, diDifference, adxTrend) {
  let score = 0;

  // Trend direction from DI
  if (trend === 'UPTREND') {
    score += 30;
    if (diDifference > 20) score += 15; // Strong directional movement
  } else if (trend === 'DOWNTREND') {
    score -= 30;
    if (diDifference > 20) score -= 15;
  }

  // ADX strength amplification
  if (trendStrength === 'VERY_STRONG') {
    score *= 1.3; // Amplify signal in strong trends
  } else if (trendStrength === 'STRONG') {
    score *= 1.15;
  } else if (trendStrength === 'WEAK') {
    score *= 0.5; // Reduce signal in weak trends
  }

  // ADX rising = trend strengthening
  if (adxTrend === 'RISING' && current.adx > 20) {
    score += trend === 'UPTREND' ? 10 : -10;
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

function getConfidence(adx, diDifference) {
  let confidence = 50;

  // Higher ADX = higher confidence in trend
  confidence += Math.min(30, adx * 0.6);

  // Bigger DI difference = higher confidence in direction
  confidence += Math.min(20, diDifference);

  return Math.min(95, Math.round(confidence));
}

module.exports = {
  calculateADX
};
