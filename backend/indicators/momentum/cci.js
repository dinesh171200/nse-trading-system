/**
 * CCI - Commodity Channel Index
 * Category: Momentum
 * Signals: Overbought/Oversold and trend strength
 */

const technicalIndicators = require('technicalindicators');

/**
 * Calculate CCI
 * @param {Array} candles - OHLC candles
 * @param {Number} period - Period (default: 20)
 * @returns {Object} CCI data with signal
 */
function calculateCCI(candles, period = 20) {
  if (!candles || candles.length < period) {
    throw new Error(`Insufficient data for CCI. Need at least ${period} candles`);
  }

  const high = candles.map(c => c.ohlc.high);
  const low = candles.map(c => c.ohlc.low);
  const close = candles.map(c => c.ohlc.close);

  const cciData = technicalIndicators.CCI.calculate({
    high,
    low,
    close,
    period
  });

  if (!cciData || cciData.length === 0) {
    throw new Error('CCI calculation failed');
  }

  const currentCCI = cciData[cciData.length - 1];
  const previousCCI = cciData.length > 1 ? cciData[cciData.length - 2] : currentCCI;

  // CCI zones
  const isExtremeBullish = currentCCI > 200;
  const isBullish = currentCCI > 100;
  const isBearish = currentCCI < -100;
  const isExtremeBearish = currentCCI < -200;

  // Trend
  const trend = currentCCI > previousCCI ? 'RISING' : currentCCI < previousCCI ? 'FALLING' : 'FLAT';

  // Calculate signal score
  const signalScore = calculateSignalScore(currentCCI, trend, isBullish, isBearish, isExtremeBullish, isExtremeBearish);

  return {
    name: 'CCI',
    category: 'momentum',
    value: currentCCI,
    trend,
    zones: {
      extremeBullish: isExtremeBullish,
      bullish: isBullish,
      bearish: isBearish,
      extremeBearish: isExtremeBearish
    },
    signal: {
      score: signalScore,
      action: getAction(signalScore),
      strength: getStrength(Math.abs(signalScore)),
      confidence: getConfidence(Math.abs(currentCCI))
    },
    metadata: { period }
  };
}

function calculateSignalScore(cci, trend, isBullish, isBearish, isExtremeBullish, isExtremeBearish) {
  let score = 0;

  // Zone-based scoring
  if (isExtremeBullish) {
    score -= 30; // Overbought, potential reversal
  } else if (isBullish) {
    score += 25; // Bullish momentum
  } else if (isExtremeBearish) {
    score += 30; // Oversold, potential reversal
  } else if (isBearish) {
    score -= 25; // Bearish momentum
  }

  // Trend direction
  if (trend === 'RISING') {
    score += 20;
  } else if (trend === 'FALLING') {
    score -= 20;
  }

  // Zero line crosses
  if (cci > 0) {
    score += 15; // Above zero = bullish
  } else {
    score -= 15; // Below zero = bearish
  }

  // Extreme reversal signals
  if (isExtremeBearish && trend === 'RISING') {
    score += 20; // Bottoming in oversold
  } else if (isExtremeBullish && trend === 'FALLING') {
    score -= 20; // Topping in overbought
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

function getConfidence(absCCI) {
  if (absCCI > 200) return 85;
  if (absCCI > 100) return 75;
  return 60;
}

module.exports = {
  calculateCCI
};
