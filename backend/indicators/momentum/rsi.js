/**
 * RSI (Relative Strength Index) Indicator
 *
 * RSI is a momentum oscillator that measures the speed and magnitude of price changes.
 * Values range from 0 to 100.
 *
 * Interpretation:
 * - RSI > 70: Overbought (potential sell signal)
 * - RSI < 30: Oversold (potential buy signal)
 * - RSI 50: Neutral
 */

const technicalIndicators = require('technicalindicators');

/**
 * Calculate RSI
 * @param {Array} candles - Array of OHLC candles
 * @param {Number} period - RSI period (default: 14)
 * @returns {Object} RSI data and signal
 */
function calculateRSI(candles, period = 14) {
  try {
    if (!candles || candles.length < period + 1) {
      throw new Error(`Insufficient data. Need at least ${period + 1} candles, got ${candles?.length || 0}`);
    }

    // Extract closing prices
    const closePrices = candles.map(candle => candle.ohlc.close);

    // Calculate RSI using technical indicators library
    const rsiValues = technicalIndicators.RSI.calculate({
      values: closePrices,
      period: period
    });

    if (!rsiValues || rsiValues.length === 0) {
      throw new Error('Failed to calculate RSI');
    }

    // Get the latest RSI value
    const currentRSI = rsiValues[rsiValues.length - 1];
    const previousRSI = rsiValues.length > 1 ? rsiValues[rsiValues.length - 2] : currentRSI;

    // Calculate signal score (-100 to +100)
    const signalScore = calculateSignalScore(currentRSI, previousRSI);

    // Determine signal interpretation
    const interpretation = getInterpretation(currentRSI);

    // Get trend
    const trend = currentRSI > previousRSI ? 'RISING' : currentRSI < previousRSI ? 'FALLING' : 'FLAT';

    // Detect divergence (basic)
    const divergence = detectDivergence(candles, rsiValues);

    return {
      name: 'RSI',
      category: 'momentum',
      weight: 0.25, // 25% weight in momentum category

      value: currentRSI,
      previousValue: previousRSI,
      period: period,

      interpretation: interpretation,
      trend: trend,
      divergence: divergence,

      signal: {
        action: getSignalAction(currentRSI, trend),
        score: signalScore,
        strength: getSignalStrength(Math.abs(signalScore)),
        confidence: calculateConfidence(currentRSI, trend)
      },

      levels: {
        overbought: 70,
        oversold: 30,
        neutral: 50,
        current: currentRSI
      },

      metadata: {
        timestamp: new Date(),
        candlesUsed: candles.length,
        dataPoints: rsiValues.length
      }
    };

  } catch (error) {
    throw new Error(`RSI calculation failed: ${error.message}`);
  }
}

/**
 * Calculate signal score based on RSI value
 * @param {Number} rsi - Current RSI value
 * @param {Number} previousRSI - Previous RSI value
 * @returns {Number} Score from -100 (strong sell) to +100 (strong buy)
 */
function calculateSignalScore(rsi, previousRSI) {
  let score = 0;

  // Base score on RSI level
  if (rsi < 30) {
    // Oversold - bullish
    score = 100 - (rsi * 2); // RSI 0 = +100, RSI 30 = +40
  } else if (rsi > 70) {
    // Overbought - bearish
    score = -100 + ((100 - rsi) * 2); // RSI 100 = -100, RSI 70 = -40
  } else {
    // Neutral zone (30-70)
    // Normalize to -40 to +40 range
    score = ((rsi - 50) / 20) * 40; // Linear scale in neutral zone
  }

  // Adjust for trend
  const trendAdjustment = (rsi - previousRSI) * 2; // Amplify trend impact
  score += trendAdjustment;

  // Clamp to -100 to +100
  return Math.max(-100, Math.min(100, score));
}

/**
 * Get interpretation of RSI value
 */
function getInterpretation(rsi) {
  if (rsi >= 80) return 'EXTREMELY_OVERBOUGHT';
  if (rsi >= 70) return 'OVERBOUGHT';
  if (rsi >= 60) return 'SLIGHTLY_OVERBOUGHT';
  if (rsi >= 40) return 'NEUTRAL';
  if (rsi >= 30) return 'SLIGHTLY_OVERSOLD';
  if (rsi >= 20) return 'OVERSOLD';
  return 'EXTREMELY_OVERSOLD';
}

/**
 * Get signal action
 */
function getSignalAction(rsi, trend) {
  if (rsi < 30 && trend === 'RISING') return 'STRONG_BUY';
  if (rsi < 30) return 'BUY';
  if (rsi > 70 && trend === 'FALLING') return 'STRONG_SELL';
  if (rsi > 70) return 'SELL';
  if (rsi < 40) return 'WEAK_BUY';
  if (rsi > 60) return 'WEAK_SELL';
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
function calculateConfidence(rsi, trend) {
  let confidence = 50; // Base confidence

  // Higher confidence at extremes
  if (rsi < 30 || rsi > 70) {
    confidence += 20;
  }

  // Higher confidence with confirming trend
  if ((rsi < 30 && trend === 'RISING') || (rsi > 70 && trend === 'FALLING')) {
    confidence += 20;
  }

  // Lower confidence in neutral zone
  if (rsi >= 40 && rsi <= 60) {
    confidence -= 20;
  }

  return Math.max(0, Math.min(100, confidence));
}

/**
 * Detect basic divergence
 */
function detectDivergence(candles, rsiValues) {
  if (candles.length < 10 || rsiValues.length < 10) {
    return { detected: false, type: null };
  }

  const recentCandles = candles.slice(-10);
  const recentRSI = rsiValues.slice(-10);

  // Check for bullish divergence (price making lower lows, RSI making higher lows)
  const priceLL = recentCandles[recentCandles.length - 1].ohlc.low < recentCandles[0].ohlc.low;
  const rsiHL = recentRSI[recentRSI.length - 1] > recentRSI[0];

  if (priceLL && rsiHL) {
    return { detected: true, type: 'BULLISH', strength: 'MODERATE' };
  }

  // Check for bearish divergence (price making higher highs, RSI making lower highs)
  const priceHH = recentCandles[recentCandles.length - 1].ohlc.high > recentCandles[0].ohlc.high;
  const rsiLH = recentRSI[recentRSI.length - 1] < recentRSI[0];

  if (priceHH && rsiLH) {
    return { detected: true, type: 'BEARISH', strength: 'MODERATE' };
  }

  return { detected: false, type: null };
}

/**
 * Calculate RSI for multiple periods
 */
function calculateMultiPeriodRSI(candles) {
  const periods = [9, 14, 21];
  const results = {};

  for (const period of periods) {
    try {
      results[`RSI_${period}`] = calculateRSI(candles, period);
    } catch (error) {
      results[`RSI_${period}`] = { error: error.message };
    }
  }

  return results;
}

module.exports = {
  calculateRSI,
  calculateMultiPeriodRSI,
  metadata: {
    name: 'Relative Strength Index (RSI)',
    category: 'momentum',
    description: 'Momentum oscillator that measures speed and magnitude of price changes',
    defaultPeriod: 14,
    range: { min: 0, max: 100 },
    signals: {
      overbought: 70,
      oversold: 30,
      neutral: 50
    }
  }
};
