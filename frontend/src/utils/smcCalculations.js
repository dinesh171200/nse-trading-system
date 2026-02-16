/**
 * Smart Money Concepts (SMC) Calculations for Frontend
 * Calculate zones directly from chart data
 */

/**
 * Find support and resistance levels from price data
 */
export function calculateSupportResistance(candleData, lookback = 20) {
  if (!candleData || candleData.length < lookback) {
    return { supportLevels: [], resistanceLevels: [] };
  }

  const recentCandles = candleData.slice(-lookback);
  const levels = [];

  // Find local highs and lows
  for (let i = 2; i < recentCandles.length - 2; i++) {
    const current = recentCandles[i];
    const prev1 = recentCandles[i - 1];
    const prev2 = recentCandles[i - 2];
    const next1 = recentCandles[i + 1];
    const next2 = recentCandles[i + 2];

    // Local high (resistance)
    if (current.high > prev1.high && current.high > prev2.high &&
        current.high > next1.high && current.high > next2.high) {
      levels.push({ price: current.high, type: 'resistance', touches: 1 });
    }

    // Local low (support)
    if (current.low < prev1.low && current.low < prev2.low &&
        current.low < next1.low && current.low < next2.low) {
      levels.push({ price: current.low, type: 'support', touches: 1 });
    }
  }

  // Group nearby levels (within 0.5%)
  const groupedLevels = [];
  const tolerance = 0.005;

  levels.forEach(level => {
    const existing = groupedLevels.find(g =>
      g.type === level.type &&
      Math.abs(g.price - level.price) / g.price < tolerance
    );

    if (existing) {
      existing.touches++;
      existing.price = (existing.price + level.price) / 2; // Average
    } else {
      groupedLevels.push({ ...level });
    }
  });

  // Separate and sort
  const supportLevels = groupedLevels
    .filter(l => l.type === 'support')
    .sort((a, b) => b.touches - a.touches)
    .slice(0, 3)
    .map(l => ({ level: l.price, touches: l.touches, strength: l.touches * 30 }));

  const resistanceLevels = groupedLevels
    .filter(l => l.type === 'resistance')
    .sort((a, b) => b.touches - a.touches)
    .slice(0, 3)
    .map(l => ({ level: l.price, touches: l.touches, strength: l.touches * 30 }));

  return { supportLevels, resistanceLevels };
}

/**
 * Find demand and supply zones from strong price moves
 */
export function calculateDemandSupplyZones(candleData, lookback = 50) {
  if (!candleData || candleData.length < lookback) {
    return { demandZones: [], supplyZones: [] };
  }

  const recentCandles = candleData.slice(-lookback);
  const demandZones = [];
  const supplyZones = [];

  // Look for strong moves (3%+ in 1-3 candles)
  for (let i = 3; i < recentCandles.length; i++) {
    for (let lookBack = 1; lookBack <= 3; lookBack++) {
      if (i - lookBack < 0) continue;

      const startCandle = recentCandles[i - lookBack];
      const endCandle = recentCandles[i];

      const priceChange = ((endCandle.close - startCandle.open) / startCandle.open) * 100;

      // Strong bullish move - mark demand zone
      if (priceChange >= 2) {
        demandZones.push({
          zone: [
            Math.min(startCandle.open, startCandle.close, startCandle.low),
            Math.max(startCandle.open, startCandle.close, startCandle.high)
          ],
          strength: Math.abs(priceChange) * 10,
          startTime: startCandle.time
        });
        break;
      }

      // Strong bearish move - mark supply zone
      if (priceChange <= -2) {
        supplyZones.push({
          zone: [
            Math.min(startCandle.open, startCandle.close, startCandle.low),
            Math.max(startCandle.open, startCandle.close, startCandle.high)
          ],
          strength: Math.abs(priceChange) * 10,
          startTime: startCandle.time
        });
        break;
      }
    }
  }

  // Return top 3 zones by strength
  return {
    demandZones: demandZones.sort((a, b) => b.strength - a.strength).slice(0, 3),
    supplyZones: supplyZones.sort((a, b) => b.strength - a.strength).slice(0, 3)
  };
}

/**
 * Find Fair Value Gaps
 */
export function calculateFairValueGaps(candleData) {
  if (!candleData || candleData.length < 10) {
    return { bullishFVGs: [], bearishFVGs: [] };
  }

  const bullishFVGs = [];
  const bearishFVGs = [];
  const recentCandles = candleData.slice(-50);

  // Find 3-candle gaps
  for (let i = 2; i < recentCandles.length; i++) {
    const candle0 = recentCandles[i - 2];
    const candle1 = recentCandles[i - 1];
    const candle2 = recentCandles[i];

    // Bullish FVG: candle2.low > candle0.high
    if (candle2.low > candle0.high) {
      const gapSize = candle2.low - candle0.high;
      const gapPercent = (gapSize / candle0.high) * 100;

      if (gapPercent > 0.1) {
        bullishFVGs.push({
          gap: [candle0.high, candle2.low],
          size: gapSize,
          time: candle1.time
        });
      }
    }

    // Bearish FVG: candle2.high < candle0.low
    if (candle2.high < candle0.low) {
      const gapSize = candle0.low - candle2.high;
      const gapPercent = (gapSize / candle2.high) * 100;

      if (gapPercent > 0.1) {
        bearishFVGs.push({
          gap: [candle2.high, candle0.low],
          size: gapSize,
          time: candle1.time
        });
      }
    }
  }

  return {
    bullishFVGs: bullishFVGs.slice(-3), // Last 3
    bearishFVGs: bearishFVGs.slice(-3)
  };
}

/**
 * Calculate pivot points from previous day's data
 */
export function calculatePivotPoints(candleData) {
  if (!candleData || candleData.length < 20) {
    return null;
  }

  // Use last 20 candles to calculate high/low/close
  const recentCandles = candleData.slice(-20);
  const high = Math.max(...recentCandles.map(c => c.high));
  const low = Math.min(...recentCandles.map(c => c.low));
  const close = recentCandles[recentCandles.length - 1].close;

  const pivot = (high + low + close) / 3;

  return {
    pivot,
    support: {
      s1: (2 * pivot) - high,
      s2: pivot - (high - low),
      s3: low - 2 * (high - pivot)
    },
    resistance: {
      r1: (2 * pivot) - low,
      r2: pivot + (high - low),
      r3: high + 2 * (pivot - low)
    }
  };
}
