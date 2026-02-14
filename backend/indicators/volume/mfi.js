/**
 * MFI - Money Flow Index
 * Category: Volume
 * Signals: Volume-weighted RSI, overbought/oversold
 */

const technicalIndicators = require('technicalindicators');

/**
 * Calculate MFI
 * @param {Array} candles - OHLC candles
 * @param {Number} period - Period (default: 14)
 * @returns {Object} MFI data with signal
 */
function calculateMFI(candles, period = 14) {
  if (!candles || candles.length < period + 1) {
    throw new Error(`Insufficient data for MFI. Need at least ${period + 1} candles`);
  }

  const high = candles.map(c => c.ohlc.high);
  const low = candles.map(c => c.ohlc.low);
  const close = candles.map(c => c.ohlc.close);
  const volume = candles.map(c => c.volume || 1);

  const mfiData = technicalIndicators.MFI.calculate({
    high,
    low,
    close,
    volume,
    period
  });

  if (!mfiData || mfiData.length === 0) {
    throw new Error('MFI calculation failed');
  }

  const currentMFI = mfiData[mfiData.length - 1];
  const previousMFI = mfiData.length > 1 ? mfiData[mfiData.length - 2] : currentMFI;

  // MFI zones (similar to RSI)
  const isOverbought = currentMFI > 80;
  const isOversold = currentMFI < 20;

  const trend = currentMFI > previousMFI ? 'RISING' : currentMFI < previousMFI ? 'FALLING' : 'FLAT';

  // Calculate signal score
  const signalScore = calculateSignalScore(currentMFI, previousMFI, trend, isOverbought, isOversold);

  return {
    name: 'MFI',
    category: 'volume',
    value: currentMFI,
    trend,
    isOverbought,
    isOversold,
    signal: {
      score: signalScore,
      action: getAction(signalScore),
      strength: getStrength(Math.abs(signalScore)),
      confidence: getConfidence(currentMFI)
    },
    metadata: { period }
  };
}

function calculateSignalScore(mfi, previousMFI, trend, isOverbought, isOversold) {
  let score = 0;

  // Overbought/Oversold zones
  if (isOversold) {
    score += 40; // Strong buy signal
    if (mfi < 10) score += 20; // Extremely oversold
  } else if (isOverbought) {
    score -= 40; // Strong sell signal
    if (mfi > 90) score -= 20; // Extremely overbought
  }

  // Trend direction
  if (trend === 'RISING') {
    score += 20;
    if (isOversold) score += 10; // Turning up from oversold
  } else if (trend === 'FALLING') {
    score -= 20;
    if (isOverbought) score -= 10; // Turning down from overbought
  }

  // Midline (50) crosses
  if (mfi > 50) {
    score += 10; // Above 50 = bullish
  } else {
    score -= 10; // Below 50 = bearish
  }

  // Divergence potential (simplified)
  const momentum = mfi - previousMFI;
  if (Math.abs(momentum) > 10) {
    score += momentum > 0 ? 10 : -10; // Strong momentum shift
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

function getConfidence(mfi) {
  if (mfi > 90 || mfi < 10) return 90; // Extreme zones
  if (mfi > 80 || mfi < 20) return 80; // Strong zones
  return 65;
}

module.exports = {
  calculateMFI
};
