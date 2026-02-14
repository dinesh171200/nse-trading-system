/**
 * MACD - Moving Average Convergence Divergence
 * Category: Trend
 * Signals: Bullish/Bearish crossovers and divergences
 */

const technicalIndicators = require('technicalindicators');

/**
 * Calculate MACD
 * @param {Array} candles - OHLC candles
 * @param {Number} fastPeriod - Fast EMA period (default: 12)
 * @param {Number} slowPeriod - Slow EMA period (default: 26)
 * @param {Number} signalPeriod - Signal line period (default: 9)
 * @returns {Object} MACD data with signal
 */
function calculateMACD(candles, fastPeriod = 12, slowPeriod = 26, signalPeriod = 9) {
  if (!candles || candles.length < slowPeriod + signalPeriod) {
    throw new Error(`Insufficient data for MACD. Need at least ${slowPeriod + signalPeriod} candles`);
  }

  const closePrices = candles.map(c => c.ohlc.close);

  const macdData = technicalIndicators.MACD.calculate({
    values: closePrices,
    fastPeriod,
    slowPeriod,
    signalPeriod,
    SimpleMAOscillator: false,
    SimpleMASignal: false
  });

  if (!macdData || macdData.length === 0) {
    throw new Error('MACD calculation failed');
  }

  const current = macdData[macdData.length - 1];
  const previous = macdData.length > 1 ? macdData[macdData.length - 2] : null;

  // Detect crossover
  let crossover = 'NONE';
  if (previous) {
    if (previous.MACD < previous.signal && current.MACD > current.signal) {
      crossover = 'BULLISH'; // Golden cross
    } else if (previous.MACD > previous.signal && current.MACD < current.signal) {
      crossover = 'BEARISH'; // Death cross
    }
  }

  // Calculate histogram
  const histogram = current.MACD - current.signal;
  const histogramStrength = Math.abs(histogram);

  // Calculate signal score
  const signalScore = calculateSignalScore(current, histogram, crossover, histogramStrength);

  return {
    name: 'MACD',
    category: 'trend',
    value: current.MACD,
    signal: current.signal,
    histogram,
    crossover,
    histogramStrength,
    signal: {
      score: signalScore,
      action: getAction(signalScore),
      strength: getStrength(Math.abs(signalScore)),
      confidence: getConfidence(histogramStrength)
    },
    metadata: {
      fastPeriod,
      slowPeriod,
      signalPeriod
    }
  };
}

function calculateSignalScore(current, histogram, crossover, histogramStrength) {
  let score = 0;

  // Histogram strength (max ±40 points)
  score += Math.min(40, Math.max(-40, histogram * 10));

  // Position relative to zero
  if (current.MACD > 0 && current.signal > 0) {
    score += 20; // Both above zero = bullish
  } else if (current.MACD < 0 && current.signal < 0) {
    score -= 20; // Both below zero = bearish
  }

  // Crossover bonus
  if (crossover === 'BULLISH') {
    score += 30;
  } else if (crossover === 'BEARISH') {
    score -= 30;
  }

  // Histogram expansion/contraction
  if (histogram > 0 && histogramStrength > 5) {
    score += 10; // Strong bullish momentum
  } else if (histogram < 0 && histogramStrength > 5) {
    score -= 10; // Strong bearish momentum
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

function getConfidence(histogramStrength) {
  return Math.min(90, Math.round(50 + histogramStrength * 2));
}

module.exports = {
  calculateMACD
};
