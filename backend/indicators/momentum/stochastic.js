/**
 * Stochastic Oscillator
 * Category: Momentum
 * Signals: Overbought/Oversold and divergences
 */

const technicalIndicators = require('technicalindicators');

/**
 * Calculate Stochastic Oscillator
 * @param {Array} candles - OHLC candles
 * @param {Number} period - K period (default: 14)
 * @param {Number} signalPeriod - D period (default: 3)
 * @returns {Object} Stochastic data with signal
 */
function calculateStochastic(candles, period = 14, signalPeriod = 3) {
  if (!candles || candles.length < period + signalPeriod) {
    throw new Error(`Insufficient data for Stochastic. Need at least ${period + signalPeriod} candles`);
  }

  const high = candles.map(c => c.ohlc.high);
  const low = candles.map(c => c.ohlc.low);
  const close = candles.map(c => c.ohlc.close);

  const stochData = technicalIndicators.Stochastic.calculate({
    high,
    low,
    close,
    period,
    signalPeriod
  });

  if (!stochData || stochData.length === 0) {
    throw new Error('Stochastic calculation failed');
  }

  const current = stochData[stochData.length - 1];
  const previous = stochData.length > 1 ? stochData[stochData.length - 2] : null;

  // Detect zones
  const isOverbought = current.k > 80;
  const isOversold = current.k < 20;

  // Detect crossover
  let crossover = 'NONE';
  if (previous) {
    if (previous.k < previous.d && current.k > current.d) {
      crossover = 'BULLISH'; // %K crosses above %D
    } else if (previous.k > previous.d && current.k < current.d) {
      crossover = 'BEARISH'; // %K crosses below %D
    }
  }

  // Calculate signal score
  const signalScore = calculateSignalScore(current, previous, isOverbought, isOversold, crossover);

  return {
    name: 'Stochastic',
    category: 'momentum',
    k: current.k,
    d: current.d,
    isOverbought,
    isOversold,
    crossover,
    signal: {
      score: signalScore,
      action: getAction(signalScore),
      strength: getStrength(Math.abs(signalScore)),
      confidence: getConfidence(current.k, isOverbought, isOversold)
    },
    metadata: {
      period,
      signalPeriod
    }
  };
}

function calculateSignalScore(current, previous, isOverbought, isOversold, crossover) {
  let score = 0;

  // Overbought/Oversold zones
  if (isOversold) {
    score += 40; // Strong buy signal
    if (current.k < 10) {
      score += 20; // Extremely oversold
    }
  } else if (isOverbought) {
    score -= 40; // Strong sell signal
    if (current.k > 90) {
      score -= 20; // Extremely overbought
    }
  }

  // Crossover signals
  if (crossover === 'BULLISH') {
    score += 30;
    if (isOversold) {
      score += 10; // Bullish crossover in oversold zone = very strong
    }
  } else if (crossover === 'BEARISH') {
    score -= 30;
    if (isOverbought) {
      score -= 10; // Bearish crossover in overbought zone = very strong
    }
  }

  // K and D relationship
  if (current.k > current.d) {
    score += 10; // Bullish momentum
  } else {
    score -= 10; // Bearish momentum
  }

  // Middle zone (neutral)
  if (current.k > 40 && current.k < 60) {
    score *= 0.5; // Reduce signal strength in neutral zone
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

function getConfidence(k, isOverbought, isOversold) {
  let confidence = 60;

  // Higher confidence at extremes
  if (isOverbought || isOversold) {
    confidence += 20;
  }

  // Very high confidence at extreme extremes
  if (k > 90 || k < 10) {
    confidence += 10;
  }

  return Math.min(95, confidence);
}

module.exports = {
  calculateStochastic
};
