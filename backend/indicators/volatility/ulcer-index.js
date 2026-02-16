function calculateUlcerIndex(candles, period = 14) {
  if (!candles || candles.length < period) {
    return {
      signal: { type: 'NEUTRAL', score: 0, strength: 'WEAK', confidence: 0 },
      values: null,
      error: 'Insufficient data for Ulcer Index calculation'
    };
  }

  try {
    const closes = candles.map(c => parseFloat(c.close));
    const ulcerValues = [];

    // Calculate Ulcer Index for each period
    for (let i = period - 1; i < closes.length; i++) {
      const slice = closes.slice(i - period + 1, i + 1);
      const maxClose = Math.max(...slice);

      // Calculate percentage drawdowns
      let sumSquaredDrawdowns = 0;
      for (let j = 0; j < slice.length; j++) {
        const drawdown = ((slice[j] - maxClose) / maxClose) * 100;
        sumSquaredDrawdowns += drawdown * drawdown;
      }

      // Ulcer Index = sqrt(sum of squared drawdowns / period)
      const ulcerIndex = Math.sqrt(sumSquaredDrawdowns / period);
      ulcerValues.push(ulcerIndex);
    }

    if (ulcerValues.length === 0) {
      return {
        signal: { type: 'NEUTRAL', score: 0, strength: 'WEAK', confidence: 0 },
        values: null,
        error: 'Ulcer Index calculation produced no results'
      };
    }

    const currentUlcer = ulcerValues[ulcerValues.length - 1];
    const previousUlcer = ulcerValues.length > 1 ? ulcerValues[ulcerValues.length - 2] : null;

    // Calculate average and standard deviation for context
    const avgUlcer = ulcerValues.reduce((sum, val) => sum + val, 0) / ulcerValues.length;
    const variance = ulcerValues.reduce((sum, val) => sum + Math.pow(val - avgUlcer, 2), 0) / ulcerValues.length;
    const stdDev = Math.sqrt(variance);

    // Generate signal
    let signal = { type: 'NEUTRAL', score: 0, strength: 'WEAK', confidence: 50 };

    // Ulcer Index is a risk indicator, not a directional signal
    // Low Ulcer = low downside risk = favorable for buying
    // High Ulcer = high downside risk = caution
    // This is primarily used for confidence adjustment

    // Calculate relative position
    const zScore = stdDev > 0 ? (currentUlcer - avgUlcer) / stdDev : 0;

    // Very low risk (Ulcer Index below average - 1 std dev)
    if (zScore < -1) {
      signal.type = 'BUY';
      signal.score = 0; // Neutral score, but affects confidence
      signal.strength = 'WEAK';
      signal.confidence = 75; // High confidence due to low risk
      signal.reason = `Very low downside risk (UI: ${currentUlcer.toFixed(2)}) - favorable conditions`;
    }
    // Low risk (Ulcer Index below average)
    else if (currentUlcer < avgUlcer) {
      signal.type = 'NEUTRAL';
      signal.score = 0;
      signal.strength = 'WEAK';
      signal.confidence = 65;
      signal.reason = `Below-average downside risk (UI: ${currentUlcer.toFixed(2)})`;
    }
    // High risk (Ulcer Index above average)
    else if (currentUlcer > avgUlcer && zScore < 1) {
      signal.type = 'NEUTRAL';
      signal.score = 0;
      signal.strength = 'WEAK';
      signal.confidence = 50;
      signal.reason = `Above-average downside risk (UI: ${currentUlcer.toFixed(2)})`;
    }
    // Very high risk (Ulcer Index above average + 1 std dev)
    else if (zScore >= 1) {
      signal.type = 'SELL';
      signal.score = 0; // Neutral score, but low confidence
      signal.strength = 'WEAK';
      signal.confidence = 35; // Low confidence due to high risk
      signal.reason = `Elevated downside risk (UI: ${currentUlcer.toFixed(2)}) - caution advised`;
    }

    // Determine risk level
    let riskLevel = 'NORMAL';
    if (zScore < -1) riskLevel = 'VERY_LOW';
    else if (zScore < 0) riskLevel = 'LOW';
    else if (zScore < 1) riskLevel = 'ELEVATED';
    else riskLevel = 'HIGH';

    // Determine trend
    let trend = 'STABLE';
    if (previousUlcer) {
      const change = ((currentUlcer - previousUlcer) / previousUlcer) * 100;
      if (change > 10) trend = 'INCREASING_RISK';
      else if (change < -10) trend = 'DECREASING_RISK';
    }

    return {
      signal,
      values: {
        ulcerIndex: currentUlcer,
        average: avgUlcer,
        standardDeviation: stdDev,
        zScore: zScore,
        period: period
      },
      riskLevel: riskLevel,
      trend: trend,
      interpretation: currentUlcer < avgUlcer ?
        'Favorable risk environment' :
        'Elevated risk environment',
      history: {
        values: ulcerValues.slice(-20)
      }
    };

  } catch (error) {
    return {
      signal: { type: 'NEUTRAL', score: 0, strength: 'WEAK', confidence: 0 },
      values: null,
      error: `Ulcer Index calculation error: ${error.message}`
    };
  }
}

module.exports = {
  calculateUlcerIndex,
  name: 'Ulcer Index',
  category: 'VOLATILITY',
  description: 'Ulcer Index - Measures downside volatility only, better risk measure than standard deviation'
};
