/**
 * Change of Character (ChOC) Detector
 * Identifies market structure shifts indicating potential trend reversals
 */

/**
 * Find swing highs and lows
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
        timestamp: current.timestamp
      });
      continue; // Can't be both high and low
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
        timestamp: current.timestamp
      });
    }
  }

  return swings;
}

/**
 * Determine market structure from swing points
 */
function analyzeMarketStructure(swings) {
  if (swings.length < 4) {
    return { structure: 'RANGE', quality: 0 };
  }

  const highs = swings.filter(s => s.type === 'HIGH');
  const lows = swings.filter(s => s.type === 'LOW');

  if (highs.length < 2 || lows.length < 2) {
    return { structure: 'RANGE', quality: 0 };
  }

  // Check for higher highs and higher lows (uptrend)
  const recentHighs = highs.slice(-3);
  const recentLows = lows.slice(-3);

  let higherHighs = 0;
  for (let i = 1; i < recentHighs.length; i++) {
    if (recentHighs[i].price > recentHighs[i - 1].price) higherHighs++;
  }

  let higherLows = 0;
  for (let i = 1; i < recentLows.length; i++) {
    if (recentLows[i].price > recentLows[i - 1].price) higherLows++;
  }

  // Check for lower highs and lower lows (downtrend)
  let lowerHighs = 0;
  for (let i = 1; i < recentHighs.length; i++) {
    if (recentHighs[i].price < recentHighs[i - 1].price) lowerHighs++;
  }

  let lowerLows = 0;
  for (let i = 1; i < recentLows.length; i++) {
    if (recentLows[i].price < recentLows[i - 1].price) lowerLows++;
  }

  // Determine structure
  const uptrendQuality = (higherHighs + higherLows) / ((recentHighs.length - 1) + (recentLows.length - 1));
  const downtrendQuality = (lowerHighs + lowerLows) / ((recentHighs.length - 1) + (recentLows.length - 1));

  if (uptrendQuality >= 0.66) {
    return {
      structure: 'UPTREND',
      quality: Math.round(uptrendQuality * 100),
      recentHighs,
      recentLows
    };
  } else if (downtrendQuality >= 0.66) {
    return {
      structure: 'DOWNTREND',
      quality: Math.round(downtrendQuality * 100),
      recentHighs,
      recentLows
    };
  } else {
    return {
      structure: 'RANGE',
      quality: 50,
      recentHighs,
      recentLows
    };
  }
}

/**
 * Detect Change of Character
 */
function detectChOC(structureAnalysis, candles) {
  if (!structureAnalysis.recentHighs || !structureAnalysis.recentLows) {
    return { detected: false };
  }

  const { structure, recentHighs, recentLows } = structureAnalysis;
  const currentPrice = candles[candles.length - 1].close;
  const currentIndex = candles.length - 1;

  // Check for structure break in last 10 candles
  const recentCandles = candles.slice(-10);
  let chocDetected = false;
  let chocType = null;
  let chocTimestamp = null;
  let confidence = 0;

  if (structure === 'UPTREND' && recentLows.length >= 2) {
    // ChOC: Price breaks below previous higher low
    const previousLow = recentLows[recentLows.length - 2];

    for (let i = recentCandles.length - 1; i >= 0; i--) {
      const candle = recentCandles[i];
      if (candle.low < previousLow.price) {
        chocDetected = true;
        chocType = 'BULLISH_TO_BEARISH';
        chocTimestamp = candle.timestamp;
        confidence = structureAnalysis.quality;
        break;
      }
    }
  } else if (structure === 'DOWNTREND' && recentHighs.length >= 2) {
    // ChOC: Price breaks above previous lower high
    const previousHigh = recentHighs[recentHighs.length - 2];

    for (let i = recentCandles.length - 1; i >= 0; i--) {
      const candle = recentCandles[i];
      if (candle.high > previousHigh.price) {
        chocDetected = true;
        chocType = 'BEARISH_TO_BULLISH';
        chocTimestamp = candle.timestamp;
        confidence = structureAnalysis.quality;
        break;
      }
    }
  }

  return {
    detected: chocDetected,
    chocType,
    timestamp: chocTimestamp,
    confidence
  };
}

/**
 * Calculate Change of Character
 */
function calculateChOC(candles) {
  if (!candles || candles.length < 30) {
    return {
      name: 'Change of Character',
      category: 'supportResistance',
      marketStructure: 'UNKNOWN',
      chocDetected: false,
      chocType: null,
      lastStructureBreak: null,
      confidence: 0,
      signal: { action: 'HOLD', score: 0, strength: 'NEUTRAL', confidence: 0 }
    };
  }

  // Find swing points
  const swings = findSwingPoints(candles);

  // Analyze market structure
  const structureAnalysis = analyzeMarketStructure(swings);

  // Detect ChOC
  const choc = detectChOC(structureAnalysis, candles);

  // Generate signal
  let score = 0;
  let action = 'HOLD';
  let strength = 'NEUTRAL';
  let confidence = 0;

  if (choc.detected) {
    confidence = choc.confidence;

    if (choc.chocType === 'BEARISH_TO_BULLISH') {
      // Uptrend resuming - bullish
      score = 75;
      action = 'BUY';
      strength = confidence > 75 ? 'STRONG' : 'MODERATE';
    } else if (choc.chocType === 'BULLISH_TO_BEARISH') {
      // Downtrend resuming - bearish
      score = -75;
      action = 'SELL';
      strength = confidence > 75 ? 'STRONG' : 'MODERATE';
    }
  } else {
    // No ChOC, provide trend continuation signal
    if (structureAnalysis.structure === 'UPTREND') {
      score = 30;
      action = 'BUY';
      strength = 'WEAK';
      confidence = structureAnalysis.quality;
    } else if (structureAnalysis.structure === 'DOWNTREND') {
      score = -30;
      action = 'SELL';
      strength = 'WEAK';
      confidence = structureAnalysis.quality;
    }
  }

  return {
    name: 'Change of Character',
    category: 'supportResistance',
    marketStructure: structureAnalysis.structure,
    structureQuality: structureAnalysis.quality,
    chocDetected: choc.detected,
    chocType: choc.chocType,
    lastStructureBreak: choc.timestamp,
    signal: {
      action,
      score: Math.round(score),
      strength,
      confidence: Math.round(confidence)
    }
  };
}

module.exports = {
  calculateChOC
};
