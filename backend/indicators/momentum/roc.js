/**
 * ROC (Rate of Change)
 * Momentum oscillator measuring percentage price change
 */

function calculateROC(candles, period = 12) {
  if (!candles || candles.length < period + 1) {
    throw new Error(`Insufficient data for ROC calculation (need ${period + 1} candles)`);
  }

  const values = [];

  for (let i = period; i < candles.length; i++) {
    const currentClose = candles[i].ohlc.close;
    const pastClose = candles[i - period].ohlc.close;

    const roc = ((currentClose - pastClose) / pastClose) * 100;
    values.push(roc);
  }

  const currentROC = values[values.length - 1];

  let signal = 'NEUTRAL';
  let score = 0;

  if (currentROC > 5) {
    signal = 'BUY';
    score = Math.min(currentROC * 10, 80);
  } else if (currentROC < -5) {
    signal = 'SELL';
    score = Math.max(currentROC * 10, -80);
  } else if (currentROC > 0) {
    signal = 'BUY';
    score = currentROC * 8;
  } else if (currentROC < 0) {
    signal = 'SELL';
    score = currentROC * 8;
  }

  return {
    name: `ROC(${period})`,
    category: 'momentum',
    value: currentROC,
    values: values,
    signal: {
      action: signal,
      score: score,
      strength: Math.abs(score) > 60 ? 'STRONG' : Math.abs(score) > 30 ? 'MODERATE' : 'WEAK'
    },
    interpretation: currentROC > 0
      ? `Positive momentum (+${currentROC.toFixed(2)}%)`
      : `Negative momentum (${currentROC.toFixed(2)}%)`
  };
}

module.exports = {
  calculateROC
};
