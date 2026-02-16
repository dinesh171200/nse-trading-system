const technicalindicators = require('technicalindicators');

function calculateTRIX(candles, period = 15) {
  if (!candles || candles.length < period * 3) {
    return {
      signal: { type: 'NEUTRAL', score: 0, strength: 'WEAK', confidence: 0 },
      values: null,
      error: 'Insufficient data for TRIX calculation'
    };
  }

  try {
    const closes = candles.map(c => parseFloat(c.close));

    // Calculate first EMA
    const ema1Input = {
      values: closes,
      period: period
    };
    const ema1 = technicalindicators.EMA.calculate(ema1Input);

    if (!ema1 || ema1.length < period) {
      return {
        signal: { type: 'NEUTRAL', score: 0, strength: 'WEAK', confidence: 0 },
        values: null,
        error: 'First EMA calculation failed'
      };
    }

    // Calculate second EMA (EMA of EMA)
    const ema2Input = {
      values: ema1,
      period: period
    };
    const ema2 = technicalindicators.EMA.calculate(ema2Input);

    if (!ema2 || ema2.length < period) {
      return {
        signal: { type: 'NEUTRAL', score: 0, strength: 'WEAK', confidence: 0 },
        values: null,
        error: 'Second EMA calculation failed'
      };
    }

    // Calculate third EMA (EMA of EMA of EMA) - Triple EMA (TEMA)
    const ema3Input = {
      values: ema2,
      period: period
    };
    const ema3 = technicalindicators.EMA.calculate(ema3Input);

    if (!ema3 || ema3.length < 2) {
      return {
        signal: { type: 'NEUTRAL', score: 0, strength: 'WEAK', confidence: 0 },
        values: null,
        error: 'Third EMA calculation failed'
      };
    }

    // Calculate TRIX: 1-period % ROC of triple-smoothed EMA
    // TRIX[i] = ((EMA3[i] - EMA3[i-1]) / EMA3[i-1]) * 100
    const trixValues = [];
    for (let i = 1; i < ema3.length; i++) {
      const trix = ((ema3[i] - ema3[i - 1]) / ema3[i - 1]) * 100;
      trixValues.push(trix);
    }

    if (trixValues.length === 0) {
      return {
        signal: { type: 'NEUTRAL', score: 0, strength: 'WEAK', confidence: 0 },
        values: null,
        error: 'TRIX calculation produced no values'
      };
    }

    const currentTRIX = trixValues[trixValues.length - 1];
    const previousTRIX = trixValues.length > 1 ? trixValues[trixValues.length - 2] : null;

    // Calculate signal line (optional - 9-period SMA of TRIX)
    let signalLine = null;
    if (trixValues.length >= 9) {
      const signalInput = {
        values: trixValues,
        period: 9
      };
      const signalResults = technicalindicators.SMA.calculate(signalInput);
      if (signalResults && signalResults.length > 0) {
        signalLine = signalResults[signalResults.length - 1];
      }
    }

    // Generate signal
    let signal = { type: 'NEUTRAL', score: 0, strength: 'WEAK', confidence: 50 };

    // 1. Zero line crossover (most powerful)
    if (previousTRIX !== null) {
      // Bullish: TRIX crosses above zero
      if (previousTRIX <= 0 && currentTRIX > 0) {
        signal.type = 'BUY';
        signal.score = 60;
        signal.strength = 'STRONG';
        signal.confidence = 85;
        signal.reason = 'TRIX crossed above zero (bullish momentum shift)';
      }
      // Bearish: TRIX crosses below zero
      else if (previousTRIX >= 0 && currentTRIX < 0) {
        signal.type = 'SELL';
        signal.score = -60;
        signal.strength = 'STRONG';
        signal.confidence = 85;
        signal.reason = 'TRIX crossed below zero (bearish momentum shift)';
      }
    }

    // 2. Signal line crossover (if available)
    if (signal.type === 'NEUTRAL' && signalLine !== null && previousTRIX !== null) {
      const previousSignalLine = trixValues.length >= 10 ?
        technicalindicators.SMA.calculate({
          values: trixValues.slice(0, -1),
          period: 9
        }).slice(-1)[0] : null;

      if (previousSignalLine !== null) {
        // Bullish: TRIX crosses above signal line
        if (previousTRIX <= previousSignalLine && currentTRIX > signalLine) {
          signal.type = 'BUY';
          signal.score = 50;
          signal.strength = 'MODERATE';
          signal.confidence = 75;
          signal.reason = 'TRIX crossed above signal line';
        }
        // Bearish: TRIX crosses below signal line
        else if (previousTRIX >= previousSignalLine && currentTRIX < signalLine) {
          signal.type = 'SELL';
          signal.score = -50;
          signal.strength = 'MODERATE';
          signal.confidence = 75;
          signal.reason = 'TRIX crossed below signal line';
        }
      }
    }

    // 3. Divergence detection
    if (signal.type === 'NEUTRAL' && trixValues.length >= 20) {
      const recentCandles = candles.slice(-20);
      const recentTRIX = trixValues.slice(-20);
      const recentCloses = recentCandles.map(c => parseFloat(c.close));

      const priceHigh = Math.max(...recentCloses.map((c, i) => parseFloat(recentCandles[i].high)));
      const priceLow = Math.min(...recentCloses.map((c, i) => parseFloat(recentCandles[i].low)));
      const trixHigh = Math.max(...recentTRIX);
      const trixLow = Math.min(...recentTRIX);

      const currentPrice = recentCloses[recentCloses.length - 1];

      // Bullish divergence: price lower low, TRIX higher low
      if (currentPrice <= priceLow * 1.01 && currentTRIX >= trixLow * 1.15) {
        signal.type = 'BUY';
        signal.score = 45;
        signal.strength = 'MODERATE';
        signal.confidence = 70;
        signal.reason = 'Bullish divergence on TRIX';
      }
      // Bearish divergence: price higher high, TRIX lower high
      else if (currentPrice >= priceHigh * 0.99 && currentTRIX <= trixHigh * 0.85) {
        signal.type = 'SELL';
        signal.score = -45;
        signal.strength = 'MODERATE';
        signal.confidence = 70;
        signal.reason = 'Bearish divergence on TRIX';
      }
    }

    // 4. Directional momentum
    if (signal.type === 'NEUTRAL') {
      // Strong positive TRIX
      if (currentTRIX > 0.1) {
        signal.type = 'BUY';
        signal.score = Math.min(40, currentTRIX * 200);
        signal.strength = 'MODERATE';
        signal.confidence = 65;
        signal.reason = `TRIX strongly positive (${currentTRIX.toFixed(3)}%)`;
      }
      // Strong negative TRIX
      else if (currentTRIX < -0.1) {
        signal.type = 'SELL';
        signal.score = Math.max(-40, currentTRIX * 200);
        signal.strength = 'MODERATE';
        signal.confidence = 65;
        signal.reason = `TRIX strongly negative (${currentTRIX.toFixed(3)}%)`;
      }
      // Mildly positive
      else if (currentTRIX > 0) {
        signal.type = 'BUY';
        signal.score = 20;
        signal.strength = 'WEAK';
        signal.confidence = 55;
        signal.reason = 'TRIX above zero';
      }
      // Mildly negative
      else if (currentTRIX < 0) {
        signal.type = 'SELL';
        signal.score = -20;
        signal.strength = 'WEAK';
        signal.confidence = 55;
        signal.reason = 'TRIX below zero';
      }
    }

    return {
      signal,
      values: {
        trix: currentTRIX,
        signal: signalLine,
        period: period
      },
      trend: currentTRIX > 0 ? 'BULLISH' : 'BEARISH',
      momentum: previousTRIX ? (currentTRIX > previousTRIX ? 'INCREASING' : 'DECREASING') : 'NEUTRAL',
      history: {
        values: trixValues.slice(-20)
      }
    };

  } catch (error) {
    return {
      signal: { type: 'NEUTRAL', score: 0, strength: 'WEAK', confidence: 0 },
      values: null,
      error: `TRIX calculation error: ${error.message}`
    };
  }
}

module.exports = {
  calculateTRIX,
  name: 'TRIX',
  category: 'MOMENTUM',
  description: 'TRIX - Triple Exponential Average rate of change, filters out market noise'
};
