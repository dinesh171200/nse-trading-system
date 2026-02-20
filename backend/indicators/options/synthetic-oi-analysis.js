/**
 * Synthetic OI Analysis (Fallback when NSE API unavailable)
 * Calculates OI sentiment from price action, volume, and technical indicators
 */

/**
 * Calculate synthetic OI sentiment from market data
 */
function calculateSyntheticOI(candles, indicators) {
  if (!candles || candles.length < 20) {
    return null;
  }

  const recentCandles = candles.slice(-20);
  const currentPrice = recentCandles[recentCandles.length - 1].ohlc.close;

  // 1. Volume Analysis (proxy for OI changes)
  const volumeChange = analyzeVolumeChanges(recentCandles);

  // 2. Price Action (determine if calls or puts are getting hit)
  const priceAction = analyzePriceAction(recentCandles);

  // 3. Calculate synthetic PCR from volume and price direction
  const syntheticPCR = calculateSyntheticPCR(volumeChange, priceAction);

  // 4. Synthetic OI changes (based on volume spikes)
  const syntheticOIChanges = calculateSyntheticOIChanges(recentCandles, priceAction);

  // 5. Generate interpretation
  const interpretation = generateSyntheticInterpretation(
    syntheticPCR,
    syntheticOIChanges,
    priceAction,
    volumeChange
  );

  return {
    name: 'Options Analysis (Calculated)',
    category: 'options',
    available: true,
    synthetic: true, // Flag to indicate this is calculated, not from NSE
    value: {
      pcr: syntheticPCR.toFixed(2),
      callOIChange: syntheticOIChanges.callOI || 0,
      putOIChange: syntheticOIChanges.putOI || 0,
      netOIChange: syntheticOIChanges.netOI || 0,
      maxPain: Math.round(currentPrice) // Assume current price near max pain
    },
    signal: {
      action: syntheticOIChanges.netOI > 0 ? 'BUY' : syntheticOIChanges.netOI < 0 ? 'SELL' : 'NEUTRAL',
      score: Math.round((syntheticOIChanges.netOI / 100000) * 50), // Scale to -100 to +100
      strength: Math.abs(syntheticOIChanges.netOI) > 300000 ? 'STRONG' : 'MODERATE',
      confidence: 65 // Lower confidence since it's synthetic
    },
    interpretation
  };
}

/**
 * Analyze volume changes over recent candles
 */
function analyzeVolumeChanges(candles) {
  const volumes = candles.map(c => c.ohlc.volume || 0);
  const avgVolume = volumes.reduce((sum, v) => sum + v, 0) / volumes.length;
  const recentVolume = volumes.slice(-5).reduce((sum, v) => sum + v, 0) / 5;

  const volumeRatio = recentVolume / avgVolume;

  return {
    avgVolume,
    recentVolume,
    volumeRatio,
    isIncreasing: recentVolume > avgVolume * 1.2,
    isDecreasing: recentVolume < avgVolume * 0.8
  };
}

/**
 * Analyze price action (bullish/bearish)
 */
function analyzePriceAction(candles) {
  const prices = candles.map(c => c.ohlc.close);
  const recent5 = prices.slice(-5);
  const recent10 = prices.slice(-10);

  const change5 = (recent5[recent5.length - 1] - recent5[0]) / recent5[0];
  const change10 = (recent10[recent10.length - 1] - recent10[0]) / recent10[0];

  let direction = 'NEUTRAL';
  if (change5 > 0.005) direction = 'STRONG_BULLISH';
  else if (change5 > 0.002) direction = 'BULLISH';
  else if (change5 < -0.005) direction = 'STRONG_BEARISH';
  else if (change5 < -0.002) direction = 'BEARISH';

  return {
    direction,
    change5Percent: (change5 * 100).toFixed(2),
    change10Percent: (change10 * 100).toFixed(2),
    momentum: change5 > change10 ? 'ACCELERATING' : 'DECELERATING'
  };
}

