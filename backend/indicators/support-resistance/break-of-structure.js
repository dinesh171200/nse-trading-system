/**
 * Break of Structure (BOS) Detector
 * Identifies trend continuation patterns when price breaks key levels
 */

/**
 * Find recent swing highs and lows
 */
function findSwingPoints(candles, swingSize = 2) {  // Reduced from 5 for better detection
  const swings = [];

  for (let i = swingSize; i < candles.length - swingSize; i++) {
    const current = candles[i];

    // Check for swing high
    let isSwingHigh = true;
    for (let j = i - swingSize; j <= i + swingSize; j++) {
      if (j !== i && candles[j].high >= current.high) {
        isSwingHigh = false;
        break;
      }
    }

    if (isSwingHigh) {
      swings.push({
        type: 'HIGH',
        price: current.high,
        index: i,
        timestamp: current.timestamp,
        volume: current.volume
      });
      continue;
    }

    // Check for swing low
    let isSwingLow = true;
    for (let j = i - swingSize; j <= i + swingSize; j++) {
      if (j !== i && candles[j].low <= current.low) {
        isSwingLow = false;
        break;
      }
    }

    if (isSwingLow) {
      swings.push({
        type: 'LOW',
        price: current.low,
        index: i,
        timestamp: current.timestamp,
        volume: current.volume
      });
    }
  }

  return swings;
}

/**
 * Determine current trend direction
 */
function determineTrend(swings) {
  if (swings.length < 4) return 'RANGE';

  const recentSwings = swings.slice(-6);
  const highs = recentSwings.filter(s => s.type === 'HIGH');
  const lows = recentSwings.filter(s => s.type === 'LOW');

  if (highs.length < 2 || lows.length < 2) return 'RANGE';

  // Count higher highs and higher lows
  let higherHighs = 0;
  for (let i = 1; i < highs.length; i++) {
    if (highs[i].price > highs[i - 1].price) higherHighs++;
  }

  let higherLows = 0;
  for (let i = 1; i < lows.length; i++) {
    if (lows[i].price > lows[i - 1].price) higherLows++;
  }

  // Count lower highs and lower lows
  let lowerHighs = 0;
  for (let i = 1; i < highs.length; i++) {
    if (highs[i].price < highs[i - 1].price) lowerHighs++;
  }

  let lowerLows = 0;
  for (let i = 1; i < lows.length; i++) {
    if (lows[i].price < lows[i - 1].price) lowerLows++;
  }

  const uptrendScore = higherHighs + higherLows;
  const downtrendScore = lowerHighs + lowerLows;

  if (uptrendScore > downtrendScore && uptrendScore >= 3) return 'UPTREND';
  if (downtrendScore > uptrendScore && downtrendScore >= 3) return 'DOWNTREND';
  return 'RANGE';
}

/**
 * Calculate average volume
 */
function calculateAverageVolume(candles, period = 20) {
  const recentCandles = candles.slice(-Math.min(period, candles.length));
  const totalVolume = recentCandles.reduce((sum, c) => sum + c.volume, 0);
  return totalVolume / recentCandles.length;
}

/**
 * Detect Break of Structure
 */
function detectBOS(trend, swings, candles) {
  const recentCandles = candles.slice(-5); // Last 5 candles
  const avgVolume = calculateAverageVolume(candles);

  let bosDetected = false;
  let bosType = null;
  let brokenLevel = null;
  let volumeConfirmation = false;
  let confidence = 0;

  if (trend === 'UPTREND') {
    // Look for break above recent swing high
    const recentHighs = swings.filter(s => s.type === 'HIGH').slice(-3);

    if (recentHighs.length > 0) {
      const lastHigh = recentHighs[recentHighs.length - 1];

      // Check if any recent candle broke above
      for (const candle of recentCandles) {
        if (candle.close > lastHigh.price) {
          bosDetected = true;
          bosType = 'BULLISH';
          brokenLevel = lastHigh.price;
          volumeConfirmation = candle.volume > avgVolume * 1.2;

          // Confidence based on how decisively it broke
          const breakSize = ((candle.close - lastHigh.price) / lastHigh.price) * 100;
          confidence = Math.min(50 + breakSize * 20 + (volumeConfirmation ? 25 : 0), 95);
          break;
        }
      }
    }
  } else if (trend === 'DOWNTREND') {
    // Look for break below recent swing low
    const recentLows = swings.filter(s => s.type === 'LOW').slice(-3);

    if (recentLows.length > 0) {
      const lastLow = recentLows[recentLows.length - 1];

      // Check if any recent candle broke below
      for (const candle of recentCandles) {
        if (candle.close < lastLow.price) {
          bosDetected = true;
          bosType = 'BEARISH';
          brokenLevel = lastLow.price;
          volumeConfirmation = candle.volume > avgVolume * 1.2;

          // Confidence based on how decisively it broke
          const breakSize = ((lastLow.price - candle.close) / lastLow.price) * 100;
          confidence = Math.min(50 + breakSize * 20 + (volumeConfirmation ? 25 : 0), 95);
          break;
        }
      }
    }
  }

  return {
    detected: bosDetected,
    bosType,
    brokenLevel,
    volumeConfirmation,
    confidence: Math.round(confidence)
  };
}

/**
 * Calculate Break of Structure
 */
function calculateBOS(candles) {
  if (!candles || candles.length < 30) {
    return {
      name: 'Break of Structure',
      category: 'supportResistance',
      trend: 'UNKNOWN',
      bosDetected: false,
      bosType: null,
      brokenLevel: null,
      volumeConfirmation: false,
      signal: { action: 'HOLD', score: 0, strength: 'NEUTRAL', confidence: 0 }
    };
  }

  // Find swing points
  const swings = findSwingPoints(candles);

  // Determine trend
  const trend = determineTrend(swings);

  // Detect BOS
  const bos = detectBOS(trend, swings, candles);

  // Generate signal
  let score = 0;
  let action = 'HOLD';
  let strength = 'NEUTRAL';
  let confidence = 0;

  if (bos.detected) {
    confidence = bos.confidence;

    if (bos.bosType === 'BULLISH') {
      // Bullish BOS - uptrend continuation
      score = bos.volumeConfirmation ? 80 : 65;
      action = 'BUY';
      strength = score >= 75 ? 'STRONG' : 'MODERATE';
    } else if (bos.bosType === 'BEARISH') {
      // Bearish BOS - downtrend continuation
      score = bos.volumeConfirmation ? -80 : -65;
      action = 'SELL';
      strength = score <= -75 ? 'STRONG' : 'MODERATE';
    }
  } else {
    // No BOS detected, weak trend signal
    if (trend === 'UPTREND') {
      score = 25;
      action = 'BUY';
      strength = 'WEAK';
      confidence = 40;
    } else if (trend === 'DOWNTREND') {
      score = -25;
      action = 'SELL';
      strength = 'WEAK';
      confidence = 40;
    }
  }

  return {
    name: 'Break of Structure',
    category: 'supportResistance',
    trend,
    bosDetected: bos.detected,
    bosType: bos.bosType,
    brokenLevel: bos.brokenLevel ? Math.round(bos.brokenLevel * 100) / 100 : null,
    volumeConfirmation: bos.volumeConfirmation,
    signal: {
      action,
      score: Math.round(score),
      strength,
      confidence: Math.round(confidence)
    }
  };
}

module.exports = {
  calculateBOS
};
