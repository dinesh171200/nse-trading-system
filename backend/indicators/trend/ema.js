/**
 * EMA (Exponential Moving Average) Indicator
 *
 * EMA is a trend-following indicator that gives more weight to recent prices.
 * It responds more quickly to price changes than Simple Moving Average (SMA).
 *
 * Common periods:
 * - Short-term: 9, 12, 20
 * - Medium-term: 26, 50
 * - Long-term: 100, 200
 *
 * Trading signals:
 * - Price above EMA: Bullish
 * - Price below EMA: Bearish
 * - EMA crossovers: Buy/Sell signals
 * - EMA slope: Trend strength
 */

const technicalIndicators = require('technicalindicators');

/**
 * Calculate EMA
 * @param {Array} candles - Array of OHLC candles
 * @param {Number} period - EMA period (default: 20)
 * @returns {Object} EMA data and signal
 */
function calculateEMA(candles, period = 20) {
  try {
    if (!candles || candles.length < period) {
      throw new Error(`Insufficient data. Need at least ${period} candles, got ${candles?.length || 0}`);
    }

    // Extract closing prices
    const closePrices = candles.map(candle => candle.ohlc.close);

    // Calculate EMA using technical indicators library
    const emaValues = technicalIndicators.EMA.calculate({
      values: closePrices,
      period: period
    });

    if (!emaValues || emaValues.length === 0) {
      throw new Error('Failed to calculate EMA');
    }

    // Get current values
    const currentEMA = emaValues[emaValues.length - 1];
    const previousEMA = emaValues.length > 1 ? emaValues[emaValues.length - 2] : currentEMA;
    const currentPrice = closePrices[closePrices.length - 1];
    const previousPrice = closePrices[closePrices.length - 2];

    // Calculate distance from EMA (in percentage)
    const distancePercent = ((currentPrice - currentEMA) / currentEMA) * 100;

    // Calculate EMA slope (rate of change)
    const emaSlope = currentEMA - previousEMA;
    const emaSlopePercent = (emaSlope / previousEMA) * 100;

    // Determine trend
    const trend = emaSlope > 0 ? 'RISING' : emaSlope < 0 ? 'FALLING' : 'FLAT';

    // Calculate signal score (-100 to +100)
    const signalScore = calculateSignalScore(currentPrice, currentEMA, previousPrice, previousEMA, trend, distancePercent);

    // Determine position relative to EMA
    const position = currentPrice > currentEMA ? 'ABOVE' : currentPrice < currentEMA ? 'BELOW' : 'ON';

    return {
      name: `EMA_${period}`,
      category: 'trend',
      weight: 0.30, // 30% weight in trend category

      value: currentEMA,
      previousValue: previousEMA,
      period: period,
      currentPrice: currentPrice,

      position: position, // ABOVE, BELOW, ON
      distancePercent: distancePercent,

      slope: {
        value: emaSlope,
        percent: emaSlopePercent,
        trend: trend
      },

      signal: {
        action: getSignalAction(position, trend, distancePercent),
        score: signalScore,
        strength: getSignalStrength(Math.abs(signalScore)),
        confidence: calculateConfidence(position, trend, distancePercent)
      },

      metadata: {
        timestamp: new Date(),
        candlesUsed: candles.length,
        dataPoints: emaValues.length
      }
    };

  } catch (error) {
    throw new Error(`EMA calculation failed: ${error.message}`);
  }
}

/**
 * Calculate signal score based on price position relative to EMA
 * @returns {Number} Score from -100 (strong sell) to +100 (strong buy)
 */
function calculateSignalScore(currentPrice, currentEMA, previousPrice, previousEMA, trend, distancePercent) {
  let score = 0;

  // Base score on position relative to EMA
  if (currentPrice > currentEMA) {
    // Price above EMA - bullish
    score = 50 + Math.min(50, Math.abs(distancePercent) * 10); // Up to +100
  } else if (currentPrice < currentEMA) {
    // Price below EMA - bearish
    score = -50 - Math.min(50, Math.abs(distancePercent) * 10); // Down to -100
  }

  // Adjust for crossover
  const previousAbove = previousPrice > previousEMA;
  const currentAbove = currentPrice > currentEMA;

  if (!previousAbove && currentAbove) {
    // Bullish crossover (golden cross for longer periods)
    score += 30;
  } else if (previousAbove && !currentAbove) {
    // Bearish crossover (death cross for longer periods)
    score -= 30;
  }

  // Adjust for EMA trend
  if (trend === 'RISING') {
    score += 20; // Uptrend confirmation
  } else if (trend === 'FALLING') {
    score -= 20; // Downtrend confirmation
  }

  // Clamp to -100 to +100
  return Math.max(-100, Math.min(100, score));
}

/**
 * Get signal action based on price position and trend
 */
function getSignalAction(position, trend, distancePercent) {
  // Strong signals
  if (position === 'ABOVE' && trend === 'RISING' && distancePercent > 1) {
    return 'STRONG_BUY';
  }
  if (position === 'BELOW' && trend === 'FALLING' && distancePercent < -1) {
    return 'STRONG_SELL';
  }

  // Crossover signals
  if (position === 'ABOVE' && Math.abs(distancePercent) < 0.5) {
    return 'BUY'; // Just crossed above
  }
  if (position === 'BELOW' && Math.abs(distancePercent) < 0.5) {
    return 'SELL'; // Just crossed below
  }

  // Weak signals
  if (position === 'ABOVE' && trend === 'RISING') {
    return 'WEAK_BUY';
  }
  if (position === 'BELOW' && trend === 'FALLING') {
    return 'WEAK_SELL';
  }

  // Neutral
  return 'HOLD';
}

