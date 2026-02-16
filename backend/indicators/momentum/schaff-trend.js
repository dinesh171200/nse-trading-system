const technicalindicators = require('technicalindicators');

function calculateStochastic(values, period) {
  if (values.length < period) return null;

  const stochValues = [];
  for (let i = period - 1; i < values.length; i++) {
    const slice = values.slice(i - period + 1, i + 1);
    const highest = Math.max(...slice);
    const lowest = Math.min(...slice);

    if (highest === lowest) {
      stochValues.push(0);
    } else {
      const stoch = ((values[i] - lowest) / (highest - lowest)) * 100;
      stochValues.push(stoch);
    }
  }

  return stochValues;
}

function calculateSchaffTrend(candles, fastPeriod = 23, slowPeriod = 50, cyclePeriod = 10, smoothPeriod = 3) {
  const minDataRequired = slowPeriod + cyclePeriod + smoothPeriod;

  if (!candles || candles.length < minDataRequired) {
    return {
      signal: { type: 'NEUTRAL', score: 0, strength: 'WEAK', confidence: 0 },
      values: null,
      error: `Insufficient data for Schaff Trend Cycle (need ${minDataRequired} candles)`
    };
  }

  try {
    const closes = candles.map(c => parseFloat(c.close));

    // Step 1: Calculate MACD
    const fastEMAInput = { values: closes, period: fastPeriod };
    const slowEMAInput = { values: closes, period: slowPeriod };

    const fastEMA = technicalindicators.EMA.calculate(fastEMAInput);
    const slowEMA = technicalindicators.EMA.calculate(slowEMAInput);

    // Align EMAs
    const minLength = Math.min(fastEMA.length, slowEMA.length);
    const alignedFast = fastEMA.slice(-minLength);
    const alignedSlow = slowEMA.slice(-minLength);

    // Calculate MACD line
    const macdLine = [];
    for (let i = 0; i < alignedFast.length; i++) {
      macdLine.push(alignedFast[i] - alignedSlow[i]);
    }

    if (macdLine.length < cyclePeriod) {
      return {
        signal: { type: 'NEUTRAL', score: 0, strength: 'WEAK', confidence: 0 },
        values: null,
        error: 'Insufficient MACD values for Schaff Trend Cycle'
      };
    }

    // Step 2: Calculate Stochastic of MACD (Frac1)
    const stochMACD = calculateStochastic(macdLine, cyclePeriod);
    if (!stochMACD || stochMACD.length === 0) {
      return {
        signal: { type: 'NEUTRAL', score: 0, strength: 'WEAK', confidence: 0 },
        values: null,
        error: 'Stochastic MACD calculation failed'
      };
    }

    // Step 3: Smooth Frac1 with EMA
    const frac1EMAInput = {
      values: stochMACD,
      period: smoothPeriod
    };
    const frac1 = technicalindicators.EMA.calculate(frac1EMAInput);

    if (!frac1 || frac1.length < cyclePeriod) {
      return {
        signal: { type: 'NEUTRAL', score: 0, strength: 'WEAK', confidence: 0 },
        values: null,
        error: 'Frac1 calculation insufficient for next step'
      };
    }

    // Step 4: Calculate Stochastic of Frac1 (Frac2)
    const stochFrac1 = calculateStochastic(frac1, cyclePeriod);
    if (!stochFrac1 || stochFrac1.length === 0) {
      return {
        signal: { type: 'NEUTRAL', score: 0, strength: 'WEAK', confidence: 0 },
        values: null,
        error: 'Stochastic Frac1 calculation failed'
      };
    }

    // Step 5: Smooth Frac2 with EMA to get final STC
    const stcEMAInput = {
      values: stochFrac1,
      period: smoothPeriod
    };
    const stcValues = technicalindicators.EMA.calculate(stcEMAInput);

    if (!stcValues || stcValues.length === 0) {
      return {
        signal: { type: 'NEUTRAL', score: 0, strength: 'WEAK', confidence: 0 },
        values: null,
        error: 'STC calculation produced no results'
      };
    }

    const currentSTC = stcValues[stcValues.length - 1];
    const previousSTC = stcValues.length > 1 ? stcValues[stcValues.length - 2] : null;

    // Generate signal
    let signal = { type: 'NEUTRAL', score: 0, strength: 'WEAK', confidence: 50 };

    // STC oscillates between 0 and 100
    // Overbought: > 75
    // Oversold: < 25
    // Most reliable signal: crossovers of 25 and 75 levels

    // 1. Crossover of key levels (most powerful)
    if (previousSTC !== null) {
      // Bullish: STC crosses above 25 (oversold to neutral)
      if (previousSTC <= 25 && currentSTC > 25) {
        signal.type = 'BUY';
        signal.score = 70;
        signal.strength = 'VERY_STRONG';
        signal.confidence = 90;
        signal.reason = 'STC crossed above 25 (emerging from oversold - strong buy signal)';
      }
      // Very Bullish: STC crosses above 50 (confirming uptrend)
      else if (previousSTC <= 50 && currentSTC > 50 && previousSTC > 25) {
        signal.type = 'BUY';
        signal.score = 60;
        signal.strength = 'STRONG';
        signal.confidence = 85;
        signal.reason = 'STC crossed above 50 (uptrend confirmed)';
      }
      // Bearish: STC crosses below 75 (overbought to neutral)
      else if (previousSTC >= 75 && currentSTC < 75) {
        signal.type = 'SELL';
        signal.score = -70;
        signal.strength = 'VERY_STRONG';
        signal.confidence = 90;
        signal.reason = 'STC crossed below 75 (falling from overbought - strong sell signal)';
      }
      // Very Bearish: STC crosses below 50 (confirming downtrend)
      else if (previousSTC >= 50 && currentSTC < 50 && previousSTC < 75) {
        signal.type = 'SELL';
        signal.score = -60;
        signal.strength = 'STRONG';
        signal.confidence = 85;
        signal.reason = 'STC crossed below 50 (downtrend confirmed)';
      }
    }

    // 2. Extreme overbought/oversold zones
    if (signal.type === 'NEUTRAL') {
      // Deep oversold (< 20) - potential reversal
      if (currentSTC < 20) {
        signal.type = 'BUY';
        signal.score = Math.round(50 + (20 - currentSTC) * 1.5);
        signal.strength = 'STRONG';
        signal.confidence = 80;
        signal.reason = `STC deeply oversold (${currentSTC.toFixed(1)}) - high reversal probability`;
      }
      // Deep overbought (> 80) - potential reversal
      else if (currentSTC > 80) {
        signal.type = 'SELL';
        signal.score = Math.round(-50 - (currentSTC - 80) * 1.5);
        signal.strength = 'STRONG';
        signal.confidence = 80;
        signal.reason = `STC deeply overbought (${currentSTC.toFixed(1)}) - high reversal probability`;
      }
      // Oversold (20-25)
      else if (currentSTC >= 20 && currentSTC <= 25) {
        signal.type = 'BUY';
        signal.score = 45;
        signal.strength = 'MODERATE';
        signal.confidence = 70;
        signal.reason = 'STC in oversold zone (20-25)';
      }
      // Overbought (75-80)
      else if (currentSTC >= 75 && currentSTC <= 80) {
        signal.type = 'SELL';
        signal.score = -45;
        signal.strength = 'MODERATE';
        signal.confidence = 70;
        signal.reason = 'STC in overbought zone (75-80)';
      }
    }

    // 3. Mid-range signals (based on direction and momentum)
    if (signal.type === 'NEUTRAL' && previousSTC !== null) {
      const momentum = currentSTC - previousSTC;

      // Rising through mid-range (40-60)
      if (currentSTC > 40 && currentSTC < 60 && momentum > 0) {
        signal.type = 'BUY';
        signal.score = Math.round(25 + momentum * 3);
        signal.strength = 'MODERATE';
        signal.confidence = 65;
        signal.reason = 'STC rising through mid-range (building momentum)';
      }
      // Falling through mid-range (40-60)
      else if (currentSTC > 40 && currentSTC < 60 && momentum < 0) {
        signal.type = 'SELL';
        signal.score = Math.round(-25 + momentum * 3);
        signal.strength = 'MODERATE';
        signal.confidence = 65;
        signal.reason = 'STC falling through mid-range (losing momentum)';
      }
      // Above 60 and rising
      else if (currentSTC >= 60 && momentum > 0) {
        signal.type = 'BUY';
        signal.score = 30;
        signal.strength = 'MODERATE';
        signal.confidence = 60;
        signal.reason = 'STC in bullish zone and rising';
      }
      // Below 40 and falling
      else if (currentSTC <= 40 && momentum < 0) {
        signal.type = 'SELL';
        signal.score = -30;
        signal.strength = 'MODERATE';
        signal.confidence = 60;
        signal.reason = 'STC in bearish zone and falling';
      }
    }

    // 4. Weak directional signal
    if (signal.type === 'NEUTRAL') {
      if (currentSTC > 50) {
        signal.type = 'BUY';
        signal.score = Math.round(10 + (currentSTC - 50) * 0.3);
        signal.strength = 'WEAK';
        signal.confidence = 55;
        signal.reason = `STC above 50 (${currentSTC.toFixed(1)}) - mildly bullish`;
      } else if (currentSTC < 50) {
        signal.type = 'SELL';
        signal.score = Math.round(-10 - (50 - currentSTC) * 0.3);
        signal.strength = 'WEAK';
        signal.confidence = 55;
        signal.reason = `STC below 50 (${currentSTC.toFixed(1)}) - mildly bearish`;
      }
    }

    // Determine cycle phase
    let cyclePhase = 'NEUTRAL';
    if (currentSTC < 25) cyclePhase = 'OVERSOLD';
    else if (currentSTC < 40) cyclePhase = 'OVERSOLD_RECOVERY';
    else if (currentSTC < 60) cyclePhase = 'NEUTRAL';
    else if (currentSTC < 75) cyclePhase = 'OVERBOUGHT_BUILDING';
    else cyclePhase = 'OVERBOUGHT';

    return {
      signal,
      values: {
        stc: currentSTC,
        fastPeriod,
        slowPeriod,
        cyclePeriod,
        smoothPeriod
      },
      trend: currentSTC > 50 ? 'BULLISH' : 'BEARISH',
      cyclePhase: cyclePhase,
      momentum: previousSTC ? (currentSTC > previousSTC ? 'RISING' : 'FALLING') : 'NEUTRAL',
      history: {
        values: stcValues.slice(-20)
      }
    };

  } catch (error) {
    return {
      signal: { type: 'NEUTRAL', score: 0, strength: 'WEAK', confidence: 0 },
      values: null,
      error: `Schaff Trend Cycle calculation error: ${error.message}`
    };
  }
}

module.exports = {
  calculateSchaffTrend,
  name: 'Schaff Trend',
  category: 'MOMENTUM',
  description: 'Schaff Trend Cycle - Combines cycle analysis with trend, more accurate than MACD for cycle detection'
};
