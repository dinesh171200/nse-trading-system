/**
 * Supertrend Indicator
 * Popular trend-following indicator
 */

const technicalIndicators = require('technicalindicators');

function calculateSupertrend(candles, period = 10, multiplier = 3) {
  if (!candles || candles.length < period + 1) {
    throw new Error('Insufficient data for Supertrend calculation');
  }

  // Calculate ATR values for all candles
  const high = candles.map(c => c.ohlc.high);
  const low = candles.map(c => c.ohlc.low);
  const close = candles.map(c => c.ohlc.close);

  const atrArray = technicalIndicators.ATR.calculate({
    high,
    low,
    close,
    period
  });

  if (!atrArray || atrArray.length === 0) {
    throw new Error('ATR calculation failed for Supertrend');
  }

  const supertrend = [];
  let trend = 1; // 1 = uptrend, -1 = downtrend

  // Start from period index since ATR needs warmup
  for (let i = period; i < candles.length; i++) {
    const candleHigh = candles[i].ohlc.high;
    const candleLow = candles[i].ohlc.low;
    const candleClose = candles[i].ohlc.close;
    const atrValue = atrArray[i - period] || 0;

    const basicUpperBand = (candleHigh + candleLow) / 2 + multiplier * atrValue;
    const basicLowerBand = (candleHigh + candleLow) / 2 - multiplier * atrValue;

    let finalUpperBand = basicUpperBand;
    let finalLowerBand = basicLowerBand;

    if (supertrend.length > 0) {
      const prevClose = candles[i - 1].ohlc.close;
      const prevUpper = supertrend[supertrend.length - 1]?.upperBand || basicUpperBand;
      const prevLower = supertrend[supertrend.length - 1]?.lowerBand || basicLowerBand;

      finalUpperBand = basicUpperBand < prevUpper || prevClose > prevUpper ? basicUpperBand : prevUpper;
      finalLowerBand = basicLowerBand > prevLower || prevClose < prevLower ? basicLowerBand : prevLower;

      // Determine trend
      if (candleClose <= finalUpperBand) {
        trend = -1;
      } else if (candleClose >= finalLowerBand) {
        trend = 1;
      }
    }

    supertrend.push({
      upperBand: finalUpperBand,
      lowerBand: finalLowerBand,
      trend: trend,
      value: trend === 1 ? finalLowerBand : finalUpperBand
    });
  }

  const current = supertrend[supertrend.length - 1];
  const previous = supertrend[supertrend.length - 2];

  let signal = 'NEUTRAL';
  let score = 0;

  if (current.trend === 1) {
    signal = 'BUY';
    score = 70;

    // Stronger signal if just flipped to uptrend
    if (previous && previous.trend === -1) {
      score = 85;
    }
  } else if (current.trend === -1) {
    signal = 'SELL';
    score = -70;

    // Stronger signal if just flipped to downtrend
    if (previous && previous.trend === 1) {
      score = -85;
    }
  }

  return {
    name: 'Supertrend',
    category: 'trend',
    value: current.value,
    trend: current.trend === 1 ? 'UP' : 'DOWN',
    upperBand: current.upperBand,
    lowerBand: current.lowerBand,
    signal: {
      action: signal,
      score: score,
      strength: Math.abs(score) > 80 ? 'STRONG' : Math.abs(score) > 60 ? 'MODERATE' : 'WEAK'
    },
    interpretation: current.trend === 1
      ? 'Price above Supertrend - Bullish trend'
      : 'Price below Supertrend - Bearish trend'
  };
}

module.exports = {
  calculateSupertrend
};
