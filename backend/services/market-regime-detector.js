const technicalindicators = require('technicalindicators');

/**
 * Market Regime Detector
 * Detects current market state to enable dynamic indicator weighting
 *
 * Regimes:
 * - STRONG_TRENDING: ADX > 30, Choppiness < 50
 * - WEAK_TRENDING: ADX 20-30, Choppiness 50-61.8
 * - RANGING: ADX < 20, Choppiness > 61.8
 *
 * Volatility:
 * - HIGH: ATR% > avg + 1 std dev
 * - NORMAL: Within 1 std dev of average
 * - LOW: ATR% < avg - 1 std dev
 */

function detectMarketRegime(candles, indicators = null) {
  if (!candles || candles.length < 50) {
    return {
      regime: 'UNKNOWN',
      volatility: 'UNKNOWN',
      confidence: 0,
      details: {
        error: 'Insufficient data for regime detection'
      }
    };
  }

  try {
    // 1. Calculate ADX for trend strength
    const adxValue = calculateADX(candles);

    // 2. Calculate Choppiness Index
    const choppiness = calculateChoppiness(candles);

    // 3. Calculate volatility (ATR as % of price)
    const volatilityMetrics = calculateVolatility(candles);

    // 4. Determine regime
    let regime = 'UNKNOWN';
    let regimeConfidence = 0;

    if (adxValue !== null && choppiness !== null) {
      if (adxValue > 30 && choppiness < 50) {
        regime = 'STRONG_TRENDING';
        regimeConfidence = Math.min(100, 60 + (adxValue - 30) + (50 - choppiness));
      } else if (adxValue >= 20 && adxValue <= 30 && choppiness >= 50 && choppiness <= 61.8) {
        regime = 'WEAK_TRENDING';
        regimeConfidence = 60;
      } else if (adxValue < 20 && choppiness > 61.8) {
        regime = 'RANGING';
        regimeConfidence = Math.min(100, 60 + (20 - adxValue) + (choppiness - 61.8));
      } else {
        // Mixed signals - determine primary factor
        if (adxValue > 25) {
          regime = 'WEAK_TRENDING';
          regimeConfidence = 50;
        } else if (choppiness > 61.8) {
          regime = 'RANGING';
          regimeConfidence = 50;
        } else {
          regime = 'WEAK_TRENDING';
          regimeConfidence = 40;
        }
      }
    }

    // 5. Determine volatility level
    let volatility = 'NORMAL';
    let volatilityConfidence = 50;

    if (volatilityMetrics.zScore !== null) {
      if (volatilityMetrics.zScore > 1.5) {
        volatility = 'VERY_HIGH';
        volatilityConfidence = 90;
      } else if (volatilityMetrics.zScore > 1) {
        volatility = 'HIGH';
        volatilityConfidence = 80;
      } else if (volatilityMetrics.zScore > 0.5) {
        volatility = 'ELEVATED';
        volatilityConfidence = 70;
      } else if (volatilityMetrics.zScore < -1.5) {
        volatility = 'VERY_LOW';
        volatilityConfidence = 90;
      } else if (volatilityMetrics.zScore < -1) {
        volatility = 'LOW';
        volatilityConfidence = 80;
      } else {
        volatility = 'NORMAL';
        volatilityConfidence = 60;
      }
    }

    // 6. Calculate overall confidence
    const overallConfidence = Math.round((regimeConfidence + volatilityConfidence) / 2);

    return {
      regime,
      volatility,
      confidence: overallConfidence,
      details: {
        adx: adxValue,
        choppiness: choppiness,
        atrPercent: volatilityMetrics.atrPercent,
        atrZScore: volatilityMetrics.zScore,
        interpretation: getInterpretation(regime, volatility)
      },
      weightAdjustments: getWeightAdjustments(regime, volatility)
    };

  } catch (error) {
    return {
      regime: 'UNKNOWN',
      volatility: 'UNKNOWN',
      confidence: 0,
      details: {
        error: `Regime detection error: ${error.message}`
      }
    };
  }
}

function calculateADX(candles, period = 14) {
  if (candles.length < period + 1) return null;

  try {
    const highs = candles.map(c => parseFloat(c.high));
    const lows = candles.map(c => parseFloat(c.low));
    const closes = candles.map(c => parseFloat(c.close));

    const adxInput = {
      high: highs,
      low: lows,
      close: closes,
      period: period
    };

    const adxResults = technicalindicators.ADX.calculate(adxInput);

    if (adxResults && adxResults.length > 0) {
      return adxResults[adxResults.length - 1].adx;
    }

    return null;
  } catch (error) {
    return null;
  }
}

function calculateChoppiness(candles, period = 14) {
  if (candles.length < period) return null;

  try {
    const highs = candles.map(c => parseFloat(c.high));
    const lows = candles.map(c => parseFloat(c.low));
    const closes = candles.map(c => parseFloat(c.close));

    // Calculate ATR for the period
    const atrInput = {
      high: highs.slice(-period - 1),
      low: lows.slice(-period - 1),
      close: closes.slice(-period - 1),
      period: 1
    };

    const atrResults = technicalindicators.ATR.calculate(atrInput);
    const sumATR = atrResults.slice(-period).reduce((sum, val) => sum + val, 0);

    // Calculate highest high and lowest low over period
    const recentHighs = highs.slice(-period);
    const recentLows = lows.slice(-period);
    const highestHigh = Math.max(...recentHighs);
    const lowestLow = Math.min(...recentLows);

    // Choppiness Index formula
    const choppiness = 100 * Math.log10(sumATR / (highestHigh - lowestLow)) / Math.log10(period);

    return choppiness;
  } catch (error) {
    return null;
  }
}

