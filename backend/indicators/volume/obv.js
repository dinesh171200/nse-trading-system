/**
 * OBV - On Balance Volume
 * Category: Volume
 * Signals: Volume-based trend confirmation
 */

const technicalIndicators = require('technicalindicators');

/**
 * Calculate OBV
 * @param {Array} candles - OHLC candles
 * @returns {Object} OBV data with signal
 */
function calculateOBV(candles) {
  if (!candles || candles.length < 10) {
    throw new Error('Insufficient data for OBV. Need at least 10 candles');
  }

  const close = candles.map(c => c.ohlc.close);
  const volume = candles.map(c => c.volume || 1); // Use 1 if volume not available

  const obvData = technicalIndicators.OBV.calculate({
    close,
    volume
  });

  if (!obvData || obvData.length === 0) {
    throw new Error('OBV calculation failed');
  }

  const currentOBV = obvData[obvData.length - 1];
  const previousOBV = obvData.length > 1 ? obvData[obvData.length - 2] : currentOBV;
  const currentPrice = close[close.length - 1];
  const previousPrice = close.length > 1 ? close[close.length - 2] : currentPrice;

  // Calculate OBV trend
  const obvTrend = currentOBV > previousOBV ? 'RISING' : currentOBV < previousOBV ? 'FALLING' : 'FLAT';
  const priceTrend = currentPrice > previousPrice ? 'RISING' : currentPrice < previousPrice ? 'FALLING' : 'FLAT';

  // Detect divergence
  let divergence = 'NONE';
  if (priceTrend === 'RISING' && obvTrend === 'FALLING') {
    divergence = 'BEARISH'; // Price up, volume down = weakness
  } else if (priceTrend === 'FALLING' && obvTrend === 'RISING') {
    divergence = 'BULLISH'; // Price down, volume up = potential reversal
  }

  // Calculate OBV slope (last 5 periods)
  const recentOBV = obvData.slice(-5);
  const obvSlope = (recentOBV[recentOBV.length - 1] - recentOBV[0]) / recentOBV.length;
  const slopeStrength = Math.abs(obvSlope) / Math.abs(recentOBV[0]) * 100;

  // Calculate signal score
  const signalScore = calculateSignalScore(obvTrend, priceTrend, divergence, slopeStrength);

  return {
    name: 'OBV',
    category: 'volume',
    value: currentOBV,
    trend: obvTrend,
    divergence,
    slopeStrength,
    signal: {
      score: signalScore,
      action: getAction(signalScore),
      strength: getStrength(Math.abs(signalScore)),
      confidence: getConfidence(slopeStrength)
    }
  };
}

function calculateSignalScore(obvTrend, priceTrend, divergence, slopeStrength) {
  let score = 0;

  // OBV trend
  if (obvTrend === 'RISING') {
    score += 30; // Volume supporting uptrend
  } else if (obvTrend === 'FALLING') {
    score -= 30; // Volume supporting downtrend
  }

  // Price-OBV confirmation
  if (obvTrend === priceTrend && obvTrend !== 'FLAT') {
    score += obvTrend === 'RISING' ? 20 : -20; // Confirmation
  }

  // Divergence signals
  if (divergence === 'BULLISH') {
    score += 40; // Strong buy signal
  } else if (divergence === 'BEARISH') {
    score -= 40; // Strong sell signal
  }

  // Slope strength
  if (slopeStrength > 2) {
    score += obvTrend === 'RISING' ? 10 : -10;
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

function getConfidence(slopeStrength) {
  return Math.min(85, Math.round(50 + slopeStrength * 5));
}

module.exports = {
  calculateOBV
};
