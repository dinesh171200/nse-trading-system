/**
 * VWAP - Volume Weighted Average Price
 * Category: Volume
 * Signals: Intraday price benchmark
 */

const technicalIndicators = require('technicalindicators');

/**
 * Calculate VWAP
 * @param {Array} candles - OHLC candles
 * @returns {Object} VWAP data with signal
 */
function calculateVWAP(candles) {
  if (!candles || candles.length < 2) {
    throw new Error('Insufficient data for VWAP. Need at least 2 candles');
  }

  const high = candles.map(c => c.ohlc.high);
  const low = candles.map(c => c.ohlc.low);
  const close = candles.map(c => c.ohlc.close);
  const volume = candles.map(c => c.volume || 1);

  const vwapData = technicalIndicators.VWAP.calculate({
    high,
    low,
    close,
    volume
  });

  if (!vwapData || vwapData.length === 0) {
    throw new Error('VWAP calculation failed');
  }

  const currentVWAP = vwapData[vwapData.length - 1];
  const currentPrice = close[close.length - 1];

  // Price position relative to VWAP
  const distancePercent = ((currentPrice - currentVWAP) / currentVWAP) * 100;
  const position = currentPrice > currentVWAP ? 'ABOVE' : currentPrice < currentVWAP ? 'BELOW' : 'AT';

  // VWAP deviation bands (simple implementation)
  const stdDev = calculateStdDev(close.slice(-20));
  const upperBand = currentVWAP + stdDev;
  const lowerBand = currentVWAP - stdDev;

  const atUpperBand = currentPrice >= upperBand * 0.995;
  const atLowerBand = currentPrice <= lowerBand * 1.005;

  // Calculate signal score
  const signalScore = calculateSignalScore(position, distancePercent, atUpperBand, atLowerBand);

  return {
    name: 'VWAP',
    category: 'volume',
    value: currentVWAP,
    currentPrice,
    position,
    distancePercent,
    bands: {
      upper: upperBand,
      lower: lowerBand,
      atUpper: atUpperBand,
      atLower: atLowerBand
    },
    signal: {
      score: signalScore,
      action: getAction(signalScore),
      strength: getStrength(Math.abs(signalScore)),
      confidence: getConfidence(Math.abs(distancePercent))
    }
  };
}

function calculateStdDev(values) {
  const mean = values.reduce((sum, val) => sum + val, 0) / values.length;
  const squaredDiffs = values.map(val => Math.pow(val - mean, 2));
  const variance = squaredDiffs.reduce((sum, val) => sum + val, 0) / values.length;
  return Math.sqrt(variance);
}

function calculateSignalScore(position, distancePercent, atUpperBand, atLowerBand) {
  let score = 0;

  // Position relative to VWAP
  if (position === 'ABOVE') {
    score += 25; // Price above VWAP = bullish
    if (distancePercent > 1) score += 10;
  } else if (position === 'BELOW') {
    score -= 25; // Price below VWAP = bearish
    if (distancePercent < -1) score -= 10;
  }

  // Band touches (mean reversion)
  if (atUpperBand) {
    score -= 30; // At upper band = potential reversal down
  } else if (atLowerBand) {
    score += 30; // At lower band = potential reversal up
  }

  // Distance from VWAP
  if (Math.abs(distancePercent) > 2) {
    // Far from VWAP = potential mean reversion
    score -= distancePercent > 0 ? 15 : -15;
  }

  // Close to VWAP = continuation likely
  if (Math.abs(distancePercent) < 0.3) {
    score += position === 'ABOVE' ? 10 : -10;
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
  return Math.min(85, Math.round(60 + absDistance * 5));
}

module.exports = {
  calculateVWAP
};
