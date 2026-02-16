function calculatePVT(candles) {
  if (!candles || candles.length < 2) {
    return {
      signal: { type: 'NEUTRAL', score: 0, strength: 'WEAK', confidence: 0 },
      values: null,
      error: 'Insufficient data for PVT calculation'
    };
  }

  try {
    const closes = candles.map(c => parseFloat(c.close));
    const volumes = candles.map(c => parseFloat(c.volume));

    // Calculate PVT
    // PVT[i] = PVT[i-1] + (Volume[i] * (Close[i] - Close[i-1]) / Close[i-1])
    const pvtValues = [0]; // Start at 0

    for (let i = 1; i < candles.length; i++) {
      const priceChange = closes[i] - closes[i - 1];
      const priceChangePercent = priceChange / closes[i - 1];
      const volumeContribution = volumes[i] * priceChangePercent;

      pvtValues.push(pvtValues[i - 1] + volumeContribution);
    }

    const currentPVT = pvtValues[pvtValues.length - 1];
    const previousPVT = pvtValues.length > 1 ? pvtValues[pvtValues.length - 2] : null;

    // Calculate trend using moving average
    const maPeriod = Math.min(20, Math.floor(pvtValues.length / 2));
    let pvtMA = null;

    if (pvtValues.length >= maPeriod) {
      const recent = pvtValues.slice(-maPeriod);
      pvtMA = recent.reduce((sum, val) => sum + val, 0) / maPeriod;
    }

    // Generate signal
    let signal = { type: 'NEUTRAL', score: 0, strength: 'WEAK', confidence: 50 };

    // 1. Zero line crossover
    if (previousPVT !== null) {
      if (previousPVT <= 0 && currentPVT > 0) {
        signal.type = 'BUY';
        signal.score = 55;
        signal.strength = 'STRONG';
        signal.confidence = 80;
        signal.reason = 'PVT crossed above zero (volume confirming bullish trend)';
      } else if (previousPVT >= 0 && currentPVT < 0) {
        signal.type = 'SELL';
        signal.score = -55;
        signal.strength = 'STRONG';
        signal.confidence = 80;
        signal.reason = 'PVT crossed below zero (volume confirming bearish trend)';
      }
    }

    // 2. Divergence detection
    if (signal.type === 'NEUTRAL' && candles.length >= 20) {
      const recentCandles = candles.slice(-20);
      const recentPVT = pvtValues.slice(-20);
      const recentCloses = recentCandles.map(c => parseFloat(c.close));

      const priceHigh = Math.max(...recentCloses.map((c, i) => parseFloat(recentCandles[i].high)));
      const priceLow = Math.min(...recentCloses.map((c, i) => parseFloat(recentCandles[i].low)));
      const pvtHigh = Math.max(...recentPVT);
      const pvtLow = Math.min(...recentPVT);

      const currentPrice = closes[closes.length - 1];

      // Bullish divergence: price lower low, PVT higher low
      if (currentPrice <= priceLow * 1.02 && currentPVT >= pvtLow * 1.15) {
        signal.type = 'BUY';
        signal.score = 50;
        signal.strength = 'STRONG';
        signal.confidence = 75;
        signal.reason = 'Bullish divergence on PVT (volume not confirming price weakness)';
      }
      // Bearish divergence: price higher high, PVT lower high
      else if (currentPrice >= priceHigh * 0.98 && currentPVT <= pvtHigh * 0.85) {
        signal.type = 'SELL';
        signal.score = -50;
        signal.strength = 'STRONG';
        signal.confidence = 75;
        signal.reason = 'Bearish divergence on PVT (volume not confirming price strength)';
      }
    }

    // 3. Trend and momentum
    if (signal.type === 'NEUTRAL' && previousPVT !== null) {
      const momentum = currentPVT - previousPVT;

      // Strong upward momentum
      if (currentPVT > 0 && momentum > 0 && pvtMA && currentPVT > pvtMA) {
        signal.type = 'BUY';
        signal.score = 40;
        signal.strength = 'MODERATE';
        signal.confidence = 70;
        signal.reason = 'PVT trending up with strong volume support';
      }
      // Strong downward momentum
      else if (currentPVT < 0 && momentum < 0 && pvtMA && currentPVT < pvtMA) {
        signal.type = 'SELL';
        signal.score = -40;
        signal.strength = 'MODERATE';
        signal.confidence = 70;
        signal.reason = 'PVT trending down with strong volume pressure';
      }
      // Rising PVT
      else if (momentum > 0) {
        signal.type = 'BUY';
        signal.score = 25;
        signal.strength = 'WEAK';
        signal.confidence = 60;
        signal.reason = 'PVT rising (volume supporting upward price movement)';
      }
      // Falling PVT
      else if (momentum < 0) {
        signal.type = 'SELL';
        signal.score = -25;
        signal.strength = 'WEAK';
        signal.confidence = 60;
        signal.reason = 'PVT falling (volume supporting downward price movement)';
      }
    }

    // 4. Position relative to MA
    if (signal.type === 'NEUTRAL' && pvtMA !== null) {
      if (currentPVT > pvtMA) {
        signal.type = 'BUY';
        signal.score = 20;
        signal.strength = 'WEAK';
        signal.confidence = 55;
        signal.reason = 'PVT above MA (bullish volume trend)';
      } else if (currentPVT < pvtMA) {
        signal.type = 'SELL';
        signal.score = -20;
        signal.strength = 'WEAK';
        signal.confidence = 55;
        signal.reason = 'PVT below MA (bearish volume trend)';
      }
    }

    // Determine trend strength
    let trendStrength = 'NEUTRAL';
    if (pvtValues.length >= 5) {
      const recent5 = pvtValues.slice(-5);
      const isRising = recent5.every((val, i, arr) => i === 0 || val >= arr[i - 1]);
      const isFalling = recent5.every((val, i, arr) => i === 0 || val <= arr[i - 1]);

      if (isRising) trendStrength = 'STRONG_BULLISH';
      else if (isFalling) trendStrength = 'STRONG_BEARISH';
      else if (currentPVT > (previousPVT || 0)) trendStrength = 'BULLISH';
      else if (currentPVT < (previousPVT || 0)) trendStrength = 'BEARISH';
    }

    return {
      signal,
      values: {
        pvt: currentPVT,
        pvtMA: pvtMA
      },
      trend: currentPVT > 0 ? 'BULLISH' : 'BEARISH',
      trendStrength: trendStrength,
      volumeSupport: currentPVT > (pvtMA || 0) ? 'STRONG' : 'WEAK',
      history: {
        values: pvtValues.slice(-20)
      }
    };

  } catch (error) {
    return {
      signal: { type: 'NEUTRAL', score: 0, strength: 'WEAK', confidence: 0 },
      values: null,
      error: `PVT calculation error: ${error.message}`
    };
  }
}

module.exports = {
  calculatePVT,
  name: 'PVT',
  category: 'VOLUME',
  description: 'Price-Volume Trend - OBV variant weighted by percentage price change, more sensitive to price movements'
};
