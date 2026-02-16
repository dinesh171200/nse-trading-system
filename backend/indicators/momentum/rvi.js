const technicalindicators = require('technicalindicators');

// Helper function to calculate symmetrically weighted moving average
function symmetricWeightedAverage(values, index) {
  // RVI uses weights: (value[i] + 2*value[i-1] + 2*value[i-2] + value[i-3]) / 6
  if (index < 3) return null;

  return (values[index] + 2 * values[index - 1] + 2 * values[index - 2] + values[index - 3]) / 6;
}

function calculateRVI(candles, period = 10, signalPeriod = 4) {
  if (!candles || candles.length < period + 3) {
    return {
      signal: { type: 'NEUTRAL', score: 0, strength: 'WEAK', confidence: 0 },
      values: null,
      error: 'Insufficient data for RVI calculation'
    };
  }

  try {
    const opens = candles.map(c => parseFloat(c.open));
    const highs = candles.map(c => parseFloat(c.high));
    const lows = candles.map(c => parseFloat(c.low));
    const closes = candles.map(c => parseFloat(c.close));

    // Calculate numerator (close - open) and denominator (high - low)
    const numerators = [];
    const denominators = [];

    for (let i = 0; i < candles.length; i++) {
      numerators.push(closes[i] - opens[i]);
      denominators.push(highs[i] - lows[i]);
    }

    // Apply symmetric weighting to numerator and denominator
    const weightedNumerators = [];
    const weightedDenominators = [];

    for (let i = 3; i < candles.length; i++) {
      const weightedNum = symmetricWeightedAverage(numerators, i);
      const weightedDenom = symmetricWeightedAverage(denominators, i);

      if (weightedNum !== null && weightedDenom !== null) {
        weightedNumerators.push(weightedNum);
        weightedDenominators.push(weightedDenom);
      }
    }

    // Calculate SMA of weighted values
    const smaNumInput = {
      values: weightedNumerators,
      period: period
    };
    const smaDenomInput = {
      values: weightedDenominators,
      period: period
    };

    const smaNum = technicalindicators.SMA.calculate(smaNumInput);
    const smaDenom = technicalindicators.SMA.calculate(smaDenomInput);

    if (!smaNum || smaNum.length === 0 || !smaDenom || smaDenom.length === 0) {
      return {
        signal: { type: 'NEUTRAL', score: 0, strength: 'WEAK', confidence: 0 },
        values: null,
        error: 'RVI SMA calculation failed'
      };
    }

    // Calculate RVI: SMA(numerator) / SMA(denominator)
    const rviValues = [];
    const minLength = Math.min(smaNum.length, smaDenom.length);

    for (let i = 0; i < minLength; i++) {
      if (smaDenom[i] !== 0) {
        rviValues.push(smaNum[i] / smaDenom[i]);
      } else {
        rviValues.push(0);
      }
    }

    if (rviValues.length === 0) {
      return {
        signal: { type: 'NEUTRAL', score: 0, strength: 'WEAK', confidence: 0 },
        values: null,
        error: 'RVI calculation produced no values'
      };
    }

    // Calculate signal line (symmetric weighted average of RVI)
    const signalLine = [];
    for (let i = 3; i < rviValues.length; i++) {
      const sig = symmetricWeightedAverage(rviValues, i);
      if (sig !== null) {
        signalLine.push(sig);
      }
    }

    const currentRVI = rviValues[rviValues.length - 1];
    const previousRVI = rviValues.length > 1 ? rviValues[rviValues.length - 2] : null;
    const currentSignal = signalLine.length > 0 ? signalLine[signalLine.length - 1] : null;
    const previousSignal = signalLine.length > 1 ? signalLine[signalLine.length - 2] : null;

    // Generate signal
    let signal = { type: 'NEUTRAL', score: 0, strength: 'WEAK', confidence: 50 };

    // RVI oscillates around zero
    // Positive RVI = closes higher than opens (bullish)
    // Negative RVI = closes lower than opens (bearish)

    // 1. Signal line crossover (primary signal)
    if (currentSignal !== null && previousSignal !== null && previousRVI !== null) {
      // Bullish: RVI crosses above signal line
      if (previousRVI <= previousSignal && currentRVI > currentSignal) {
        // Stronger if both are positive
        if (currentRVI > 0 && currentSignal > 0) {
          signal.type = 'BUY';
          signal.score = 65;
          signal.strength = 'VERY_STRONG';
          signal.confidence = 85;
          signal.reason = 'RVI crossed above signal line in positive zone (strong bullish vigor)';
        } else {
          signal.type = 'BUY';
          signal.score = 55;
          signal.strength = 'STRONG';
          signal.confidence = 75;
          signal.reason = 'RVI crossed above signal line (building bullish momentum)';
        }
      }
      // Bearish: RVI crosses below signal line
      else if (previousRVI >= previousSignal && currentRVI < currentSignal) {
        // Stronger if both are negative
        if (currentRVI < 0 && currentSignal < 0) {
          signal.type = 'SELL';
          signal.score = -65;
          signal.strength = 'VERY_STRONG';
          signal.confidence = 85;
          signal.reason = 'RVI crossed below signal line in negative zone (strong bearish vigor)';
        } else {
          signal.type = 'SELL';
          signal.score = -55;
          signal.strength = 'STRONG';
          signal.confidence = 75;
          signal.reason = 'RVI crossed below signal line (building bearish momentum)';
        }
      }
    }

    // 2. Zero line crossover
    if (signal.type === 'NEUTRAL' && previousRVI !== null) {
      if (previousRVI <= 0 && currentRVI > 0) {
        signal.type = 'BUY';
        signal.score = 50;
        signal.strength = 'STRONG';
        signal.confidence = 75;
        signal.reason = 'RVI crossed above zero (closes now exceeding opens)';
      } else if (previousRVI >= 0 && currentRVI < 0) {
        signal.type = 'SELL';
        signal.score = -50;
        signal.strength = 'STRONG';
        signal.confidence = 75;
        signal.reason = 'RVI crossed below zero (opens now exceeding closes)';
      }
    }

    // 3. Extreme readings (overbought/oversold)
    if (signal.type === 'NEUTRAL') {
      // Calculate recent range for normalization
      const recentRVI = rviValues.slice(-50);
      const rviMax = Math.max(...recentRVI);
      const rviMin = Math.min(...recentRVI);
      const rviRange = rviMax - rviMin;

      if (rviRange > 0) {
        const normalizedRVI = ((currentRVI - rviMin) / rviRange) * 100;

        // Extreme bullish (top 20%)
        if (normalizedRVI > 80 && currentRVI > (currentSignal || 0)) {
          signal.type = 'BUY';
          signal.score = 40;
          signal.strength = 'MODERATE';
          signal.confidence = 70;
          signal.reason = `RVI in strong bullish zone (${normalizedRVI.toFixed(0)}% of range)`;
        }
        // Extreme bearish (bottom 20%)
        else if (normalizedRVI < 20 && currentRVI < (currentSignal || 0)) {
          signal.type = 'SELL';
          signal.score = -40;
          signal.strength = 'MODERATE';
          signal.confidence = 70;
          signal.reason = `RVI in strong bearish zone (${normalizedRVI.toFixed(0)}% of range)`;
        }
        // Moderately bullish (60-80%)
        else if (normalizedRVI > 60 && normalizedRVI <= 80 && currentRVI > (currentSignal || 0)) {
          signal.type = 'BUY';
          signal.score = 30;
          signal.strength = 'MODERATE';
          signal.confidence = 65;
          signal.reason = 'RVI in bullish zone';
        }
        // Moderately bearish (20-40%)
        else if (normalizedRVI >= 20 && normalizedRVI < 40 && currentRVI < (currentSignal || 0)) {
          signal.type = 'SELL';
          signal.score = -30;
          signal.strength = 'MODERATE';
          signal.confidence = 65;
          signal.reason = 'RVI in bearish zone';
        }
      }
    }

    // 4. Position-based signal (weak)
    if (signal.type === 'NEUTRAL') {
      if (currentRVI > 0 && currentSignal && currentRVI > currentSignal) {
        signal.type = 'BUY';
        signal.score = Math.min(25, Math.abs(currentRVI * 500));
        signal.strength = 'WEAK';
        signal.confidence = 60;
        signal.reason = 'RVI positive and above signal line';
      } else if (currentRVI < 0 && currentSignal && currentRVI < currentSignal) {
        signal.type = 'SELL';
        signal.score = Math.max(-25, -Math.abs(currentRVI * 500));
        signal.strength = 'WEAK';
        signal.confidence = 60;
        signal.reason = 'RVI negative and below signal line';
      } else if (currentRVI > 0) {
        signal.type = 'BUY';
        signal.score = 15;
        signal.strength = 'WEAK';
        signal.confidence = 55;
        signal.reason = 'RVI positive (closes > opens)';
      } else if (currentRVI < 0) {
        signal.type = 'SELL';
        signal.score = -15;
        signal.strength = 'WEAK';
        signal.confidence = 55;
        signal.reason = 'RVI negative (opens > closes)';
      }
    }

    return {
      signal,
      values: {
        rvi: currentRVI,
        signal: currentSignal,
        period: period,
        signalPeriod: signalPeriod
      },
      trend: currentRVI > 0 ? 'BULLISH' : 'BEARISH',
      vigor: Math.abs(currentRVI) > 0.05 ? 'STRONG' : 'WEAK',
      history: {
        rvi: rviValues.slice(-20),
        signal: signalLine.slice(-20)
      }
    };

  } catch (error) {
    return {
      signal: { type: 'NEUTRAL', score: 0, strength: 'WEAK', confidence: 0 },
      values: null,
      error: `RVI calculation error: ${error.message}`
    };
  }
}

module.exports = {
  calculateRVI,
  name: 'RVI',
  category: 'MOMENTUM',
  description: 'Relative Vigor Index - Measures opening vs closing strength to identify momentum'
};
