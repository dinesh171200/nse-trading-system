const technicalindicators = require('technicalindicators');

function calculateMassIndex(candles, emaPeriod = 9, sumPeriod = 25) {
  const minRequired = emaPeriod * 2 + sumPeriod;

  if (!candles || candles.length < minRequired) {
    return {
      signal: { type: 'NEUTRAL', score: 0, strength: 'WEAK', confidence: 0 },
      values: null,
      error: `Insufficient data for Mass Index (need ${minRequired} candles)`
    };
  }

  try {
    const highs = candles.map(c => parseFloat(c.high));
    const lows = candles.map(c => parseFloat(c.low));

    // Calculate High-Low range
    const ranges = [];
    for (let i = 0; i < candles.length; i++) {
      ranges.push(highs[i] - lows[i]);
    }

    // Calculate first EMA of High-Low range
    const ema1Input = {
      values: ranges,
      period: emaPeriod
    };
    const ema1 = technicalindicators.EMA.calculate(ema1Input);

    if (!ema1 || ema1.length < emaPeriod) {
      return {
        signal: { type: 'NEUTRAL', score: 0, strength: 'WEAK', confidence: 0 },
        values: null,
        error: 'First EMA calculation failed for Mass Index'
      };
    }

    // Calculate second EMA (EMA of first EMA)
    const ema2Input = {
      values: ema1,
      period: emaPeriod
    };
    const ema2 = technicalindicators.EMA.calculate(ema2Input);

    if (!ema2 || ema2.length === 0) {
      return {
        signal: { type: 'NEUTRAL', score: 0, strength: 'WEAK', confidence: 0 },
        values: null,
        error: 'Second EMA calculation failed for Mass Index'
      };
    }

    // Calculate EMA ratio: EMA1 / EMA2
    // Align arrays first
    const minLength = Math.min(ema1.length, ema2.length);
    const alignedEMA1 = ema1.slice(-minLength);
    const alignedEMA2 = ema2.slice(-minLength);

    const emaRatios = [];
    for (let i = 0; i < minLength; i++) {
      if (alignedEMA2[i] !== 0) {
        emaRatios.push(alignedEMA1[i] / alignedEMA2[i]);
      } else {
        emaRatios.push(1); // Neutral ratio
      }
    }

    if (emaRatios.length < sumPeriod) {
      return {
        signal: { type: 'NEUTRAL', score: 0, strength: 'WEAK', confidence: 0 },
        values: null,
        error: 'Insufficient EMA ratios for Mass Index sum'
      };
    }

    // Calculate Mass Index: sum of EMA ratios over sumPeriod
    const massIndexValues = [];
    for (let i = sumPeriod - 1; i < emaRatios.length; i++) {
      const slice = emaRatios.slice(i - sumPeriod + 1, i + 1);
      const sum = slice.reduce((acc, val) => acc + val, 0);
      massIndexValues.push(sum);
    }

    if (massIndexValues.length === 0) {
      return {
        signal: { type: 'NEUTRAL', score: 0, strength: 'WEAK', confidence: 0 },
        values: null,
        error: 'Mass Index calculation produced no values'
      };
    }

    const currentMI = massIndexValues[massIndexValues.length - 1];
    const previousMI = massIndexValues.length > 1 ? massIndexValues[massIndexValues.length - 2] : null;

    // Generate signal
    let signal = { type: 'NEUTRAL', score: 0, strength: 'WEAK', confidence: 50 };

    // Mass Index interpretation:
    // MI > 27 = "Bulge" - reversal likely (high volatility, trend exhaustion)
    // MI < 27 after being > 27 = Reversal confirmation (most important signal)
    // MI between 26.5 - 27 = Setup zone (reversal building)
    // Normal range: 22-26.5

    // 1. Reversal bulge detection (most powerful signal)
    if (previousMI !== null) {
      // Bulge forms: MI crosses above 27
      if (previousMI < 27 && currentMI >= 27) {
        signal.type = 'NEUTRAL'; // Don't trade yet, wait for bulge completion
        signal.score = 0;
        signal.strength = 'MODERATE';
        signal.confidence = 70;
        signal.reason = 'Mass Index bulge forming (MI ≥ 27) - reversal setup, wait for confirmation';
      }
      // Reversal confirmation: MI drops back below 26.5 after bulge (> 27)
      else if (previousMI >= 27 && currentMI < 26.5) {
        // Need to check price trend to determine reversal direction
        const recentCandles = candles.slice(-10);
        const recentCloses = recentCandles.map(c => parseFloat(c.close));
        const firstClose = recentCloses[0];
        const lastClose = recentCloses[recentCloses.length - 1];

        // Price was rising → expect bearish reversal
        if (lastClose > firstClose) {
          signal.type = 'SELL';
          signal.score = -55;
          signal.strength = 'STRONG';
          signal.confidence = 80;
          signal.reason = 'Mass Index reversal confirmed (bulge complete) - bearish reversal';
        }
        // Price was falling → expect bullish reversal
        else {
          signal.type = 'BUY';
          signal.score = 55;
          signal.strength = 'STRONG';
          signal.confidence = 80;
          signal.reason = 'Mass Index reversal confirmed (bulge complete) - bullish reversal';
        }
      }
    }

    // 2. Setup zone (26.5-27)
    if (signal.type === 'NEUTRAL' && currentMI >= 26.5 && currentMI < 27) {
      signal.type = 'NEUTRAL';
      signal.score = 0;
      signal.strength = 'WEAK';
      signal.confidence = 60;
      signal.reason = `Mass Index in setup zone (${currentMI.toFixed(2)}) - watch for bulge`;
    }

    // 3. Bulge in progress (> 27)
    if (signal.type === 'NEUTRAL' && currentMI >= 27) {
      signal.type = 'NEUTRAL';
      signal.score = 0;
      signal.strength = 'MODERATE';
      signal.confidence = 65;
      signal.reason = `Mass Index bulge in progress (${currentMI.toFixed(2)}) - reversal imminent`;
    }

    // 4. Normal range
    if (signal.type === 'NEUTRAL') {
      signal.reason = `Mass Index in normal range (${currentMI.toFixed(2)})`;
    }

    // Determine volatility state
    let volatilityState = 'NORMAL';
    if (currentMI >= 27) volatilityState = 'BULGE';
    else if (currentMI >= 26.5) volatilityState = 'ELEVATED';
    else if (currentMI >= 24) volatilityState = 'NORMAL';
    else volatilityState = 'LOW';

    return {
      signal,
      values: {
        massIndex: currentMI,
        emaPeriod,
        sumPeriod
      },
      volatilityState: volatilityState,
      reversalSetup: currentMI >= 26.5,
      interpretation: currentMI >= 27 ?
        'Bulge detected - reversal likely' :
        currentMI >= 26.5 ?
        'Setup zone - reversal building' :
        'Normal range - no reversal signal',
      history: {
        values: massIndexValues.slice(-20)
      }
    };

  } catch (error) {
    return {
      signal: { type: 'NEUTRAL', score: 0, strength: 'WEAK', confidence: 0 },
      values: null,
      error: `Mass Index calculation error: ${error.message}`
    };
  }
}

module.exports = {
  calculateMassIndex,
  name: 'Mass Index',
  category: 'TREND',
  description: 'Mass Index - Detects trend reversals through volatility bulges (>27), independent of price direction'
};
