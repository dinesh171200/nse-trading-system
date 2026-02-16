/**
 * Donchian Channel
 * Volatility indicator based on highest high and lowest low
 */

function calculateDonchianChannel(candles, period = 20) {
  if (!candles || candles.length < period) {
    throw new Error('Insufficient data for Donchian Channel calculation');
  }

  const recentCandles = candles.slice(-period);
  const highs = recentCandles.map(c => c.ohlc.high);
  const lows = recentCandles.map(c => c.ohlc.low);

  const upperBand = Math.max(...highs);
  const lowerBand = Math.min(...lows);
  const middleLine = (upperBand + lowerBand) / 2;

  const currentPrice = candles[candles.length - 1].ohlc.close;
  const bandWidth = upperBand - lowerBand;
  const pricePosition = (currentPrice - lowerBand) / bandWidth;

  let signal = 'NEUTRAL';
  let score = 0;

  if (currentPrice >= upperBand * 0.98) {
    signal = 'BUY';
    score = 70;
  } else if (currentPrice <= lowerBand * 1.02) {
    signal = 'SELL';
    score = -70;
  } else if (pricePosition > 0.7) {
    signal = 'BUY';
    score = 45;
  } else if (pricePosition < 0.3) {
    signal = 'SELL';
    score = -45;
  }

  return {
    name: 'Donchian Channel',
    category: 'volatility',
    upperBand,
    middleLine,
    lowerBand,
    bandWidth,
    pricePosition: pricePosition * 100,
    signal: {
      action: signal,
      score: score,
      strength: Math.abs(score) > 60 ? 'STRONG' : 'MODERATE'
    },
    interpretation: currentPrice >= upperBand * 0.98
      ? 'Price at upper band - Breakout potential'
      : currentPrice <= lowerBand * 1.02
      ? 'Price at lower band - Breakdown risk'
      : `Price within channel (${(pricePosition * 100).toFixed(0)}%)`
  };
}

module.exports = { calculateDonchianChannel };
