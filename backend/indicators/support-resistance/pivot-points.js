/**
 * Pivot Points
 * Category: Support/Resistance
 * Signals: Key price levels for intraday trading
 */

/**
 * Calculate Standard Pivot Points
 * @param {Array} candles - OHLC candles (need at least previous day's data)
 * @returns {Object} Pivot points with signal
 */
function calculatePivotPoints(candles) {
  if (!candles || candles.length < 2) {
    throw new Error('Insufficient data for Pivot Points. Need at least 2 candles');
  }

  // Use previous candle for pivot calculation
  const prevCandle = candles[candles.length - 2];
  const currentPrice = candles[candles.length - 1].ohlc.close;

  const high = prevCandle.ohlc.high;
  const low = prevCandle.ohlc.low;
  const close = prevCandle.ohlc.close;

  // Standard Pivot Point formula
  const pivot = (high + low + close) / 3;

  // Resistance levels
  const r1 = (2 * pivot) - low;
  const r2 = pivot + (high - low);
  const r3 = high + 2 * (pivot - low);

  // Support levels
  const s1 = (2 * pivot) - high;
  const s2 = pivot - (high - low);
  const s3 = low - 2 * (high - pivot);

  // Determine price position
  let position = 'AT_PIVOT';
  let nearestLevel = pivot;
  let distance = Math.abs(currentPrice - pivot);

  const levels = [
    { name: 'R3', value: r3, type: 'resistance' },
    { name: 'R2', value: r2, type: 'resistance' },
    { name: 'R1', value: r1, type: 'resistance' },
    { name: 'Pivot', value: pivot, type: 'pivot' },
    { name: 'S1', value: s1, type: 'support' },
    { name: 'S2', value: s2, type: 'support' },
    { name: 'S3', value: s3, type: 'support' }
  ];

  // Find nearest level
  levels.forEach(level => {
    const dist = Math.abs(currentPrice - level.value);
    if (dist < distance) {
      distance = dist;
      nearestLevel = level.value;
      position = level.name;
    }
  });

  // Calculate distance as percentage
  const distancePercent = (distance / currentPrice) * 100;

  // Determine if price is at a key level
  const atKeyLevel = distancePercent < 0.5; // Within 0.5%

  // Calculate signal score
  const signalScore = calculateSignalScore(currentPrice, pivot, position, atKeyLevel, distancePercent);

  return {
    name: 'Pivot Points',
    category: 'supportResistance',
    pivot,
    resistance: { r1, r2, r3 },
    support: { s1, s2, s3 },
    currentPrice,
    position,
    nearestLevel,
    distance: distancePercent,
    atKeyLevel,
    signal: {
      score: signalScore,
      action: getAction(signalScore),
      strength: getStrength(Math.abs(signalScore)),
      confidence: getConfidence(distancePercent, atKeyLevel)
    }
  };
}

function calculateSignalScore(currentPrice, pivot, position, atKeyLevel, distancePercent) {
  let score = 0;

  // Price above pivot = bullish bias
  if (currentPrice > pivot) {
    score += 20;
  } else {
    score -= 20;
  }

  // At support levels = potential buy
  if (position === 'S1') {
    score += 30;
    if (atKeyLevel) score += 10;
  } else if (position === 'S2') {
    score += 40;
    if (atKeyLevel) score += 15;
  } else if (position === 'S3') {
    score += 50;
    if (atKeyLevel) score += 20;
  }

  // At resistance levels = potential sell
  if (position === 'R1') {
    score -= 30;
    if (atKeyLevel) score -= 10;
  } else if (position === 'R2') {
    score -= 40;
    if (atKeyLevel) score -= 15;
  } else if (position === 'R3') {
    score -= 50;
    if (atKeyLevel) score -= 20;
  }

  // Near pivot = neutral zone
  if (position === 'Pivot' || distancePercent < 0.3) {
    score *= 0.3; // Reduce signal strength near pivot
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

function getConfidence(distancePercent, atKeyLevel) {
  let confidence = 60;

  // Higher confidence when at key levels
  if (atKeyLevel) {
    confidence += 25;
  } else if (distancePercent < 1) {
    confidence += 10;
  }

  return Math.min(90, confidence);
}

module.exports = {
  calculatePivotPoints
};