function calculateVolatility(candles, period = 14) {
  if (candles.length < period * 2) {
    return { atrPercent: null, zScore: null };
  }

  try {
    const highs = candles.map(c => parseFloat(c.high));
    const lows = candles.map(c => parseFloat(c.low));
    const closes = candles.map(c => parseFloat(c.close));

    // Calculate ATR
    const atrInput = {
      high: highs,
      low: lows,
      close: closes,
      period: period
    };

    const atrResults = technicalindicators.ATR.calculate(atrInput);

    if (!atrResults || atrResults.length === 0) {
      return { atrPercent: null, zScore: null };
    }

    // Calculate ATR as percentage of price
    const atrPercentages = [];
    const startIndex = closes.length - atrResults.length;

    for (let i = 0; i < atrResults.length; i++) {
      const closePrice = closes[startIndex + i];
      const atrPercent = (atrResults[i] / closePrice) * 100;
      atrPercentages.push(atrPercent);
    }

    const currentATRPercent = atrPercentages[atrPercentages.length - 1];

    // Calculate z-score (standard deviations from mean)
    const mean = atrPercentages.reduce((sum, val) => sum + val, 0) / atrPercentages.length;
    const variance = atrPercentages.reduce((sum, val) => sum + Math.pow(val - mean, 2), 0) / atrPercentages.length;
    const stdDev = Math.sqrt(variance);

    const zScore = stdDev > 0 ? (currentATRPercent - mean) / stdDev : 0;

    return {
      atrPercent: currentATRPercent,
      zScore: zScore,
      mean: mean,
      stdDev: stdDev
    };
  } catch (error) {
    return { atrPercent: null, zScore: null };
  }
}

function getInterpretation(regime, volatility) {
  const regimeDescriptions = {
    STRONG_TRENDING: 'Market showing strong directional movement',
    WEAK_TRENDING: 'Market showing weak directional bias',
    RANGING: 'Market moving sideways without clear direction',
    UNKNOWN: 'Unable to determine market regime'
  };

  const volatilityDescriptions = {
    VERY_HIGH: 'extremely high volatility',
    HIGH: 'high volatility',
    ELEVATED: 'elevated volatility',
    NORMAL: 'normal volatility',
    LOW: 'low volatility',
    VERY_LOW: 'extremely low volatility',
    UNKNOWN: 'unknown volatility'
  };

  return `${regimeDescriptions[regime]} with ${volatilityDescriptions[volatility]}`;
}

function getWeightAdjustments(regime, volatility) {
  // Base weights (from constants)
  const baseWeights = {
    TREND: 0.28,
    MOMENTUM: 0.25,
    VOLUME: 0.15,
    VOLATILITY: 0.10,
    SUPPORT_RESISTANCE: 0.15,
    PATTERNS: 0.07
  };

  let adjustments = { ...baseWeights };

  // Regime-based adjustments
  if (regime === 'STRONG_TRENDING') {
    adjustments.TREND *= 1.25;           // +25%
    adjustments.MOMENTUM *= 1.12;        // +12%
    adjustments.VOLUME *= 1.20;          // +20%
    adjustments.SUPPORT_RESISTANCE *= 0.67;  // -33%
    adjustments.VOLATILITY *= 0.60;      // -40%
    adjustments.PATTERNS *= 0.85;        // -15%
  } else if (regime === 'RANGING') {
    adjustments.SUPPORT_RESISTANCE *= 1.67;  // +67%
    adjustments.VOLATILITY *= 1.50;      // +50%
    adjustments.MOMENTUM *= 1.12;        // +12%
    adjustments.TREND *= 0.71;           // -29%
    adjustments.VOLUME *= 0.67;          // -33%
    adjustments.PATTERNS *= 1.14;        // +14%
  } else if (regime === 'WEAK_TRENDING') {
    // Balanced approach - slight emphasis on trend
    adjustments.TREND *= 1.10;
    adjustments.MOMENTUM *= 1.05;
    adjustments.SUPPORT_RESISTANCE *= 1.10;
  }

  // Volatility-based adjustments (additional)
  if (volatility === 'HIGH' || volatility === 'VERY_HIGH') {
    adjustments.VOLATILITY *= 1.50;      // +50% for high volatility
    adjustments.VOLUME *= 1.20;          // +20%
    adjustments.MOMENTUM *= 0.90;        // -10% (momentum less reliable in high vol)
  } else if (volatility === 'LOW' || volatility === 'VERY_LOW') {
    adjustments.VOLATILITY *= 0.80;      // -20% for low volatility
    adjustments.TREND *= 1.10;           // +10%
  }

  // Normalize weights to sum to 1.0
  const totalWeight = Object.values(adjustments).reduce((sum, w) => sum + w, 0);
  for (const key in adjustments) {
    adjustments[key] = adjustments[key] / totalWeight;
  }

  return adjustments;
}

module.exports = {
  detectMarketRegime,
  calculateADX,
  calculateChoppiness,
  calculateVolatility
};
