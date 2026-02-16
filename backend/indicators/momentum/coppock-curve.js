const technicalindicators = require('technicalindicators');

function calculateCoppockCurve(candles, roc1Period = 14, roc2Period = 11, wmaPeriod = 10) {
  const minDataRequired = Math.max(roc1Period, roc2Period) + wmaPeriod;

  if (!candles || candles.length < minDataRequired) {
    return {
      signal: { type: 'NEUTRAL', score: 0, strength: 'WEAK', confidence: 0 },
      values: null,
      error: `Insufficient data for Coppock Curve (need ${minDataRequired} candles)`
    };
  }

  try {
    const closes = candles.map(c => parseFloat(c.close));

    // Calculate ROC for period 1
    const roc1Input = {
      values: closes,
      period: roc1Period
    };
    const roc1 = technicalindicators.ROC.calculate(roc1Input);

    // Calculate ROC for period 2
    const roc2Input = {
      values: closes,
      period: roc2Period
    };
    const roc2 = technicalindicators.ROC.calculate(roc2Input);

    if (!roc1 || roc1.length === 0 || !roc2 || roc2.length === 0) {
      return {
        signal: { type: 'NEUTRAL', score: 0, strength: 'WEAK', confidence: 0 },
        values: null,
        error: 'ROC calculation failed for Coppock Curve'
      };
    }

    // Align ROC arrays to same length
    const minLength = Math.min(roc1.length, roc2.length);
    const alignedROC1 = roc1.slice(-minLength);
    const alignedROC2 = roc2.slice(-minLength);

    // Sum the two ROC series
    const rocSum = [];
    for (let i = 0; i < alignedROC1.length; i++) {
      rocSum.push(alignedROC1[i] + alignedROC2[i]);
    }

    // Calculate WMA of the sum
    const wmaInput = {
      values: rocSum,
      period: wmaPeriod
    };
    const coppockValues = technicalindicators.WMA.calculate(wmaInput);

    if (!coppockValues || coppockValues.length === 0) {
      return {
        signal: { type: 'NEUTRAL', score: 0, strength: 'WEAK', confidence: 0 },
        values: null,
        error: 'WMA calculation failed for Coppock Curve'
      };
    }

    const currentCoppock = coppockValues[coppockValues.length - 1];
    const previousCoppock = coppockValues.length > 1 ? coppockValues[coppockValues.length - 2] : null;

    // Generate signal
    let signal = { type: 'NEUTRAL', score: 0, strength: 'WEAK', confidence: 50 };

    // Coppock Curve is designed for long-term trend identification
    // Most reliable at identifying major market bottoms

    // 1. Zero line crossover (most powerful signal - rare but very reliable)
    if (previousCoppock !== null) {
      // Bullish: Crosses above zero (major bottom signal)
      if (previousCoppock <= 0 && currentCoppock > 0) {
        signal.type = 'BUY';
        signal.score = 75;
        signal.strength = 'VERY_STRONG';
        signal.confidence = 90;
        signal.reason = 'Coppock Curve crossed above zero (major bottom signal - highly reliable)';
      }
      // Bearish: Crosses below zero (potential top)
      else if (previousCoppock >= 0 && currentCoppock < 0) {
        signal.type = 'SELL';
        signal.score = -75;
        signal.strength = 'VERY_STRONG';
        signal.confidence = 90;
        signal.reason = 'Coppock Curve crossed below zero (potential major top)';
      }
    }

    // 2. Slope/momentum change (slope turning from negative to positive)
    if (signal.type === 'NEUTRAL' && coppockValues.length >= 3 && previousCoppock !== null) {
      const olderCoppock = coppockValues[coppockValues.length - 3];

      const currentSlope = currentCoppock - previousCoppock;
      const previousSlope = previousCoppock - olderCoppock;

      // Slope turning positive (momentum reversal from down to up)
      if (previousSlope <= 0 && currentSlope > 0 && currentCoppock < 0) {
        signal.type = 'BUY';
        signal.score = 65;
        signal.strength = 'STRONG';
        signal.confidence = 80;
        signal.reason = 'Coppock Curve momentum turning positive (potential bottom forming)';
      }
      // Slope turning negative (momentum reversal from up to down)
      else if (previousSlope >= 0 && currentSlope < 0 && currentCoppock > 0) {
        signal.type = 'SELL';
        signal.score = -50;
        signal.strength = 'MODERATE';
        signal.confidence = 70;
        signal.reason = 'Coppock Curve momentum turning negative (potential top forming)';
      }
    }

    // 3. Rising from deeply negative levels (bottom signal)
    if (signal.type === 'NEUTRAL' && previousCoppock !== null) {
      // Calculate recent min/max for context
      const recentValues = coppockValues.slice(-20);
      const recentMin = Math.min(...recentValues);
      const recentMax = Math.max(...recentValues);

      // Rising from deeply negative (within 20% of recent minimum)
      if (currentCoppock < 0 &&
          currentCoppock > previousCoppock &&
          currentCoppock <= recentMin * 1.2) {
        signal.type = 'BUY';
        signal.score = 55;
        signal.strength = 'MODERATE';
        signal.confidence = 75;
        signal.reason = 'Coppock Curve rising from deeply negative levels (oversold reversal)';
      }
      // Falling from elevated positive (within 20% of recent maximum)
      else if (currentCoppock > 0 &&
               currentCoppock < previousCoppock &&
               currentCoppock >= recentMax * 0.8) {
        signal.type = 'SELL';
        signal.score = -40;
        signal.strength = 'MODERATE';
        signal.confidence = 65;
        signal.reason = 'Coppock Curve falling from elevated levels (overbought correction)';
      }
    }

    // 4. Trend-based signal
    if (signal.type === 'NEUTRAL' && previousCoppock !== null) {
      const momentum = currentCoppock - previousCoppock;

      // Below zero and rising (accumulation phase)
      if (currentCoppock < 0 && momentum > 0) {
        const strength = Math.abs(momentum);
        signal.type = 'BUY';
        signal.score = Math.min(40, 20 + strength * 10);
        signal.strength = 'MODERATE';
        signal.confidence = 65;
        signal.reason = 'Coppock Curve below zero but rising (building momentum)';
      }
      // Above zero and rising (bull market)
      else if (currentCoppock > 0 && momentum > 0) {
        signal.type = 'BUY';
        signal.score = 30;
        signal.strength = 'MODERATE';
        signal.confidence = 60;
        signal.reason = 'Coppock Curve positive and rising (bull trend continues)';
      }
      // Above zero and falling (losing momentum)
      else if (currentCoppock > 0 && momentum < 0) {
        signal.type = 'SELL';
        signal.score = -25;
        signal.strength = 'WEAK';
        signal.confidence = 55;
        signal.reason = 'Coppock Curve positive but falling (losing bullish momentum)';
      }
      // Below zero and falling (bear market)
      else if (currentCoppock < 0 && momentum < 0) {
        signal.type = 'SELL';
        signal.score = -30;
        signal.strength = 'MODERATE';
        signal.confidence = 60;
        signal.reason = 'Coppock Curve negative and falling (bear trend continues)';
      }
    }

    // 5. Neutral positioning
    if (signal.type === 'NEUTRAL') {
      if (currentCoppock > 0) {
        signal.type = 'BUY';
        signal.score = 15;
        signal.strength = 'WEAK';
        signal.confidence = 50;
        signal.reason = 'Coppock Curve in positive territory';
      } else if (currentCoppock < 0) {
        signal.type = 'SELL';
        signal.score = -15;
        signal.strength = 'WEAK';
        signal.confidence = 50;
        signal.reason = 'Coppock Curve in negative territory';
      }
    }

    // Calculate trend strength
    let trendStrength = 'NEUTRAL';
    if (coppockValues.length >= 5) {
      const recent5 = coppockValues.slice(-5);
      const isRising = recent5.every((val, i, arr) => i === 0 || val >= arr[i - 1]);
      const isFalling = recent5.every((val, i, arr) => i === 0 || val <= arr[i - 1]);

      if (isRising && currentCoppock > 0) trendStrength = 'STRONG_BULLISH';
      else if (isRising) trendStrength = 'BULLISH';
      else if (isFalling && currentCoppock < 0) trendStrength = 'STRONG_BEARISH';
      else if (isFalling) trendStrength = 'BEARISH';
    }

    return {
      signal,
      values: {
        coppock: currentCoppock,
        roc1Period,
        roc2Period,
        wmaPeriod
      },
      trend: currentCoppock > 0 ? 'BULLISH' : 'BEARISH',
      trendStrength: trendStrength,
      momentum: previousCoppock ? (currentCoppock > previousCoppock ? 'INCREASING' : 'DECREASING') : 'NEUTRAL',
      history: {
        values: coppockValues.slice(-20)
      }
    };

  } catch (error) {
    return {
      signal: { type: 'NEUTRAL', score: 0, strength: 'WEAK', confidence: 0 },
      values: null,
      error: `Coppock Curve calculation error: ${error.message}`
    };
  }
}

module.exports = {
  calculateCoppockCurve,
  name: 'Coppock Curve',
  category: 'MOMENTUM',
  description: 'Coppock Curve - Long-term momentum indicator designed for identifying major market bottoms, rarely produces false signals'
};
