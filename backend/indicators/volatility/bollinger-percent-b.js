const technicalindicators = require('technicalindicators');

function calculateBollingerPercentB(candles, period = 20, stdDev = 2) {
  if (!candles || candles.length < period) {
    return {
      signal: { type: 'NEUTRAL', score: 0, strength: 'WEAK', confidence: 0 },
      values: null,
      error: 'Insufficient data for Bollinger %B calculation'
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

    // Calculate %B: (Close - Lower) / (Upper - Lower)
    const percentBValues = [];
    const startIndex = closes.length - bbResults.length;

    for (let i = 0; i < bbResults.length; i++) {
      const closePrice = closes[startIndex + i];
      const bb = bbResults[i];
      const bandwidth = bb.upper - bb.lower;

      if (bandwidth === 0) {
        percentBValues.push(0.5); // Middle of band
      } else {
        const percentB = (closePrice - bb.lower) / bandwidth;
        percentBValues.push(percentB);
      }
    }

    const currentPercentB = percentBValues[percentBValues.length - 1];
    const previousPercentB = percentBValues.length > 1 ? percentBValues[percentBValues.length - 2] : null;

    // Convert to percentage for easier interpretation
    const percentBPercent = currentPercentB * 100;

    // Generate signal
    let signal = { type: 'NEUTRAL', score: 0, strength: 'WEAK', confidence: 50 };

    // %B interpretation:
    // > 1.0 = Price above upper band (overbought, but can continue in strong trends)
    // 0.8-1.0 = Approaching upper band (strong buying)
    // 0.5 = At middle band (neutral)
    // 0.2-0.0 = Approaching lower band (strong selling)
    // < 0.0 = Price below lower band (oversold, but can continue in strong trends)

    // Extreme overbought (> 1.0)
    if (currentPercentB > 1.0) {
      signal.type = 'SELL';
      signal.score = Math.round(-40 - Math.min(20, (currentPercentB - 1.0) * 100));
      signal.strength = 'MODERATE';
      signal.confidence = 70;
      signal.reason = `Price above upper BB (${percentBPercent.toFixed(1)}%) - extreme overbought`;
    }
    // Strong overbought (0.8-1.0)
    else if (currentPercentB >= 0.8) {
      signal.type = 'SELL';
      signal.score = -30;
      signal.strength = 'MODERATE';
      signal.confidence = 65;
      signal.reason = `Price near upper BB (${percentBPercent.toFixed(1)}%) - overbought`;
    }
    // Upper zone (0.6-0.8) - bullish but approaching resistance
    else if (currentPercentB >= 0.6) {
      signal.type = 'BUY';
      signal.score = 20;
      signal.strength = 'WEAK';
      signal.confidence = 60;
      signal.reason = `Price in upper BB zone (${percentBPercent.toFixed(1)}%) - bullish`;
    }
    // Middle zone (0.4-0.6) - neutral
    else if (currentPercentB >= 0.4) {
      signal.type = 'NEUTRAL';
      signal.score = 0;
      signal.strength = 'WEAK';
      signal.confidence = 50;
      signal.reason = `Price near BB middle (${percentBPercent.toFixed(1)}%) - neutral`;
    }
    // Lower zone (0.2-0.4) - bearish but approaching support
    else if (currentPercentB >= 0.2) {
      signal.type = 'SELL';
      signal.score = -20;
      signal.strength = 'WEAK';
      signal.confidence = 60;
      signal.reason = `Price in lower BB zone (${percentBPercent.toFixed(1)}%) - bearish`;
    }
    // Strong oversold (0-0.2)
    else if (currentPercentB >= 0) {
      signal.type = 'BUY';
      signal.score = 30;
      signal.strength = 'MODERATE';
      signal.confidence = 65;
      signal.reason = `Price near lower BB (${percentBPercent.toFixed(1)}%) - oversold`;
    }
    // Extreme oversold (< 0)
    else {
      signal.type = 'BUY';
      signal.score = Math.round(40 + Math.min(20, Math.abs(currentPercentB) * 100));
      signal.strength = 'MODERATE';
      signal.confidence = 70;
      signal.reason = `Price below lower BB (${percentBPercent.toFixed(1)}%) - extreme oversold`;
    }

    // Check for band walk (strong trend indicator)
    if (percentBValues.length >= 5) {
      const recent5 = percentBValues.slice(-5);

      // Upper band walk (all > 0.8)
      const upperBandWalk = recent5.every(val => val > 0.8);
      if (upperBandWalk) {
        signal.type = 'BUY';
        signal.score = 35;
        signal.strength = 'MODERATE';
        signal.confidence = 75;
        signal.reason = 'Upper band walk detected - strong uptrend';
      }

      // Lower band walk (all < 0.2)
      const lowerBandWalk = recent5.every(val => val < 0.2);
      if (lowerBandWalk) {
        signal.type = 'SELL';
        signal.score = -35;
        signal.strength = 'MODERATE';
        signal.confidence = 75;
        signal.reason = 'Lower band walk detected - strong downtrend';
      }
    }

    // Determine position
    let position = 'MIDDLE';
    if (currentPercentB > 1.0) position = 'ABOVE_UPPER';
    else if (currentPercentB >= 0.8) position = 'UPPER';
    else if (currentPercentB >= 0.6) position = 'UPPER_MIDDLE';
    else if (currentPercentB >= 0.4) position = 'MIDDLE';
    else if (currentPercentB >= 0.2) position = 'LOWER_MIDDLE';
    else if (currentPercentB >= 0) position = 'LOWER';
    else position = 'BELOW_LOWER';

    return {
      signal,
      values: {
        percentB: currentPercentB,
        percentBPercent: percentBPercent,
        period: period,
        stdDev: stdDev
      },
      position: position,
      interpretation: currentPercentB > 1.0 ?
        'Extreme overbought - above upper band' :
        currentPercentB < 0 ?
        'Extreme oversold - below lower band' :
        currentPercentB > 0.5 ?
        'Above midline - bullish bias' :
        'Below midline - bearish bias',
      history: {
        values: percentBValues.slice(-20)
      }
    };

  } catch (error) {
    return {
      signal: { type: 'NEUTRAL', score: 0, strength: 'WEAK', confidence: 0 },
      values: null,
      error: `Bollinger %B calculation error: ${error.message}`
    };
  }
}

module.exports = {
  calculateBollingerPercentB,
  name: 'Bollinger %B',
  category: 'VOLATILITY',
  description: 'Bollinger Percent B - Position within Bollinger Bands, identifies overbought/oversold conditions'
};
