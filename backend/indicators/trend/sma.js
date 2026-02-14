/**
 * SMA - Simple Moving Average
 * Category: Trend
 * Signals: Trend direction and support/resistance
 */

const technicalIndicators = require('technicalindicators');

/**
 * Calculate SMA
 * @param {Array} candles - OHLC candles
 * @param {Number} period - Period (default: 20)
 * @returns {Object} SMA data with signal
 */
function calculateSMA(candles, period = 20) {
  if (!candles || candles.length < period) {
    throw new Error(`Insufficient data for SMA. Need at least ${period} candles`);
  }

  const closePrices = candles.map(c => c.ohlc.close);

  const smaValues = technicalIndicators.SMA.calculate({
    values: closePrices,
    period
  });

  if (!smaValues || smaValues.length === 0) {
    throw new Error('SMA calculation failed');
  }

  const currentSMA = smaValues[smaValues.length - 1];
  const previousSMA = smaValues.length > 1 ? smaValues[smaValues.length - 2] : currentSMA;
  const currentPrice = closePrices[closePrices.length - 1];

  // Calculate slope (trend direction)
  const slopePercent = ((currentSMA - previousSMA) / previousSMA) * 100;
  const trend = slopePercent > 0.1 ? 'UPTREND' : slopePercent < -0.1 ? 'DOWNTREND' : 'SIDEWAYS';

  // Price position relative to SMA
  const distancePercent = ((currentPrice - currentSMA) / currentSMA) * 100;
  const position = currentPrice > currentSMA ? 'ABOVE' : currentPrice < currentSMA ? 'BELOW' : 'AT';

  // Calculate signal score
  const signalScore = calculateSignalScore(position, distancePercent, trend, slopePercent);

  return {
    name: `SMA-${period}`,
    category: 'trend',
    value: currentSMA,
    currentPrice,
    position,
    distancePercent,
    slope: { trend, percent: slopePercent },
    signal: {
      score: signalScore,
      action: getAction(signalScore),
      strength: getStrength(Math.abs(signalScore)),
      confidence: getConfidence(Math.abs(distancePercent))
    },
    metadata: { period }
  };
}

function calculateSignalScore(position, distancePercent, trend, slopePercent) {
  let score = 0;

  // Price above/below SMA
  if (position === 'ABOVE') {
    score += 30;
    if (distancePercent > 2) score += 10; // Strong above
  } else if (position === 'BELOW') {
    score -= 30;
    if (distancePercent < -2) score -= 10; // Strong below
  }

  // SMA trend
  if (trend === 'UPTREND') {
    score += 25;
    if (slopePercent > 0.5) score += 15; // Strong uptrend
  } else if (trend === 'DOWNTREND') {
    score -= 25;
    if (slopePercent < -0.5) score -= 15; // Strong downtrend
  }

  // Confluence (price and SMA trending same direction)
  if ((position === 'ABOVE' && trend === 'UPTREND') ||
      (position === 'BELOW' && trend === 'DOWNTREND')) {
    score += position === 'ABOVE' ? 15 : -15;
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

function getConfidence(absDistance) {
  return Math.min(85, Math.round(60 + absDistance * 3));
}

module.exports = {
  calculateSMA
};
