/**
 * Chaikin Money Flow (CMF)
 * Volume-weighted average of accumulation/distribution over a period
 */

function calculateChaikinMoneyFlow(candles, period = 20) {
  if (!candles || candles.length < period) {
    throw new Error('Insufficient data for CMF calculation');
  }

  const recentCandles = candles.slice(-period);
  let sumMoneyFlowVolume = 0;
  let sumVolume = 0;

  for (const candle of recentCandles) {
    const high = candle.ohlc.high;
    const low = candle.ohlc.low;
    const close = candle.ohlc.close;
    const volume = candle.volume || 0;

    const mfm = high === low ? 0 : ((close - low) - (high - close)) / (high - low);
    const mfv = mfm * volume;

    sumMoneyFlowVolume += mfv;
    sumVolume += volume;
  }

  const cmf = sumVolume === 0 ? 0 : sumMoneyFlowVolume / sumVolume;

  let signal = 'NEUTRAL';
  let score = 0;

  if (cmf > 0.1) {
    signal = 'BUY';
    score = Math.min(cmf * 500, 75);
  } else if (cmf < -0.1) {
    signal = 'SELL';
    score = Math.max(cmf * 500, -75);
  } else if (cmf > 0) {
    signal = 'BUY';
    score = cmf * 400;
  } else if (cmf < 0) {
    signal = 'SELL';
    score = cmf * 400;
  }

  return {
    name: 'Chaikin Money Flow',
    category: 'volume',
    value: cmf,
    signal: {
      action: signal,
      score: score,
      strength: Math.abs(score) > 60 ? 'STRONG' : Math.abs(score) > 30 ? 'MODERATE' : 'WEAK'
    },
    interpretation: cmf > 0
      ? `Buying pressure (${(cmf * 100).toFixed(2)}%)`
      : `Selling pressure (${(cmf * 100).toFixed(2)}%)`
  };
}

module.exports = { calculateChaikinMoneyFlow };
