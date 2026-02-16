const technicalindicators = require('technicalindicators');

function calculateKlingerOscillator(candles, fastPeriod = 34, slowPeriod = 55, signalPeriod = 13) {
  if (!candles || candles.length < slowPeriod + signalPeriod) {
    return {
      signal: { type: 'NEUTRAL', score: 0, strength: 'WEAK', confidence: 0 },
      values: null,
      error: 'Insufficient data for Klinger Oscillator calculation'
    };
  }

  try {
    const highs = candles.map(c => parseFloat(c.high));
    const lows = candles.map(c => parseFloat(c.low));
    const closes = candles.map(c => parseFloat(c.close));
    const volumes = candles.map(c => parseFloat(c.volume));

    // Calculate Typical Price: (H + L + C) / 3
    const typicalPrices = [];
    for (let i = 0; i < candles.length; i++) {
      typicalPrices.push((highs[i] + lows[i] + closes[i]) / 3);
    }

    // Calculate trend direction
    // Trend = +1 if TP[i] > TP[i-1], else -1
    const trends = [1]; // First candle defaults to +1
    for (let i = 1; i < typicalPrices.length; i++) {
      trends.push(typicalPrices[i] > typicalPrices[i - 1] ? 1 : -1);
    }

    // Calculate daily measurement (DM): H - L
    const dailyMeasurements = [];
    for (let i = 0; i < candles.length; i++) {
      dailyMeasurements.push(highs[i] - lows[i]);
    }

    // Calculate cumulative measurement (CM)
    const cumulativeMeasurements = [dailyMeasurements[0]];
    for (let i = 1; i < dailyMeasurements.length; i++) {
      if (trends[i] === trends[i - 1]) {
        cumulativeMeasurements.push(cumulativeMeasurements[i - 1] + dailyMeasurements[i]);
      } else {
        cumulativeMeasurements.push(dailyMeasurements[i - 1] + dailyMeasurements[i]);
      }
    }

    // Calculate Volume Force (VF)
    // VF = Volume * Trend * |2 * ((DM / CM) - 1)| * 100
    const volumeForce = [];
    for (let i = 0; i < candles.length; i++) {
      const dmCmRatio = cumulativeMeasurements[i] !== 0 ?
        dailyMeasurements[i] / cumulativeMeasurements[i] : 0;
      const vf = volumes[i] * trends[i] * Math.abs(2 * (dmCmRatio - 1)) * 100;
      volumeForce.push(vf);
    }

    // Calculate EMAs of Volume Force
    const fastEMAInput = {
      values: volumeForce,
      period: fastPeriod
    };
    const slowEMAInput = {
      values: volumeForce,
      period: slowPeriod
    };

    const fastEMA = technicalindicators.EMA.calculate(fastEMAInput);
    const slowEMA = technicalindicators.EMA.calculate(slowEMAInput);

    // Align arrays (slowEMA will be shorter)
    const minLength = Math.min(fastEMA.length, slowEMA.length);
    const alignedFast = fastEMA.slice(-minLength);
    const alignedSlow = slowEMA.slice(-minLength);

    // Calculate Klinger Oscillator: Fast EMA - Slow EMA
    const klingerValues = [];
    for (let i = 0; i < alignedFast.length; i++) {
      klingerValues.push(alignedFast[i] - alignedSlow[i]);
    }

    if (klingerValues.length === 0) {
      return {
        signal: { type: 'NEUTRAL', score: 0, strength: 'WEAK', confidence: 0 },
        values: null,
        error: 'Klinger Oscillator calculation produced no results'
      };
    }

    // Calculate signal line (EMA of Klinger)
    const signalInput = {
      values: klingerValues,
      period: signalPeriod
    };
    const signalLine = technicalindicators.EMA.calculate(signalInput);

    const currentKlinger = klingerValues[klingerValues.length - 1];
    const previousKlinger = klingerValues.length > 1 ? klingerValues[klingerValues.length - 2] : null;
    const currentSignal = signalLine.length > 0 ? signalLine[signalLine.length - 1] : null;
    const previousSignal = signalLine.length > 1 ? signalLine[signalLine.length - 2] : null;

    // Generate signal
    let signal = { type: 'NEUTRAL', score: 0, strength: 'WEAK', confidence: 50 };

    // 1. Signal line crossover (primary signal)
    if (currentSignal !== null && previousSignal !== null && previousKlinger !== null) {
      // Bullish: Klinger crosses above signal line
      if (previousKlinger <= previousSignal && currentKlinger > currentSignal) {
        // Stronger if happening above zero line
        if (currentKlinger > 0) {
          signal.type = 'BUY';
          signal.score = 70;
          signal.strength = 'VERY_STRONG';
          signal.confidence = 85;
          signal.reason = 'Klinger crossed above signal line in bullish zone (strong buying pressure)';
        } else {
          signal.type = 'BUY';
          signal.score = 60;
          signal.strength = 'STRONG';
          signal.confidence = 80;
          signal.reason = 'Klinger crossed above signal line (buying pressure building)';
        }
      }
      // Bearish: Klinger crosses below signal line
      else if (previousKlinger >= previousSignal && currentKlinger < currentSignal) {
        // Stronger if happening below zero line
        if (currentKlinger < 0) {
          signal.type = 'SELL';
          signal.score = -70;
          signal.strength = 'VERY_STRONG';
          signal.confidence = 85;
          signal.reason = 'Klinger crossed below signal line in bearish zone (strong selling pressure)';
        } else {
          signal.type = 'SELL';
          signal.score = -60;
          signal.strength = 'STRONG';
          signal.confidence = 80;
          signal.reason = 'Klinger crossed below signal line (selling pressure building)';
        }
      }
    }

    // 2. Zero line crossover
    if (signal.type === 'NEUTRAL' && previousKlinger !== null) {
      if (previousKlinger <= 0 && currentKlinger > 0) {
        signal.type = 'BUY';
        signal.score = 55;
        signal.strength = 'STRONG';
        signal.confidence = 75;
        signal.reason = 'Klinger crossed above zero (volume confirming bullish trend)';
      } else if (previousKlinger >= 0 && currentKlinger < 0) {
        signal.type = 'SELL';
        signal.score = -55;
        signal.strength = 'STRONG';
        signal.confidence = 75;
        signal.reason = 'Klinger crossed below zero (volume confirming bearish trend)';
      }
    }

    // 3. Divergence detection
    if (signal.type === 'NEUTRAL' && klingerValues.length >= 20) {
      const recentCandles = candles.slice(-20);
      const recentKlinger = klingerValues.slice(-20);

      const priceHigh = Math.max(...recentCandles.map(c => parseFloat(c.high)));
      const priceLow = Math.min(...recentCandles.map(c => parseFloat(c.low)));
      const klingerHigh = Math.max(...recentKlinger);
      const klingerLow = Math.min(...recentKlinger);

      const currentPrice = parseFloat(candles[candles.length - 1].close);

      // Bullish divergence: price lower low, Klinger higher low
      if (currentPrice <= priceLow * 1.02 && currentKlinger >= klingerLow * 1.15) {
        signal.type = 'BUY';
        signal.score = 40;
        signal.strength = 'MODERATE';
        signal.confidence = 70;
        signal.reason = 'Bullish divergence on Klinger (volume not confirming price weakness)';
      }
      // Bearish divergence: price higher high, Klinger lower high
      else if (currentPrice >= priceHigh * 0.98 && currentKlinger <= klingerHigh * 0.85) {
        signal.type = 'SELL';
        signal.score = -40;
        signal.strength = 'MODERATE';
        signal.confidence = 70;
        signal.reason = 'Bearish divergence on Klinger (volume not confirming price strength)';
      }
    }

    // 4. Position and momentum
    if (signal.type === 'NEUTRAL') {
      const histogram = currentSignal ? currentKlinger - currentSignal : 0;

      // Normalize Klinger value for scoring
      const recentValues = klingerValues.slice(-50);
      const maxAbs = Math.max(...recentValues.map(Math.abs));
      const normalizedKlinger = maxAbs > 0 ? (currentKlinger / maxAbs) * 100 : 0;

      if (currentKlinger > 0 && histogram > 0) {
        signal.type = 'BUY';
        signal.score = Math.min(35, Math.abs(normalizedKlinger * 0.35));
        signal.strength = signal.score >= 25 ? 'MODERATE' : 'WEAK';
        signal.confidence = signal.score >= 25 ? 65 : 60;
        signal.reason = 'Klinger above zero and signal line (volume supporting uptrend)';
      } else if (currentKlinger < 0 && histogram < 0) {
        signal.type = 'SELL';
        signal.score = Math.max(-35, -Math.abs(normalizedKlinger * 0.35));
        signal.strength = Math.abs(signal.score) >= 25 ? 'MODERATE' : 'WEAK';
        signal.confidence = Math.abs(signal.score) >= 25 ? 65 : 60;
        signal.reason = 'Klinger below zero and signal line (volume supporting downtrend)';
      } else if (histogram > 0) {
        signal.type = 'BUY';
        signal.score = 15;
        signal.strength = 'WEAK';
        signal.confidence = 55;
        signal.reason = 'Klinger above signal line';
      } else if (histogram < 0) {
        signal.type = 'SELL';
        signal.score = -15;
        signal.strength = 'WEAK';
        signal.confidence = 55;
        signal.reason = 'Klinger below signal line';
      }
    }

    return {
      signal,
      values: {
        klinger: currentKlinger,
        signal: currentSignal,
        histogram: currentSignal ? currentKlinger - currentSignal : null,
        fastPeriod,
        slowPeriod,
        signalPeriod
      },
      trend: currentKlinger > 0 ? 'BULLISH' : 'BEARISH',
      volumeTrend: currentKlinger > (previousKlinger || 0) ? 'INCREASING' : 'DECREASING',
      history: {
        klinger: klingerValues.slice(-20),
        signal: signalLine.slice(-20)
      }
    };

  } catch (error) {
    return {
      signal: { type: 'NEUTRAL', score: 0, strength: 'WEAK', confidence: 0 },
      values: null,
      error: `Klinger Oscillator calculation error: ${error.message}`
    };
  }
}

module.exports = {
  calculateKlingerOscillator,
  name: 'Klinger Oscillator',
  category: 'VOLUME',
  description: 'Klinger Volume Oscillator - Volume-price momentum indicator, often superior to OBV for trend detection'
};
