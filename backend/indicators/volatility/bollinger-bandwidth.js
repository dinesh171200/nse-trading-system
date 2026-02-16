const technicalindicators = require('technicalindicators');

function calculateBollingerBandwidth(candles, period = 20, stdDev = 2) {
  if (!candles || candles.length < period) {
    return {
      signal: { type: 'NEUTRAL', score: 0, strength: 'WEAK', confidence: 0 },
      values: null,
      error: 'Insufficient data for Bollinger Bandwidth calculation'
    };
  }

  try {
    const closes = candles.map(c => parseFloat(c.close));

    // Calculate Bollinger Bands
    const bbInput = {
      values: closes,
      period: period,
      stdDev: stdDev
    };

    const bbResults = technicalindicators.BollingerBands.calculate(bbInput);

    if (!bbResults || bbResults.length === 0) {
      return {
        signal: { type: 'NEUTRAL', score: 0, strength: 'WEAK', confidence: 0 },
        values: null,
        error: 'Bollinger Bands calculation failed'
      };
    }

    // Calculate Bandwidth: (Upper - Lower) / Middle * 100
    const bandwidthValues = [];
    for (const bb of bbResults) {
      const bandwidth = ((bb.upper - bb.lower) / bb.middle) * 100;
      bandwidthValues.push(bandwidth);
    }

    const currentBandwidth = bandwidthValues[bandwidthValues.length - 1];
    const previousBandwidth = bandwidthValues.length > 1 ? bandwidthValues[bandwidthValues.length - 2] : null;

    // Calculate percentile for squeeze detection
    const sortedBW = [...bandwidthValues].sort((a, b) => a - b);
    const percentile = (sortedBW.indexOf(currentBandwidth) / sortedBW.length) * 100;

    // Generate signal
    let signal = { type: 'NEUTRAL', score: 0, strength: 'WEAK', confidence: 50 };

    // Bandwidth interpretation:
    // Very narrow bandwidth (< 20th percentile) = Squeeze (low volatility, breakout imminent)
    // Very wide bandwidth (> 80th percentile) = High volatility, trend in progress

    // Extreme squeeze (bottom 10%)
    if (percentile < 10) {
      signal.type = 'NEUTRAL';
      signal.score = 0;
      signal.strength = 'MODERATE';
      signal.confidence = 70;
      signal.reason = `Extreme squeeze detected (bandwidth ${currentBandwidth.toFixed(2)}%) - major breakout likely`;
    }
    // Squeeze (bottom 20%)
    else if (percentile < 20) {
      signal.type = 'NEUTRAL';
      signal.score = 0;
      signal.strength = 'WEAK';
      signal.confidence = 65;
      signal.reason = `Squeeze detected (bandwidth ${currentBandwidth.toFixed(2)}%) - breakout possible`;
    }
    // Expansion after squeeze (bandwidth increasing from low levels)
    else if (previousBandwidth && percentile < 30 && currentBandwidth > previousBandwidth * 1.15) {
      // Determine direction from price position
      const currentBB = bbResults[bbResults.length - 1];
      const currentPrice = closes[closes.length - 1];

      if (currentPrice > currentBB.middle) {
        signal.type = 'BUY';
        signal.score = 50;
        signal.strength = 'STRONG';
        signal.confidence = 80;
        signal.reason = 'Bandwidth expanding from squeeze - bullish breakout';
      } else {
        signal.type = 'SELL';
        signal.score = -50;
        signal.strength = 'STRONG';
        signal.confidence = 80;
        signal.reason = 'Bandwidth expanding from squeeze - bearish breakout';
      }
    }
    // Very wide bands (top 10%)
    else if (percentile > 90) {
      signal.type = 'NEUTRAL';
      signal.score = 0;
      signal.strength = 'WEAK';
      signal.confidence = 45;
      signal.reason = `Very high volatility (bandwidth ${currentBandwidth.toFixed(2)}%) - trend in progress or reversal near`;
    }
    // Wide bands (top 20%)
    else if (percentile > 80) {
      signal.type = 'NEUTRAL';
      signal.score = 0;
      signal.strength = 'WEAK';
      signal.confidence = 50;
      signal.reason = `High volatility (bandwidth ${currentBandwidth.toFixed(2)}%)`;
    }

    // Determine volatility state
    let volatilityState = 'NORMAL';
    if (percentile < 10) volatilityState = 'EXTREME_SQUEEZE';
    else if (percentile < 20) volatilityState = 'SQUEEZE';
    else if (percentile < 40) volatilityState = 'LOW';
    else if (percentile > 80) volatilityState = 'HIGH';
    else if (percentile > 90) volatilityState = 'EXTREME_HIGH';

    // Determine trend
    let trend = 'STABLE';
    if (previousBandwidth) {
      const change = ((currentBandwidth - previousBandwidth) / previousBandwidth) * 100;
      if (change > 10) trend = 'EXPANDING';
      else if (change < -10) trend = 'CONTRACTING';
    }

    return {
      signal,
      values: {
        bandwidth: currentBandwidth,
        percentile: percentile,
        period: period,
        stdDev: stdDev
      },
      volatilityState: volatilityState,
      trend: trend,
      interpretation: volatilityState === 'EXTREME_SQUEEZE' || volatilityState === 'SQUEEZE' ?
        'Volatility squeeze - breakout imminent' :
        volatilityState === 'EXTREME_HIGH' || volatilityState === 'HIGH' ?
        'High volatility - strong trend or reversal' :
        'Normal volatility',
      history: {
        values: bandwidthValues.slice(-20)
      }
    };

  } catch (error) {
    return {
      signal: { type: 'NEUTRAL', score: 0, strength: 'WEAK', confidence: 0 },
      values: null,
      error: `Bollinger Bandwidth calculation error: ${error.message}`
    };
  }
}

module.exports = {
  calculateBollingerBandwidth,
  name: 'Bollinger Bandwidth',
  category: 'VOLATILITY',
  description: 'Bollinger Band Width - Identifies squeeze conditions (volatility contraction) before breakouts'
};
