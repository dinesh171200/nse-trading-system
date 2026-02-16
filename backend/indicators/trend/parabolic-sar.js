/**
 * Parabolic SAR (Stop and Reverse)
 * Trend-following indicator
 */

function calculateParabolicSAR(candles, accelerationFactor = 0.02, maxAF = 0.2) {
  if (!candles || candles.length < 5) {
    throw new Error('Insufficient data for Parabolic SAR calculation');
  }

  const sar = [];
  let af = accelerationFactor;
  let ep = candles[0].ohlc.high; // Extreme Point
  let trend = 1; // 1 = uptrend, -1 = downtrend
  let sarValue = candles[0].ohlc.low;

  for (let i = 1; i < candles.length; i++) {
    const high = candles[i].ohlc.high;
    const low = candles[i].ohlc.low;
    const close = candles[i].ohlc.close;

    // Calculate new SAR
    sarValue = sarValue + af * (ep - sarValue);

    // Check for reversal
    if (trend === 1) {
      // Uptrend
      if (low < sarValue) {
        // Reversal to downtrend
        trend = -1;
        sarValue = ep;
        ep = low;
        af = accelerationFactor;
      } else {
        // Continue uptrend
        if (high > ep) {
          ep = high;
          af = Math.min(af + accelerationFactor, maxAF);
        }
      }
    } else {
      // Downtrend
      if (high > sarValue) {
        // Reversal to uptrend
        trend = 1;
        sarValue = ep;
        ep = high;
        af = accelerationFactor;
      } else {
        // Continue downtrend
        if (low < ep) {
          ep = low;
          af = Math.min(af + accelerationFactor, maxAF);
        }
      }
    }

    sar.push({ value: sarValue, trend, ep, af });
  }

  const current = sar[sar.length - 1];
  const currentPrice = candles[candles.length - 1].ohlc.close;

  let signal = 'NEUTRAL';
  let score = 0;

  if (current.trend === 1) {
    signal = 'BUY';
    score = 65;
  } else if (current.trend === -1) {
    signal = 'SELL';
    score = -65;
  }

  return {
    name: 'Parabolic SAR',
    category: 'trend',
    value: current.value,
    trend: current.trend === 1 ? 'UP' : 'DOWN',
    accelerationFactor: current.af,
    extremePoint: current.ep,
    signal: {
      action: signal,
      score: score,
      strength: 'MODERATE'
    },
    interpretation: current.trend === 1
      ? `SAR below price (${current.value.toFixed(2)}) - Uptrend`
      : `SAR above price (${current.value.toFixed(2)}) - Downtrend`
  };
}

module.exports = {
  calculateParabolicSAR
};