/**
 * Get signal strength
 */
function getSignalStrength(absScore) {
  if (absScore >= 80) return 'VERY_STRONG';
  if (absScore >= 60) return 'STRONG';
  if (absScore >= 40) return 'MODERATE';
  if (absScore >= 20) return 'WEAK';
  return 'VERY_WEAK';
}

/**
 * Calculate confidence level
 */
function calculateConfidence(position, trend, distancePercent) {
  let confidence = 50; // Base confidence

  // Higher confidence with clear positioning
  if (Math.abs(distancePercent) > 2) {
    confidence += 20; // Well separated from EMA
  }

  // Higher confidence with confirming trend
  if ((position === 'ABOVE' && trend === 'RISING') ||
      (position === 'BELOW' && trend === 'FALLING')) {
    confidence += 20;
  }

  // Lower confidence near EMA (potential whipsaw)
  if (Math.abs(distancePercent) < 0.2) {
    confidence -= 20;
  }

  return Math.max(0, Math.min(100, confidence));
}

/**
 * Calculate multiple EMAs at once
 * Common periods: 9, 12, 20, 26, 50, 100, 200
 */
function calculateMultipleEMAs(candles, periods = [9, 12, 20, 26, 50]) {
  const results = {};

  for (const period of periods) {
    try {
      if (candles.length >= period) {
        results[`EMA_${period}`] = calculateEMA(candles, period);
      } else {
        results[`EMA_${period}`] = {
          error: `Insufficient data (need ${period}, have ${candles.length})`
        };
      }
    } catch (error) {
      results[`EMA_${period}`] = { error: error.message };
    }
  }

  return results;
}

/**
 * Detect EMA crossovers between two periods
 * @param {Array} candles - OHLC candles
 * @param {Number} fastPeriod - Fast EMA period (e.g., 12)
 * @param {Number} slowPeriod - Slow EMA period (e.g., 26)
 * @returns {Object} Crossover analysis
 */
function detectEMACrossover(candles, fastPeriod = 12, slowPeriod = 26) {
  try {
    if (candles.length < Math.max(fastPeriod, slowPeriod) + 2) {
      throw new Error('Insufficient data for crossover detection');
    }

    const fastEMA = calculateEMA(candles, fastPeriod);
    const slowEMA = calculateEMA(candles, slowPeriod);

    const currentFast = fastEMA.value;
    const currentSlow = slowEMA.value;
    const previousFast = fastEMA.previousValue;
    const previousSlow = slowEMA.previousValue;

    const currentAbove = currentFast > currentSlow;
    const previousAbove = previousFast > previousSlow;

    let crossover = null;
    let signal = 'NONE';

    if (!previousAbove && currentAbove) {
      crossover = 'GOLDEN_CROSS'; // Bullish
      signal = 'BUY';
    } else if (previousAbove && !currentAbove) {
      crossover = 'DEATH_CROSS'; // Bearish
      signal = 'SELL';
    }

    const separation = ((currentFast - currentSlow) / currentSlow) * 100;

    return {
      crossover: crossover,
      signal: signal,
      fastEMA: currentFast,
      slowEMA: currentSlow,
      separation: separation,
      separationPercent: Math.abs(separation),
      trend: currentFast > currentSlow ? 'BULLISH' : 'BEARISH',
      strength: Math.abs(separation) > 1 ? 'STRONG' : Math.abs(separation) > 0.5 ? 'MODERATE' : 'WEAK'
    };

  } catch (error) {
    throw new Error(`Crossover detection failed: ${error.message}`);
  }
}

/**
 * Calculate EMA ribbon (multiple EMAs for trend visualization)
 * @param {Array} candles - OHLC candles
 * @param {Array} periods - Array of EMA periods
 * @returns {Object} EMA ribbon data
 */
function calculateEMARibbon(candles, periods = [9, 12, 20, 26, 50]) {
  const emas = calculateMultipleEMAs(candles, periods);

  // Check if EMAs are aligned (all rising or all falling)
  const values = Object.values(emas)
    .filter(ema => !ema.error)
    .map(ema => ema.value);

  const isAscending = values.every((val, i) => i === 0 || val >= values[i - 1]);
  const isDescending = values.every((val, i) => i === 0 || val <= values[i - 1]);

  let alignment = 'MIXED';
  let trend = 'NEUTRAL';

  if (isAscending) {
    alignment = 'BULLISH_ALIGNED';
    trend = 'STRONG_UPTREND';
  } else if (isDescending) {
    alignment = 'BEARISH_ALIGNED';
    trend = 'STRONG_DOWNTREND';
  }

  return {
    emas: emas,
    alignment: alignment,
    trend: trend,
    count: values.length
  };
}

module.exports = {
  calculateEMA,
  calculateMultipleEMAs,
  detectEMACrossover,
  calculateEMARibbon,
  metadata: {
    name: 'Exponential Moving Average (EMA)',
    category: 'trend',
    description: 'Trend-following indicator that gives more weight to recent prices',
    commonPeriods: [9, 12, 20, 26, 50, 100, 200],
    signals: {
      above: 'Bullish (price above EMA)',
      below: 'Bearish (price below EMA)',
      goldenCross: 'Fast EMA crosses above slow EMA (bullish)',
      deathCross: 'Fast EMA crosses below slow EMA (bearish)'
    }
  }
};
