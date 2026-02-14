/**
 * Bollinger Bands
 * Category: Volatility
 * Signals: Overbought/Oversold and trend strength
 */

const technicalIndicators = require('technicalindicators');

/**
 * Calculate Bollinger Bands
 * @param {Array} candles - OHLC candles
 * @param {Number} period - Period (default: 20)
 * @param {Number} stdDev - Standard deviation multiplier (default: 2)
 * @returns {Object} Bollinger Bands data with signal
 */
function calculateBollingerBands(candles, period = 20, stdDev = 2) {
  if (!candles || candles.length < period) {
    throw new Error(`Insufficient data for Bollinger Bands. Need at least ${period} candles`);
  }

  const closePrices = candles.map(c => c.ohlc.close);

  const bbData = technicalIndicators.BollingerBands.calculate({
    values: closePrices,
    period,
    stdDev
  });

  if (!bbData || bbData.length === 0) {
    throw new Error('Bollinger Bands calculation failed');
  }

  const current = bbData[bbData.length - 1];
  const currentPrice = closePrices[closePrices.length - 1];

  // Calculate position in bands (0 = lower, 50 = middle, 100 = upper)
  const bandWidth = current.upper - current.lower;
  const pricePosition = ((currentPrice - current.lower) / bandWidth) * 100;

  // Calculate bandwidth (volatility measure)
  const bandwidth = (bandWidth / current.middle) * 100;

  // Detect squeeze (low volatility)
  const isSqueeze = bandwidth < 5;

  // Price position analysis
  let position = 'MIDDLE';
  if (pricePosition > 80) {
    position = 'UPPER'; // Near upper band (overbought)
  } else if (pricePosition < 20) {
    position = 'LOWER'; // Near lower band (oversold)
  }

  // Calculate signal score
  const signalScore = calculateSignalScore(pricePosition, bandwidth, position, isSqueeze);

  return {
    name: 'Bollinger Bands',
    category: 'volatility',
    upper: current.upper,
    middle: current.middle,
    lower: current.lower,
    currentPrice,
    pricePosition,
    bandwidth,
    position,
    isSqueeze,
    signal: {
      score: signalScore,
      action: getAction(signalScore),
      strength: getStrength(Math.abs(signalScore)),
      confidence: getConfidence(bandwidth, pricePosition)
    },
    metadata: {
      period,
      stdDev
    }
  };
}

function calculateSignalScore(pricePosition, bandwidth, position, isSqueeze) {
  let score = 0;

  // Price position scoring
  if (position === 'LOWER') {
    // Near lower band = oversold = potential buy
    score += 40;
    if (pricePosition < 10) {
      score += 20; // Very oversold
    }
  } else if (position === 'UPPER') {
    // Near upper band = overbought = potential sell
    score -= 40;
    if (pricePosition > 90) {
      score -= 20; // Very overbought
    }
  }

  // Middle band bounce
  if (pricePosition > 45 && pricePosition < 55) {
    // Price near middle band (neutral)
    score += 0;
  }

  // Bandwidth analysis
  if (bandwidth < 5) {
    // Squeeze = low volatility = potential breakout
    score += 10; // Slightly bullish bias for breakout
  } else if (bandwidth > 15) {
    // High volatility = trend in progress
    if (pricePosition > 60) {
      score += 15; // Uptrend confirmed
    } else if (pricePosition < 40) {
      score -= 15; // Downtrend confirmed
    }
  }

  // Band walk (strong trend)
  if (pricePosition > 85) {
    score += 10; // Walking upper band = strong uptrend
  } else if (pricePosition < 15) {
    score -= 10; // Walking lower band = strong downtrend
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

function getConfidence(bandwidth, pricePosition) {
  let confidence = 60;

  // Higher confidence at band extremes
  if (pricePosition < 10 || pricePosition > 90) {
    confidence += 20;
  }

  // Lower confidence during squeeze
  if (bandwidth < 5) {
    confidence -= 10;
  }

  return Math.min(90, Math.max(40, confidence));
}

module.exports = {
  calculateBollingerBands
};