/**
 * Calculate synthetic PCR from volume and price action
 */
function calculateSyntheticPCR(volumeChange, priceAction) {
  let basePCR = 1.0; // Neutral

  // If price rising with high volume → Calls being bought (PCR decreases)
  if (priceAction.direction.includes('BULLISH') && volumeChange.isIncreasing) {
    basePCR = 0.75; // Bearish PCR (more calls)
  }
  // If price falling with high volume → Puts being bought (PCR increases)
  else if (priceAction.direction.includes('BEARISH') && volumeChange.isIncreasing) {
    basePCR = 1.35; // Bullish PCR (more puts)
  }
  // If price rising with low volume → Put writing (bullish)
  else if (priceAction.direction.includes('BULLISH') && volumeChange.isDecreasing) {
    basePCR = 1.25; // Bullish PCR
  }
  // If price falling with low volume → Call writing (bearish)
  else if (priceAction.direction.includes('BEARISH') && volumeChange.isDecreasing) {
    basePCR = 0.80; // Bearish PCR
  }

  return basePCR;
}

/**
 * Calculate synthetic OI changes
 */
function calculateSyntheticOIChanges(candles, priceAction) {
  const recentVolume = candles.slice(-5).reduce((sum, c) => sum + (c.ohlc.volume || 0), 0);
  const avgVolume = candles.reduce((sum, c) => sum + (c.ohlc.volume || 0), 0) / candles.length;

  const volumeMultiplier = recentVolume / avgVolume;

  let callOI = 0;
  let putOI = 0;

  // Simulate OI based on price direction and volume
  if (priceAction.direction.includes('BULLISH')) {
    // Bullish price action → More call buying or put writing
    callOI = Math.round(avgVolume * volumeMultiplier * 0.6); // Calls getting bought
    putOI = Math.round(avgVolume * volumeMultiplier * 1.2); // Puts being written (bullish)
  } else if (priceAction.direction.includes('BEARISH')) {
    // Bearish price action → More put buying or call writing
    callOI = Math.round(avgVolume * volumeMultiplier * 1.2); // Calls being written (bearish)
    putOI = Math.round(avgVolume * volumeMultiplier * 0.6); // Puts getting bought
  } else {
    // Neutral → Balanced
    callOI = Math.round(avgVolume * volumeMultiplier * 0.5);
    putOI = Math.round(avgVolume * volumeMultiplier * 0.5);
  }

  const netOI = putOI - callOI;

  return {
    callOI,
    putOI,
    netOI
  };
}

/**
 * Generate interpretation text
 */
function generateSyntheticInterpretation(pcr, oiChanges, priceAction, volumeChange) {
  const lines = [];

  // PCR interpretation
  if (pcr > 1.2) {
    lines.push(`Synthetic PCR ${pcr.toFixed(2)} indicates bullish sentiment`);
  } else if (pcr < 0.8) {
    lines.push(`Synthetic PCR ${pcr.toFixed(2)} indicates bearish sentiment`);
  } else {
    lines.push(`Synthetic PCR ${pcr.toFixed(2)} shows neutral options activity`);
  }

  // OI changes interpretation
  if (oiChanges.netOI > 100000) {
    lines.push(`Put activity dominates by ${oiChanges.netOI.toLocaleString()} - BULLISH`);
  } else if (oiChanges.netOI < -100000) {
    lines.push(`Call activity dominates by ${Math.abs(oiChanges.netOI).toLocaleString()} - BEARISH`);
  } else {
    lines.push(`Balanced options activity`);
  }

  // Price action + Volume
  lines.push(`Price ${priceAction.direction.toLowerCase().replace('_', ' ')} with ${volumeChange.isIncreasing ? 'high' : volumeChange.isDecreasing ? 'low' : 'normal'} volume`);

  // Note
  lines.push(`(Calculated from price/volume data)`);

  return lines.join('. ');
}

module.exports = {
  calculateSyntheticOI
};
