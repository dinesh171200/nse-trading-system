const technicalindicators = require('technicalindicators');

function calculateWaveTrend(candles, channelLength = 10, averageLength = 21, movingAverageLength = 4) {
  if (!candles || candles.length < channelLength + averageLength + movingAverageLength) {
    return {
      signal: { type: 'NEUTRAL', score: 0, strength: 'WEAK', confidence: 0 },
      values: null,
      error: 'Insufficient data for WaveTrend calculation'
    };
  }

  try {
    const highs = candles.map(c => parseFloat(c.high));
    const lows = candles.map(c => parseFloat(c.low));
    const closes = candles.map(c => parseFloat(c.close));

    // Calculate typical price (HLC/3)
    const typicalPrices = [];
    for (let i = 0; i < candles.length; i++) {
      typicalPrices.push((highs[i] + lows[i] + closes[i]) / 3);
    }

    // Calculate EMA of typical price
    const esa = technicalindicators.EMA.calculate({
      values: typicalPrices,
      period: channelLength
    });

    // Calculate absolute differences for d calculation
    const absoluteDiffs = [];
    const esaStartIndex = typicalPrices.length - esa.length;

    for (let i = 0; i < esa.length; i++) {
      const tpIndex = esaStartIndex + i;
      absoluteDiffs.push(Math.abs(typicalPrices[tpIndex] - esa[i]));
    }

    // Calculate EMA of absolute differences
    const d = technicalindicators.EMA.calculate({
      values: absoluteDiffs,
      period: channelLength
    });

    // Calculate ci (WaveTrend indicator)
    const ci = [];
    const dStartIndex = absoluteDiffs.length - d.length;

    for (let i = 0; i < d.length; i++) {
      const esaIndex = esa.length - d.length + i;
      const tpIndex = typicalPrices.length - d.length + i;

      if (d[i] !== 0) {
        ci.push((typicalPrices[tpIndex] - esa[esaIndex]) / (0.015 * d[i]));
      } else {
        ci.push(0);
      }
    }

    if (ci.length === 0) {
      return {
        signal: { type: 'NEUTRAL', score: 0, strength: 'WEAK', confidence: 0 },
        values: null,
        error: 'WaveTrend ci calculation failed'
      };
    }

    // Calculate WaveTrend Line 1 (EMA of ci)
    const wt1 = technicalindicators.EMA.calculate({
      values: ci,
      period: averageLength
    });

    // Calculate WaveTrend Line 2 (SMA of wt1)
    const wt2 = technicalindicators.SMA.calculate({
      values: wt1,
      period: movingAverageLength
    });

    if (!wt1 || wt1.length === 0 || !wt2 || wt2.length === 0) {
      return {
        signal: { type: 'NEUTRAL', score: 0, strength: 'WEAK', confidence: 0 },
        values: null,
        error: 'WaveTrend line calculation failed'
      };
    }

    const currentWT1 = wt1[wt1.length - 1];
    const previousWT1 = wt1.length > 1 ? wt1[wt1.length - 2] : null;
    const currentWT2 = wt2[wt2.length - 1];
    const previousWT2 = wt2.length > 1 ? wt2[wt2.length - 2] : null;

    // Generate signal
    let signal = { type: 'NEUTRAL', score: 0, strength: 'WEAK', confidence: 50 };

    // WaveTrend oscillates typically between -80 and +80
    // Overbought: > 60
    // Oversold: < -60
    // Most reliable: crossovers in extreme zones

    // 1. Signal line crossover (primary signal)
    if (previousWT1 !== null && previousWT2 !== null) {
      // Bullish crossover: WT1 crosses above WT2
      if (previousWT1 <= previousWT2 && currentWT1 > currentWT2) {
        // Stronger if in oversold zone
        if (currentWT1 < -40) {
          signal.type = 'BUY';
          signal.score = 70;
          signal.strength = 'VERY_STRONG';
          signal.confidence = 90;
          signal.reason = `WaveTrend bullish crossover in oversold zone (${currentWT1.toFixed(1)})`;
        } else {
          signal.type = 'BUY';
          signal.score = 55;
          signal.strength = 'STRONG';
          signal.confidence = 80;
          signal.reason = 'WaveTrend bullish crossover';
        }
      }
      // Bearish crossover: WT1 crosses below WT2
      else if (previousWT1 >= previousWT2 && currentWT1 < currentWT2) {
        // Stronger if in overbought zone
        if (currentWT1 > 40) {
          signal.type = 'SELL';
          signal.score = -70;
          signal.strength = 'VERY_STRONG';
          signal.confidence = 90;
          signal.reason = `WaveTrend bearish crossover in overbought zone (${currentWT1.toFixed(1)})`;
        } else {
          signal.type = 'SELL';
          signal.score = -55;
          signal.strength = 'STRONG';
          signal.confidence = 80;
          signal.reason = 'WaveTrend bearish crossover';
        }
      }
    }

    // 2. Extreme overbought/oversold
    if (signal.type === 'NEUTRAL') {
      // Deep oversold (< -60)
      if (currentWT1 < -60) {
        signal.type = 'BUY';
        signal.score = Math.round(50 + Math.min(20, Math.abs(currentWT1 + 60) * 0.5));
        signal.strength = 'STRONG';
        signal.confidence = 85;
        signal.reason = `WaveTrend deeply oversold (${currentWT1.toFixed(1)}) - reversal likely`;
      }
      // Deep overbought (> 60)
      else if (currentWT1 > 60) {
        signal.type = 'SELL';
        signal.score = Math.round(-50 - Math.min(20, (currentWT1 - 60) * 0.5));
        signal.strength = 'STRONG';
        signal.confidence = 85;
        signal.reason = `WaveTrend deeply overbought (${currentWT1.toFixed(1)}) - reversal likely`;
      }
      // Oversold (-40 to -60)
      else if (currentWT1 < -40) {
        signal.type = 'BUY';
        signal.score = 40;
        signal.strength = 'MODERATE';
        signal.confidence = 70;
        signal.reason = `WaveTrend oversold (${currentWT1.toFixed(1)})`;
      }
      // Overbought (40 to 60)
      else if (currentWT1 > 40) {
        signal.type = 'SELL';
        signal.score = -40;
        signal.strength = 'MODERATE';
        signal.confidence = 70;
        signal.reason = `WaveTrend overbought (${currentWT1.toFixed(1)})`;
      }
    }

    // 3. Mid-range momentum
    if (signal.type === 'NEUTRAL' && previousWT1 !== null) {
      const momentum = currentWT1 - previousWT1;

      // Rising momentum in bullish zone
      if (currentWT1 > 0 && currentWT1 > currentWT2 && momentum > 0) {
        signal.type = 'BUY';
        signal.score = Math.round(20 + Math.min(15, currentWT1 * 0.5));
        signal.strength = 'MODERATE';
        signal.confidence = 65;
        signal.reason = 'WaveTrend rising in bullish zone';
      }
      // Falling momentum in bearish zone
      else if (currentWT1 < 0 && currentWT1 < currentWT2 && momentum < 0) {
        signal.type = 'SELL';
        signal.score = Math.round(-20 + Math.max(-15, currentWT1 * 0.5));
        signal.strength = 'MODERATE';
        signal.confidence = 65;
        signal.reason = 'WaveTrend falling in bearish zone';
      }
      // Above signal line
      else if (currentWT1 > currentWT2) {
        signal.type = 'BUY';
        signal.score = 15;
        signal.strength = 'WEAK';
        signal.confidence = 55;
        signal.reason = 'WaveTrend above signal line';
      }
      // Below signal line
      else if (currentWT1 < currentWT2) {
        signal.type = 'SELL';
        signal.score = -15;
        signal.strength = 'WEAK';
        signal.confidence = 55;
        signal.reason = 'WaveTrend below signal line';
      }
    }

    // Determine zone
    let zone = 'NEUTRAL';
    if (currentWT1 < -60) zone = 'DEEP_OVERSOLD';
    else if (currentWT1 < -40) zone = 'OVERSOLD';
    else if (currentWT1 < -20) zone = 'WEAK_BEARISH';
    else if (currentWT1 < 20) zone = 'NEUTRAL';
    else if (currentWT1 < 40) zone = 'WEAK_BULLISH';
    else if (currentWT1 < 60) zone = 'OVERBOUGHT';
    else zone = 'DEEP_OVERBOUGHT';

    return {
      signal,
      values: {
        wt1: currentWT1,
        wt2: currentWT2,
        channelLength,
        averageLength,
        movingAverageLength
      },
      zone: zone,
      trend: currentWT1 > 0 ? 'BULLISH' : 'BEARISH',
      momentum: previousWT1 ? (currentWT1 > previousWT1 ? 'RISING' : 'FALLING') : 'NEUTRAL',
      history: {
        wt1: wt1.slice(-20),
        wt2: wt2.slice(-20)
      }
    };

  } catch (error) {
    return {
      signal: { type: 'NEUTRAL', score: 0, strength: 'WEAK', confidence: 0 },
      values: null,
      error: `WaveTrend calculation error: ${error.message}`
    };
  }
}

module.exports = {
  calculateWaveTrend,
  name: 'WaveTrend',
  category: 'MOMENTUM',
  description: 'WaveTrend Oscillator - Advanced momentum indicator based on moving averages, more accurate than traditional oscillators'
};
