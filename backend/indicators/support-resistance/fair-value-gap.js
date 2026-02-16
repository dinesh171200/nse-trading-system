/**
 * Fair Value Gap (FVG) Detector
 * Identifies price imbalances where institutional orders left gaps
 */

/**
 * Detect Fair Value Gaps
 */
function detectFVGs(candles) {
  const bullishFVGs = [];
  const bearishFVGs = [];

  // Need at least 3 candles to detect FVG
  for (let i = 2; i < candles.length; i++) {
    const candle0 = candles[i - 2];
    const candle1 = candles[i - 1];
    const candle2 = candles[i];

    // Bullish FVG: candle2.low > candle0.high (gap between)
    // This means there's a price range that wasn't traded
    if (candle2.low > candle0.high) {
      const gapSize = candle2.low - candle0.high;
      const gapPercent = (gapSize / candle0.high) * 100;

      // Only consider significant gaps (> 0.1%)
      if (gapPercent > 0.1) {
        bullishFVGs.push({
          gap: [candle0.high, candle2.low],
          size: Math.round(gapSize * 100) / 100,
          sizePercent: Math.round(gapPercent * 100) / 100,
          created: candle1.timestamp,
          createdIndex: i - 1,
          filled: false,
          fillPercent: 0
        });
      }
    }

    // Bearish FVG: candle2.high < candle0.low (gap between)
    if (candle2.high < candle0.low) {
      const gapSize = candle0.low - candle2.high;
      const gapPercent = (gapSize / candle2.high) * 100;

      // Only consider significant gaps (> 0.1%)
      if (gapPercent > 0.1) {
        bearishFVGs.push({
          gap: [candle2.high, candle0.low],
          size: Math.round(gapSize * 100) / 100,
          sizePercent: Math.round(gapPercent * 100) / 100,
          created: candle1.timestamp,
          createdIndex: i - 1,
          filled: false,
          fillPercent: 0
        });
      }
    }
  }

  return { bullishFVGs, bearishFVGs };
}

/**
 * Check if gaps have been filled by subsequent price action
 */
function checkGapFills(fvgs, candles, isBullish) {
  return fvgs.map(fvg => {
    const gapMin = fvg.gap[0];
    const gapMax = fvg.gap[1];
    const gapSize = gapMax - gapMin;

    let maxFill = 0;

    // Check all candles after gap creation
    for (let i = fvg.createdIndex + 2; i < candles.length; i++) {
      const candle = candles[i];

      if (isBullish) {
        // Bullish gap fills when price moves back down into gap
        if (candle.low <= gapMax && candle.low >= gapMin) {
          const fillAmount = gapMax - candle.low;
          const fillPct = (fillAmount / gapSize) * 100;
          maxFill = Math.max(maxFill, fillPct);
        }
        // Fully filled if price closes below gap
        if (candle.close < gapMin) {
          maxFill = 100;
          break;
        }
      } else {
        // Bearish gap fills when price moves back up into gap
        if (candle.high >= gapMin && candle.high <= gapMax) {
          const fillAmount = candle.high - gapMin;
          const fillPct = (fillAmount / gapSize) * 100;
          maxFill = Math.max(maxFill, fillPct);
        }
        // Fully filled if price closes above gap
        if (candle.close > gapMax) {
          maxFill = 100;
          break;
        }
      }
    }

    return {
      ...fvg,
      fillPercent: Math.round(maxFill),
      filled: maxFill >= 90 // Consider filled if >90% filled
    };
  });
}

/**
 * Filter for recent, unfilled gaps
 */
function filterActiveGaps(fvgs, candles, maxAge = 50) {
  const currentIndex = candles.length - 1;

  return fvgs.filter(fvg => {
    const age = currentIndex - fvg.createdIndex;
    return age <= maxAge && !fvg.filled;
  });
}

/**
 * Calculate Fair Value Gap indicator
 */
function calculateFVG(candles) {
  if (!candles || candles.length < 5) {
    return {
      name: 'Fair Value Gap',
      category: 'supportResistance',
      bullishFVGs: [],
      bearishFVGs: [],
      signal: { action: 'HOLD', score: 0, strength: 'NEUTRAL', confidence: 0 }
    };
  }

  const currentPrice = candles[candles.length - 1].close;

  // Detect all FVGs
  const { bullishFVGs, bearishFVGs } = detectFVGs(candles);

  // Check which gaps have been filled
  const bullishWithFills = checkGapFills(bullishFVGs, candles, true);
  const bearishWithFills = checkGapFills(bearishFVGs, candles, false);

  // Filter for active (recent, unfilled) gaps
  const activeBullishFVGs = filterActiveGaps(bullishWithFills, candles);
  const activeBearishFVGs = filterActiveGaps(bearishWithFills, candles);

  // Generate signal
  let score = 0;
  let action = 'HOLD';
  let strength = 'NEUTRAL';
  let confidence = 0;

  // Unfilled bullish FVGs below current price = potential support (bullish)
  for (const fvg of activeBullishFVGs) {
    const gapTop = fvg.gap[1];
    const distance = currentPrice - gapTop;
    const distancePercent = (distance / currentPrice) * 100;

    // Gap is below price and close (within 2%)
    if (distance > 0 && distancePercent <= 2) {
      const gapScore = Math.min(fvg.sizePercent * 10, 75);
      score += gapScore;
      confidence = Math.max(confidence, Math.min(fvg.sizePercent * 15, 85));
    }
  }

  // Unfilled bearish FVGs above current price = potential resistance (bearish)
  for (const fvg of activeBearishFVGs) {
    const gapBottom = fvg.gap[0];
    const distance = gapBottom - currentPrice;
    const distancePercent = (distance / currentPrice) * 100;

    // Gap is above price and close (within 2%)
    if (distance > 0 && distancePercent <= 2) {
      const gapScore = Math.min(fvg.sizePercent * 10, 75);
      score -= gapScore;
      confidence = Math.max(confidence, Math.min(fvg.sizePercent * 15, 85));
    }
  }

  // Cap score
  score = Math.max(-100, Math.min(100, score));

  if (score > 25) {
    action = 'BUY';
    strength = score > 50 ? 'STRONG' : 'MODERATE';
  } else if (score < -25) {
    action = 'SELL';
    strength = score < -50 ? 'STRONG' : 'MODERATE';
  }

  return {
    name: 'Fair Value Gap',
    category: 'supportResistance',
    bullishFVGs: activeBullishFVGs.slice(0, 5), // Limit to 5 most recent
    bearishFVGs: activeBearishFVGs.slice(0, 5),
    signal: {
      action,
      score: Math.round(score),
      strength,
      confidence: Math.round(confidence)
    }
  };
}

module.exports = {
  calculateFVG
};
