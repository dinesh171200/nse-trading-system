/**
 * Demand/Supply Zone Detector
 * Identifies areas where significant institutional buying/selling occurred
 */

/**
 * Calculate average volume
 */
function calculateAverageVolume(candles, period = 20) {
  const recentCandles = candles.slice(-period);
  const totalVolume = recentCandles.reduce((sum, candle) => sum + candle.volume, 0);
  return totalVolume / recentCandles.length;
}

/**
 * Detect strong price moves with volume
 */
function detectStrongMoves(candles, minMovePercent = 3, volumeMultiplier = 1.5) {
  const moves = [];
  const avgVolume = calculateAverageVolume(candles);

  for (let i = 3; i < candles.length; i++) {
    // Check 1-3 candle moves
    for (let lookback = 1; lookback <= 3; lookback++) {
      if (i - lookback < 0) continue;

      const startCandle = candles[i - lookback];
      const endCandle = candles[i];

      const priceChange = ((endCandle.close - startCandle.open) / startCandle.open) * 100;
      const moveVolumes = candles.slice(i - lookback, i + 1);
      const avgMoveVolume = moveVolumes.reduce((sum, c) => sum + c.volume, 0) / moveVolumes.length;

      // Strong bullish move (demand zone origin)
      if (priceChange >= minMovePercent && avgMoveVolume >= avgVolume * volumeMultiplier) {
        moves.push({
          type: 'DEMAND',
          startIndex: i - lookback,
          endIndex: i,
          zone: [
            Math.min(startCandle.open, startCandle.close, startCandle.low),
            Math.max(startCandle.open, startCandle.close, startCandle.high)
          ],
          moveSize: Math.abs(priceChange),
          volume: avgMoveVolume,
          created: startCandle.timestamp,
          originPrice: startCandle.close
        });
        break; // Don't check other lookbacks for this position
      }

      // Strong bearish move (supply zone origin)
      if (priceChange <= -minMovePercent && avgMoveVolume >= avgVolume * volumeMultiplier) {
        moves.push({
          type: 'SUPPLY',
          startIndex: i - lookback,
          endIndex: i,
          zone: [
            Math.min(startCandle.open, startCandle.close, startCandle.low),
            Math.max(startCandle.open, startCandle.close, startCandle.high)
          ],
          moveSize: Math.abs(priceChange),
          volume: avgMoveVolume,
          created: startCandle.timestamp,
          originPrice: startCandle.close
        });
        break;
      }
    }
  }

  return moves;
}

/**
 * Validate zones (check if they haven't been violated)
 */
function validateZones(moves, candles) {
  const validZones = [];

  for (const move of moves) {
    let violated = false;
    let tested = 0;

    // Check candles after the move
    for (let i = move.endIndex + 1; i < candles.length; i++) {
      const candle = candles[i];

      if (move.type === 'DEMAND') {
        // Demand zone is violated if price closes below zone
        if (candle.close < move.zone[0]) {
          violated = true;
          break;
        }
        // Zone is tested if price touches it
        if (candle.low <= move.zone[1] && candle.low >= move.zone[0]) {
          tested++;
        }
      } else {
        // Supply zone is violated if price closes above zone
        if (candle.close > move.zone[1]) {
          violated = true;
          break;
        }
        // Zone is tested if price touches it
        if (candle.high >= move.zone[0] && candle.high <= move.zone[1]) {
          tested++;
        }
      }
    }

    if (!violated) {
      validZones.push({
        ...move,
        valid: true,
        tested
      });
    }
  }

  return validZones;
}

/**
 * Score zones based on recency, volume, and move size
 */
function scoreZone(zone, currentTime, candles) {
  const ageInCandles = candles.length - zone.endIndex - 1;
  const maxAge = 50;

  // Fresher zones score higher
  const freshnessScore = Math.max(0, (maxAge - ageInCandles) / maxAge) * 40;

  // Larger moves score higher
  const moveSizeScore = Math.min(zone.moveSize / 10 * 30, 30);

  // Higher volume scores higher
  const avgVolume = calculateAverageVolume(candles);
  const volumeScore = Math.min((zone.volume / avgVolume) * 30, 30);

  return Math.round(freshnessScore + moveSizeScore + volumeScore);
}

/**
 * Check if price is near a zone
 */
function isNearZone(currentPrice, zone, threshold = 0.02) {
  const zoneCenter = (zone.zone[0] + zone.zone[1]) / 2;
  const distance = Math.abs(currentPrice - zoneCenter) / currentPrice;
  return distance <= threshold;
}

/**
 * Calculate Demand/Supply Zones
 */
function calculateDemandSupply(candles, minMovePercent = 3) {
  if (!candles || candles.length < 20) {
    return {
      name: 'Demand/Supply Zones',
      category: 'supportResistance',
      demandZones: [],
      supplyZones: [],
      signal: { action: 'HOLD', score: 0, strength: 'NEUTRAL', confidence: 0 }
    };
  }

  const currentPrice = candles[candles.length - 1].close;
  const currentTime = candles[candles.length - 1].timestamp;

  // Detect strong moves
  const moves = detectStrongMoves(candles, minMovePercent);

  // Validate zones
  const validZones = validateZones(moves, candles);

  // Separate and score zones
  const demandZones = validZones
    .filter(z => z.type === 'DEMAND')
    .map(z => ({
      zone: z.zone,
      created: z.created,
      strength: scoreZone(z, currentTime, candles),
      tested: z.tested,
      valid: z.valid,
      moveSize: Math.round(z.moveSize * 10) / 10
    }))
    .sort((a, b) => b.strength - a.strength)
    .slice(0, 5); // Keep top 5

  const supplyZones = validZones
    .filter(z => z.type === 'SUPPLY')
    .map(z => ({
      zone: z.zone,
      created: z.created,
      strength: scoreZone(z, currentTime, candles),
      tested: z.tested,
      valid: z.valid,
      moveSize: Math.round(z.moveSize * 10) / 10
    }))
    .sort((a, b) => b.strength - a.strength)
    .slice(0, 5); // Keep top 5

  // Generate signal
  let score = 0;
  let action = 'HOLD';
  let strength = 'NEUTRAL';
  let confidence = 0;

  // Check if price is near demand zones (bullish)
  for (const zone of demandZones) {
    if (isNearZone(currentPrice, zone)) {
      score += zone.strength * 0.7;
      confidence = Math.max(confidence, zone.strength);
    }
  }

  // Check if price is near supply zones (bearish)
  for (const zone of supplyZones) {
    if (isNearZone(currentPrice, zone)) {
      score -= zone.strength * 0.7;
      confidence = Math.max(confidence, zone.strength);
    }
  }

  // Cap score
  score = Math.max(-100, Math.min(100, score));

  if (score > 35) {
    action = 'BUY';
    strength = score > 60 ? 'STRONG' : 'MODERATE';
  } else if (score < -35) {
    action = 'SELL';
    strength = score < -60 ? 'STRONG' : 'MODERATE';
  }

  return {
    name: 'Demand/Supply Zones',
    category: 'supportResistance',
    demandZones,
    supplyZones,
    signal: {
      action,
      score: Math.round(score),
      strength,
      confidence: Math.round(confidence)
    }
  };
}

module.exports = {
  calculateDemandSupply
};
