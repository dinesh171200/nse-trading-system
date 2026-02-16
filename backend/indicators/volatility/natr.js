const technicalindicators = require('technicalindicators');

function calculateNATR(candles, period = 14) {
  if (!candles || candles.length < period) {
    return {
      signal: { type: 'NEUTRAL', score: 0, strength: 'WEAK', confidence: 0 },
      values: null,
      error: 'Insufficient data for NATR calculation'
    };
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

    const atrValues = technicalindicators.ATR.calculate(atrInput);

    if (!atrValues || atrValues.length === 0) {
      return {
        signal: { type: 'NEUTRAL', score: 0, strength: 'WEAK', confidence: 0 },
        values: null,
        error: 'ATR calculation failed'
      };
    }

    // Calculate NATR: (ATR / Close) * 100
    const natrValues = [];
    const startIndex = closes.length - atrValues.length;

    for (let i = 0; i < atrValues.length; i++) {
      const closePrice = closes[startIndex + i];
      const natr = (atrValues[i] / closePrice) * 100;
      natrValues.push(natr);
    }

    const currentNATR = natrValues[natrValues.length - 1];
    const previousNATR = natrValues.length > 1 ? natrValues[natrValues.length - 2] : null;

    // Calculate average for context
    const avgNATR = natrValues.reduce((sum, val) => sum + val, 0) / natrValues.length;
    const variance = natrValues.reduce((sum, val) => sum + Math.pow(val - avgNATR, 2), 0) / natrValues.length;
    const stdDev = Math.sqrt(variance);

    // Generate signal (NATR is primarily for volatility classification)
    let signal = { type: 'NEUTRAL', score: 0, strength: 'WEAK', confidence: 50 };

    const zScore = stdDev > 0 ? (currentNATR - avgNATR) / stdDev : 0;

    // NATR interpretation:
    // Low NATR = Low volatility (consolidation, potential breakout setup)
    // High NATR = High volatility (trending market or high risk)

    // Very low volatility (potential breakout setup)
    if (zScore < -1.5) {
      signal.type = 'NEUTRAL';
      signal.score = 0;
      signal.strength = 'WEAK';
      signal.confidence = 60;
      signal.reason = `Very low volatility (${currentNATR.toFixed(2)}%) - consolidation, breakout possible`;
    }
    // Low volatility
    else if (currentNATR < avgNATR) {
      signal.type = 'NEUTRAL';
      signal.score = 0;
      signal.strength = 'WEAK';
      signal.confidence = 55;
      signal.reason = `Below-average volatility (${currentNATR.toFixed(2)}%)`;
    }
    // High volatility
    else if (currentNATR > avgNATR) {
      signal.type = 'NEUTRAL';
      signal.score = 0;
      signal.strength = 'WEAK';
      signal.confidence = 50;
      signal.reason = `Above-average volatility (${currentNATR.toFixed(2)}%)`;
    }

    // Determine volatility level
    let volatilityLevel = 'NORMAL';
    if (zScore < -1.5) volatilityLevel = 'VERY_LOW';
    else if (zScore < -0.5) volatilityLevel = 'LOW';
    else if (zScore < 1) volatilityLevel = 'NORMAL';
    else if (zScore < 2) volatilityLevel = 'HIGH';
    else volatilityLevel = 'VERY_HIGH';

    // Determine trend
    let trend = 'STABLE';
    if (previousNATR) {
      const change = ((currentNATR - previousNATR) / previousNATR) * 100;
      if (change > 15) trend = 'EXPANDING';
      else if (change < -15) trend = 'CONTRACTING';
    }

    return {
      signal,
      values: {
        natr: currentNATR,
        average: avgNATR,
        standardDeviation: stdDev,
        zScore: zScore,
        period: period
      },
      volatilityLevel: volatilityLevel,
      trend: trend,
      interpretation: volatilityLevel === 'VERY_LOW' ?
        'Low volatility - consolidation phase' :
        volatilityLevel === 'VERY_HIGH' ?
        'High volatility - trending or unstable' :
        'Normal volatility',
      history: {
        values: natrValues.slice(-20)
      }
    };

  } catch (error) {
    return {
      signal: { type: 'NEUTRAL', score: 0, strength: 'WEAK', confidence: 0 },
      values: null,
      error: `NATR calculation error: ${error.message}`
    };
  }
}

module.exports = {
  calculateNATR,
  name: 'NATR',
  category: 'VOLATILITY',
  description: 'Normalized Average True Range - ATR as percentage of price, comparable across different securities'
};
