/**
 * Keltner Channel
 * Volatility-based envelope indicator
 */

const ema = require('../trend/ema');
const atr = require('./atr');

function calculateKeltnerChannel(candles, period = 20, multiplier = 2) {
  if (!candles || candles.length < period) {
    throw new Error('Insufficient data for Keltner Channel calculation');
  }

  // Calculate EMA of close prices
  const emaResult = ema.calculateEMA(candles, period);
  const middleLine = emaResult.value;

  // Calculate ATR
  const atrResult = atr.calculateATR(candles, period);
  const atrValue = atrResult.value;

  // Calculate bands
  const upperBand = middleLine + (multiplier * atrValue);
  const lowerBand = middleLine - (multiplier * atrValue);

  const currentPrice = candles[candles.length - 1].ohlc.close;

  // Determine position relative to bands
  const bandWidth = upperBand - lowerBand;
  const pricePosition = (currentPrice - lowerBand) / bandWidth;

  let signal = 'NEUTRAL';
  let score = 0;

  if (currentPrice > upperBand) {
    signal = 'SELL'; // Overbought
    score = -60 - Math.min((currentPrice - upperBand) / upperBand * 100, 20);
  } else if (currentPrice < lowerBand) {
    signal = 'BUY'; // Oversold
    score = 60 + Math.min((lowerBand - currentPrice) / lowerBand * 100, 20);
  } else if (pricePosition > 0.7) {
    signal = 'SELL';
    score = -40;
  } else if (pricePosition < 0.3) {
    signal = 'BUY';
    score = 40;
  }

  return {
    name: 'Keltner Channel',
    category: 'volatility',
    upperBand: upperBand,
    middleLine: middleLine,
    lowerBand: lowerBand,
    bandWidth: bandWidth,
    pricePosition: pricePosition * 100,
    signal: {
      action: signal,
      score: score,
      strength: Math.abs(score) > 60 ? 'STRONG' : Math.abs(score) > 30 ? 'MODERATE' : 'WEAK'
    },
    interpretation: currentPrice > upperBand
      ? 'Price above upper band - Overbought'
      : currentPrice < lowerBand
      ? 'Price below lower band - Oversold'
      : `Price within bands (${(pricePosition * 100).toFixed(0)}% position)`
  };
}

module.exports = {
  calculateKeltnerChannel
};
