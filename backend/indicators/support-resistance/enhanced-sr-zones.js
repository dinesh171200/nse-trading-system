/**
 * Enhanced Support/Resistance Zones with Multi-touch Validation
 * Identifies key price levels based on multiple tests and volume confirmation
 */

/**
 * Find swing highs and lows in the data
 */
function findSwingPoints(candles, lookback = 2) {  // Reduced from 5 for better detection
  const swingHighs = [];
  const swingLows = [];

  for (let i = lookback; i < candles.length - lookback; i++) {
    const current = candles[i];

    // Check if it's a swing high
    let isSwingHigh = true;
    for (let j = i - lookback; j <= i + lookback; j++) {
      if (j !== i && candles[j].high >= current.high) {
        isSwingHigh = false;
        break;
      }
    }

    if (isSwingHigh) {
      swingHighs.push({
        price: current.high,
        index: i,
        timestamp: current.timestamp,
        volume: current.volume
      });
    }

    // Check if it's a swing low
    let isSwingLow = true;
    for (let j = i - lookback; j <= i + lookback; j++) {
      if (j !== i && candles[j].low <= current.low) {
        isSwingLow = false;
        break;
      }
    }

    if (isSwingLow) {
      swingLows.push({
        price: current.low,
        index: i,
        timestamp: current.timestamp,
        volume: current.volume
      });
    }
  }

  return { swingHighs, swingLows };
}

/**
 * Group nearby swing points into zones
 */
function groupIntoZones(swingPoints, tolerance = 0.002) {
  if (swingPoints.length === 0) return [];

  const zones = [];
  const sorted = [...swingPoints].sort((a, b) => a.price - b.price);

  let currentZone = {
    prices: [sorted[0].price],
    touches: 1,
    volumes: [sorted[0].volume],
    indices: [sorted[0].index],
    timestamps: [sorted[0].timestamp]
  };

  for (let i = 1; i < sorted.length; i++) {
    const point = sorted[i];
    const zoneAvg = currentZone.prices.reduce((a, b) => a + b, 0) / currentZone.prices.length;
    const diff = Math.abs(point.price - zoneAvg) / zoneAvg;

    if (diff <= tolerance) {
      // Add to current zone
      currentZone.prices.push(point.price);
      currentZone.touches++;
      currentZone.volumes.push(point.volume);
      currentZone.indices.push(point.index);
      currentZone.timestamps.push(point.timestamp);
    } else {
      // Save current zone and start new one
      if (currentZone.touches >= 2) {
        zones.push(currentZone);
      }
      currentZone = {
        prices: [point.price],
        touches: 1,
        volumes: [point.volume],
        indices: [point.index],
        timestamps: [point.timestamp]
      };
    }
  }

  // Don't forget the last zone
  if (currentZone.touches >= 2) {
    zones.push(currentZone);
  }

  return zones;
}

/**
 * Calculate zone strength and format output
 */
function formatZone(zone, currentPrice, candles) {
  const avgPrice = zone.prices.reduce((a, b) => a + b, 0) / zone.prices.length;
  const avgVolume = zone.volumes.reduce((a, b) => a + b, 0) / zone.volumes.length;
  const priceMin = Math.min(...zone.prices);
  const priceMax = Math.max(...zone.prices);

  // Calculate bounces (price tested zone and reversed)
  let bounces = 0;
  for (let i = 0; i < zone.indices.length; i++) {
    const idx = zone.indices[i];
    if (idx + 3 < candles.length) {
      const nextMove = Math.abs(candles[idx + 3].close - candles[idx].close);
      const avgMove = Math.abs(candles[idx].close) * 0.01; // 1% threshold
      if (nextMove > avgMove) bounces++;
    }
  }

  // Proximity to current price (closer = more relevant)
  const proximity = 1 - Math.min(Math.abs(currentPrice - avgPrice) / currentPrice, 0.1) / 0.1;

  // Strength calculation: touches × volume × proximity
  const volumeScore = Math.min(avgVolume / 1000000, 10) / 10; // Normalize volume
  const strength = Math.round((zone.touches * 20 + volumeScore * 30 + proximity * 50));

  return {
    level: Math.round(avgPrice * 100) / 100,
    strength: Math.min(strength, 100),
    touches: zone.touches,
    bounces,
    zone: [Math.round(priceMin * 100) / 100, Math.round(priceMax * 100) / 100],
    avgVolume: Math.round(avgVolume)
  };
}

/**
 * Calculate Enhanced Support/Resistance Zones
 */
function calculateEnhancedSR(candles, lookback = 50) {
  if (!candles || candles.length < lookback) {
    return {
      name: 'Enhanced S/R Zones',
      category: 'supportResistance',
      supportZones: [],
      resistanceZones: [],
      signal: { action: 'HOLD', score: 0, strength: 'NEUTRAL', confidence: 0 }
    };
  }

  // Use most recent candles
  const recentCandles = candles.slice(-lookback);
  const currentPrice = recentCandles[recentCandles.length - 1].close;

  // Find swing points
  const { swingHighs, swingLows } = findSwingPoints(recentCandles);

  // Group into zones
  const resistanceZoneGroups = groupIntoZones(swingHighs);
  const supportZoneGroups = groupIntoZones(swingLows);

  // Format zones
  const resistanceZones = resistanceZoneGroups
    .map(zone => formatZone(zone, currentPrice, recentCandles))
    .sort((a, b) => b.strength - a.strength)
    .slice(0, 3); // Top 3

  const supportZones = supportZoneGroups
    .map(zone => formatZone(zone, currentPrice, recentCandles))
    .sort((a, b) => b.strength - a.strength)
    .slice(0, 3); // Top 3

  // Generate signal
  let score = 0;
  let action = 'HOLD';
  let strength = 'NEUTRAL';
  let confidence = 0;

  // Check proximity to support zones (bullish)
  for (const zone of supportZones) {
    const distance = (currentPrice - zone.level) / currentPrice;
    if (distance >= 0 && distance <= 0.005) { // Within 0.5%
      score += zone.strength * 0.6;
      confidence = Math.max(confidence, zone.strength);
    }
  }

  // Check proximity to resistance zones (bearish)
  for (const zone of resistanceZones) {
    const distance = (zone.level - currentPrice) / currentPrice;
    if (distance >= 0 && distance <= 0.005) { // Within 0.5%
      score -= zone.strength * 0.6;
      confidence = Math.max(confidence, zone.strength);
    }
  }

  // Cap score
  score = Math.max(-100, Math.min(100, score));

  if (score > 30) {
    action = 'BUY';
    strength = score > 60 ? 'STRONG' : 'MODERATE';
  } else if (score < -30) {
    action = 'SELL';
    strength = score < -60 ? 'STRONG' : 'MODERATE';
  }

  return {
    name: 'Enhanced S/R Zones',
    category: 'supportResistance',
    supportZones,
    resistanceZones,
    signal: {
      action,
      score: Math.round(score),
      strength,
      confidence: Math.round(confidence)
    }
  };
}

module.exports = {
  calculateEnhancedSR
};
