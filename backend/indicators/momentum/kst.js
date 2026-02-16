const technicalindicators = require('technicalindicators');

function calculateKST(candles, rocPeriods = [10, 15, 20, 30], smaPeriods = [10, 10, 10, 15], signalPeriod = 9) {
  const minDataRequired = Math.max(...rocPeriods) + Math.max(...smaPeriods) + signalPeriod;

  if (!candles || candles.length < minDataRequired) {
    return {
      signal: { type: 'NEUTRAL', score: 0, strength: 'WEAK', confidence: 0 },
      values: null,
      error: `Insufficient data for KST calculation (need ${minDataRequired} candles)`
    };
  }

  try {
    const closes = candles.map(c => parseFloat(c.close));

    // Calculate ROC for each period
    const rocValues = [];
    for (let i = 0; i < rocPeriods.length; i++) {
      const rocInput = {
        values: closes,
        period: rocPeriods[i]
      };
      const roc = technicalindicators.ROC.calculate(rocInput);
      rocValues.push(roc);
    }

    // Find minimum length across all ROC calculations
    const minLength = Math.min(...rocValues.map(r => r.length));

    // Align all ROC arrays to the same length
    const alignedROC = rocValues.map(roc => roc.slice(-minLength));

    // Calculate SMA of each ROC
    const smoothedROC = [];
    for (let i = 0; i < alignedROC.length; i++) {
      const smaInput = {
        values: alignedROC[i],
        period: smaPeriods[i]
      };
      const sma = technicalindicators.SMA.calculate(smaInput);
      smoothedROC.push(sma);
    }

    // Find minimum length after smoothing
    const minSmoothedLength = Math.min(...smoothedROC.map(s => s.length));
    const alignedSmoothed = smoothedROC.map(s => s.slice(-minSmoothedLength));

    // Calculate KST: weighted sum of smoothed ROCs
    // Standard weights: 1, 2, 3, 4 (higher weight for longer timeframes)
    const weights = [1, 2, 3, 4];
    const kstLine = [];

    for (let i = 0; i < alignedSmoothed[0].length; i++) {
      let kstValue = 0;
      for (let j = 0; j < alignedSmoothed.length; j++) {
        kstValue += alignedSmoothed[j][i] * weights[j];
      }
      kstLine.push(kstValue);
    }

    if (kstLine.length === 0) {
      return {
        signal: { type: 'NEUTRAL', score: 0, strength: 'WEAK', confidence: 0 },
        values: null,
        error: 'KST calculation produced no results'
      };
    }

    // Calculate signal line (SMA of KST)
    const signalInput = {
      values: kstLine,
      period: signalPeriod
    };
    const signalLine = technicalindicators.SMA.calculate(signalInput);

    const currentKST = kstLine[kstLine.length - 1];
    const previousKST = kstLine.length > 1 ? kstLine[kstLine.length - 2] : null;
    const currentSignal = signalLine.length > 0 ? signalLine[signalLine.length - 1] : null;
    const previousSignal = signalLine.length > 1 ? signalLine[signalLine.length - 2] : null;

    // Generate signal
    let signal = { type: 'NEUTRAL', score: 0, strength: 'WEAK', confidence: 50 };

    // 1. Zero line crossover (most powerful)
    if (previousKST !== null) {
      if (previousKST <= 0 && currentKST > 0) {
        signal.type = 'BUY';
        signal.score = 80;
        signal.strength = 'VERY_STRONG';
        signal.confidence = 90;
        signal.reason = 'KST crossed above zero (strong bullish momentum across all timeframes)';
      } else if (previousKST >= 0 && currentKST < 0) {
        signal.type = 'SELL';
        signal.score = -80;
        signal.strength = 'VERY_STRONG';
        signal.confidence = 90;
        signal.reason = 'KST crossed below zero (strong bearish momentum across all timeframes)';
      }
    }

    // 2. Signal line crossover
    if (signal.type === 'NEUTRAL' && currentSignal !== null && previousSignal !== null) {
      if (previousKST <= previousSignal && currentKST > currentSignal) {
        signal.type = 'BUY';
        signal.score = currentKST > 0 ? 65 : 50;
        signal.strength = currentKST > 0 ? 'STRONG' : 'MODERATE';
        signal.confidence = currentKST > 0 ? 85 : 75;
        signal.reason = 'KST crossed above signal line';
      } else if (previousKST >= previousSignal && currentKST < currentSignal) {
        signal.type = 'SELL';
        signal.score = currentKST < 0 ? -65 : -50;
        signal.strength = currentKST < 0 ? 'STRONG' : 'MODERATE';
        signal.confidence = currentKST < 0 ? 85 : 75;
        signal.reason = 'KST crossed below signal line';
      }
    }

    // 3. Divergence detection (if no crossover)
    if (signal.type === 'NEUTRAL' && kstLine.length >= 20) {
      const recentCandles = candles.slice(-20);
      const recentKST = kstLine.slice(-20);

      const priceHigh = Math.max(...recentCandles.map(c => parseFloat(c.high)));
      const priceLow = Math.min(...recentCandles.map(c => parseFloat(c.low)));
      const kstHigh = Math.max(...recentKST);
      const kstLow = Math.min(...recentKST);

      const currentPrice = parseFloat(candles[candles.length - 1].close);

      // Bullish divergence: price lower low, KST higher low
      if (currentPrice <= priceLow * 1.02 && currentKST >= kstLow * 1.2) {
        signal.type = 'BUY';
        signal.score = 55;
        signal.strength = 'MODERATE';
        signal.confidence = 75;
        signal.reason = 'Bullish divergence on KST (potential reversal)';
      }
      // Bearish divergence: price higher high, KST lower high
      else if (currentPrice >= priceHigh * 0.98 && currentKST <= kstHigh * 0.8) {
        signal.type = 'SELL';
        signal.score = -55;
        signal.strength = 'MODERATE';
        signal.confidence = 75;
        signal.reason = 'Bearish divergence on KST (potential reversal)';
      }
    }

    // 4. Extreme readings
    if (signal.type === 'NEUTRAL') {
      // Calculate KST range from recent history
      const recentKST = kstLine.slice(-50);
      const kstMax = Math.max(...recentKST);
      const kstMin = Math.min(...recentKST);
      const kstRange = kstMax - kstMin;

      if (kstRange > 0) {
        const normalizedKST = ((currentKST - kstMin) / kstRange) * 100;

        // Overbought/oversold based on position in range
        if (normalizedKST > 80 && currentKST > currentSignal) {
          signal.type = 'BUY';
          signal.score = 35;
          signal.strength = 'MODERATE';
          signal.confidence = 65;
          signal.reason = 'KST in strong bullish zone';
        } else if (normalizedKST < 20 && currentKST < currentSignal) {
          signal.type = 'SELL';
          signal.score = -35;
          signal.strength = 'MODERATE';
          signal.confidence = 65;
          signal.reason = 'KST in strong bearish zone';
        }
      }
    }

    // 5. Position-based signal
    if (signal.type === 'NEUTRAL') {
      if (currentKST > 0 && currentSignal && currentKST > currentSignal) {
        signal.type = 'BUY';
        signal.score = Math.min(30, Math.abs(currentKST) / 5);
        signal.strength = 'WEAK';
        signal.confidence = 60;
        signal.reason = 'KST above zero and signal line (bullish)';
      } else if (currentKST < 0 && currentSignal && currentKST < currentSignal) {
        signal.type = 'SELL';
        signal.score = Math.max(-30, -Math.abs(currentKST) / 5);
        signal.strength = 'WEAK';
        signal.confidence = 60;
        signal.reason = 'KST below zero and signal line (bearish)';
      }
    }

    // Calculate momentum direction
    let momentum = 'NEUTRAL';
    if (previousKST !== null) {
      if (currentKST > previousKST) momentum = 'INCREASING';
      else if (currentKST < previousKST) momentum = 'DECREASING';
    }

    return {
      signal,
      values: {
        kst: currentKST,
        signal: currentSignal,
        histogram: currentSignal ? currentKST - currentSignal : null,
        rocPeriods,
        smaPeriods,
        signalPeriod
      },
      trend: currentKST > 0 ? 'BULLISH' : 'BEARISH',
      momentum: momentum,
      history: {
        kstLine: kstLine.slice(-20),
        signalLine: signalLine.slice(-20)
      }
    };

  } catch (error) {
    return {
      signal: { type: 'NEUTRAL', score: 0, strength: 'WEAK', confidence: 0 },
      values: null,
      error: `KST calculation error: ${error.message}`
    };
  }
}

module.exports = {
  calculateKST,
  name: 'KST',
  category: 'MOMENTUM',
  description: 'Know Sure Thing - Multi-timeframe momentum indicator by Martin Pring for trend reversals'
};
