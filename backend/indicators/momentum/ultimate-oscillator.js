/**
 * Ultimate Oscillator
 * Momentum oscillator using three timeframes
 */

function calculateUltimateOscillator(candles, period1 = 7, period2 = 14, period3 = 28) {
  if (!candles || candles.length < period3 + 1) {
    throw new Error('Insufficient data for Ultimate Oscillator calculation');
  }

  const calculateBP_TR = (candles) => {
    const results = [];
    for (let i = 1; i < candles.length; i++) {
      const close = candles[i].ohlc.close;
      const low = candles[i].ohlc.low;
      const prevClose = candles[i - 1].ohlc.close;
      const high = candles[i].ohlc.high;

      const bp = close - Math.min(low, prevClose);
      const tr = Math.max(high, prevClose) - Math.min(low, prevClose);

      results.push({ bp, tr });
    }
    return results;
  };

  const bpTrValues = calculateBP_TR(candles);

  const calculateAverage = (values, period) => {
    const recent = values.slice(-period);
    const sumBP = recent.reduce((sum, v) => sum + v.bp, 0);
    const sumTR = recent.reduce((sum, v) => sum + v.tr, 0);
    return sumTR === 0 ? 0 : sumBP / sumTR;
  };

  const avg1 = calculateAverage(bpTrValues, period1);
  const avg2 = calculateAverage(bpTrValues, period2);
  const avg3 = calculateAverage(bpTrValues, period3);

  const uo = ((4 * avg1) + (2 * avg2) + avg3) / 7 * 100;

  let signal = 'NEUTRAL';
  let score = 0;

  if (uo > 70) {
    signal = 'SELL';
    score = -60;
  } else if (uo < 30) {
    signal = 'BUY';
    score = 60;
  } else if (uo > 50) {
    signal = 'BUY';
    score = (uo - 50) * 1.5;
  } else if (uo < 50) {
    signal = 'SELL';
    score = (uo - 50) * 1.5;
  }

  return {
    name: 'Ultimate Oscillator',
    category: 'momentum',
    value: uo,
    signal: {
      action: signal,
      score: score,
      strength: Math.abs(score) > 50 ? 'MODERATE' : 'WEAK'
    },
    interpretation: uo > 70
      ? 'Overbought condition'
      : uo < 30
      ? 'Oversold condition'
      : `Neutral (${uo.toFixed(1)})`
  };
}

module.exports = { calculateUltimateOscillator };
