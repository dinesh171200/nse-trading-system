const technicalindicators = require('technicalindicators');

function calculateTSI(candles, longPeriod = 25, shortPeriod = 13, signalPeriod = 7) {
  const minRequired = longPeriod + shortPeriod + signalPeriod;

  if (!candles || candles.length < minRequired) {
    return {
      signal: { type: 'NEUTRAL', score: 0, strength: 'WEAK', confidence: 0 },
      values: null,
      error: `Insufficient data for TSI calculation (need ${minRequired} candles)`
    };
  }

  try {
    const closes = candles.map(c => parseFloat(c.close));

    // Calculate price momentum (price changes)
    const momentum = [];
    for (let i = 1; i < closes.length; i++) {
      momentum.push(closes[i] - closes[i - 1]);
    }

    if (momentum.length === 0) {
      return {
        signal: { type: 'NEUTRAL', score: 0, strength: 'WEAK', confidence: 0 },
        values: null,
        error: 'Momentum calculation failed'
      };
    }

    // Calculate absolute momentum for denominator
    const absMomentum = momentum.map(m => Math.abs(m));

    // First smoothing: EMA(momentum, longPeriod)
    const ema1MomentumInput = {
      values: momentum,
      period: longPeriod
    };
    const ema1Momentum = technicalindicators.EMA.calculate(ema1MomentumInput);

    const ema1AbsMomentumInput = {
      values: absMomentum,
      period: longPeriod
    };
    const ema1AbsMomentum = technicalindicators.EMA.calculate(ema1AbsMomentumInput);

    if (!ema1Momentum || ema1Momentum.length === 0 || !ema1AbsMomentum || ema1AbsMomentum.length === 0) {
      return {
        signal: { type: 'NEUTRAL', score: 0, strength: 'WEAK', confidence: 0 },
        values: null,
        error: 'First EMA smoothing failed for TSI'
      };
    }

    // Second smoothing: EMA(EMA(momentum, longPeriod), shortPeriod)
    const ema2MomentumInput = {
      values: ema1Momentum,
      period: shortPeriod
    };
    const ema2Momentum = technicalindicators.EMA.calculate(ema2MomentumInput);

    const ema2AbsMomentumInput = {
      values: ema1AbsMomentum,
      period: shortPeriod
    };
    const ema2AbsMomentum = technicalindicators.EMA.calculate(ema2AbsMomentumInput);

    if (!ema2Momentum || ema2Momentum.length === 0 || !ema2AbsMomentum || ema2AbsMomentum.length === 0) {
      return {
        signal: { type: 'NEUTRAL', score: 0, strength: 'WEAK', confidence: 0 },
        values: null,
        error: 'Second EMA smoothing failed for TSI'
      };
    }

    // Calculate TSI: 100 * (double smoothed momentum) / (double smoothed absolute momentum)
    const tsiValues = [];
    for (let i = 0; i < ema2Momentum.length; i++) {
      if (ema2AbsMomentum[i] !== 0) {
        tsiValues.push(100 * (ema2Momentum[i] / ema2AbsMomentum[i]));
      } else {
        tsiValues.push(0);
      }
    }

    if (tsiValues.length === 0) {
      return {
        signal: { type: 'NEUTRAL', score: 0, strength: 'WEAK', confidence: 0 },
        values: null,
        error: 'TSI calculation produced no values'
      };
    }

    const currentTSI = tsiValues[tsiValues.length - 1];
    const previousTSI = tsiValues.length > 1 ? tsiValues[tsiValues.length - 2] : null;

    // Calculate signal line (EMA of TSI)
    let signalLine = null;
    let previousSignalLine = null;

    if (tsiValues.length >= signalPeriod) {
      const signalInput = {
        values: tsiValues,
        period: signalPeriod
      };
      const signalResults = technicalindicators.EMA.calculate(signalInput);

      if (signalResults && signalResults.length > 0) {
        signalLine = signalResults[signalResults.length - 1];
        if (signalResults.length > 1) {
          previousSignalLine = signalResults[signalResults.length - 2];
        }
      }
    }

    // Generate signal
    let signal = { type: 'NEUTRAL', score: 0, strength: 'WEAK', confidence: 50 };

    // TSI oscillates around zero, typically between -100 and +100
    // Overbought: > 25
    // Oversold: < -25

    // 1. Signal line crossover (primary signal)
    if (signalLine !== null && previousSignalLine !== null && previousTSI !== null) {
      // Bullish crossover: TSI crosses above signal line
      if (previousTSI <= previousSignalLine && currentTSI > signalLine) {
        // Stronger if in oversold zone
        if (currentTSI < -15) {
          signal.type = 'BUY';
          signal.score = 65;
          signal.strength = 'VERY_STRONG';
          signal.confidence = 90;
          signal.reason = 'TSI bullish crossover in oversold zone';
        } else {
          signal.type = 'BUY';
          signal.score = 55;
          signal.strength = 'STRONG';
          signal.confidence = 80;
          signal.reason = 'TSI crossed above signal line';
        }
      }
      // Bearish crossover: TSI crosses below signal line
      else if (previousTSI >= previousSignalLine && currentTSI < signalLine) {
        // Stronger if in overbought zone
        if (currentTSI > 15) {
          signal.type = 'SELL';
          signal.score = -65;
          signal.strength = 'VERY_STRONG';
          signal.confidence = 90;
          signal.reason = 'TSI bearish crossover in overbought zone';
        } else {
          signal.type = 'SELL';
          signal.score = -55;
          signal.strength = 'STRONG';
          signal.confidence = 80;
          signal.reason = 'TSI crossed below signal line';
        }
      }
    }

    // 2. Zero line crossover
    if (signal.type === 'NEUTRAL' && previousTSI !== null) {
      // Bullish: TSI crosses above zero
      if (previousTSI <= 0 && currentTSI > 0) {
        signal.type = 'BUY';
        signal.score = 50;
        signal.strength = 'STRONG';
        signal.confidence = 75;
        signal.reason = 'TSI crossed above zero (momentum shifted bullish)';
      }
      // Bearish: TSI crosses below zero
      else if (previousTSI >= 0 && currentTSI < 0) {
        signal.type = 'SELL';
        signal.score = -50;
        signal.strength = 'STRONG';
        signal.confidence = 75;
        signal.reason = 'TSI crossed below zero (momentum shifted bearish)';
      }
    }

    // 3. Overbought/Oversold
    if (signal.type === 'NEUTRAL') {
      // Deeply oversold (< -30)
      if (currentTSI < -30) {
        signal.type = 'BUY';
        signal.score = Math.round(45 + Math.min(20, Math.abs(currentTSI + 30) * 0.5));
        signal.strength = 'MODERATE';
        signal.confidence = 75;
        signal.reason = `TSI deeply oversold (${currentTSI.toFixed(1)})`;
      }
      // Deeply overbought (> 30)
      else if (currentTSI > 30) {
        signal.type = 'SELL';
        signal.score = Math.round(-45 - Math.min(20, (currentTSI - 30) * 0.5));
        signal.strength = 'MODERATE';
        signal.confidence = 75;
        signal.reason = `TSI deeply overbought (${currentTSI.toFixed(1)})`;
      }
      // Oversold (-25 to -30)
      else if (currentTSI < -25) {
        signal.type = 'BUY';
        signal.score = 35;
        signal.strength = 'MODERATE';
        signal.confidence = 65;
        signal.reason = 'TSI oversold';
      }
      // Overbought (25 to 30)
      else if (currentTSI > 25) {
        signal.type = 'SELL';
        signal.score = -35;
        signal.strength = 'MODERATE';
        signal.confidence = 65;
        signal.reason = 'TSI overbought';
      }
    }

    // 4. Directional momentum
    if (signal.type === 'NEUTRAL') {
      // Positive momentum
      if (currentTSI > 0 && (!signalLine || currentTSI > signalLine)) {
        signal.type = 'BUY';
        signal.score = Math.min(30, Math.round(currentTSI * 1.2));
        signal.strength = 'WEAK';
        signal.confidence = 60;
        signal.reason = 'TSI above zero and signal line (bullish momentum)';
      }
      // Negative momentum
      else if (currentTSI < 0 && (!signalLine || currentTSI < signalLine)) {
        signal.type = 'SELL';
        signal.score = Math.max(-30, Math.round(currentTSI * 1.2));
        signal.strength = 'WEAK';
        signal.confidence = 60;
        signal.reason = 'TSI below zero and signal line (bearish momentum)';
      }
      // Above signal line
      else if (signalLine && currentTSI > signalLine) {
        signal.type = 'BUY';
        signal.score = 15;
        signal.strength = 'WEAK';
        signal.confidence = 55;
        signal.reason = 'TSI above signal line';
      }
      // Below signal line
      else if (signalLine && currentTSI < signalLine) {
        signal.type = 'SELL';
        signal.score = -15;
        signal.strength = 'WEAK';
        signal.confidence = 55;
        signal.reason = 'TSI below signal line';
      }
    }

    // Determine zone
    let zone = 'NEUTRAL';
    if (currentTSI < -30) zone = 'DEEPLY_OVERSOLD';
    else if (currentTSI < -25) zone = 'OVERSOLD';
    else if (currentTSI < -10) zone = 'WEAK_BEARISH';
    else if (currentTSI < 10) zone = 'NEUTRAL';
    else if (currentTSI < 25) zone = 'WEAK_BULLISH';
    else if (currentTSI < 30) zone = 'OVERBOUGHT';
    else zone = 'DEEPLY_OVERBOUGHT';

    return {
      signal,
      values: {
        tsi: currentTSI,
        signal: signalLine,
        longPeriod,
        shortPeriod,
        signalPeriod
      },
      zone: zone,
      trend: currentTSI > 0 ? 'BULLISH' : 'BEARISH',
      momentum: previousTSI ? (currentTSI > previousTSI ? 'INCREASING' : 'DECREASING') : 'NEUTRAL',
      history: {
        tsi: tsiValues.slice(-20),
        signal: signalLine ? [signalLine] : []
      }
    };

  } catch (error) {
    return {
      signal: { type: 'NEUTRAL', score: 0, strength: 'WEAK', confidence: 0 },
      values: null,
      error: `TSI calculation error: ${error.message}`
    };
  }
}

module.exports = {
  calculateTSI,
  name: 'TSI',
  category: 'MOMENTUM',
  description: 'True Strength Index - Double-smoothed momentum oscillator, reduces noise better than RSI'
};
