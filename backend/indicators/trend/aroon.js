/**
 * Aroon Indicator
 * Identifies trend changes and strength
 */

function calculateAroon(candles, period = 25) {
  if (!candles || candles.length < period + 1) {
    throw new Error('Insufficient data for Aroon calculation');
  }

  const recentCandles = candles.slice(-period - 1);
  
  // Find position of highest high and lowest low
  let highestIdx = 0;
  let lowestIdx = 0;
  let highest = recentCandles[0].ohlc.high;
  let lowest = recentCandles[0].ohlc.low;

  for (let i = 1; i < recentCandles.length; i++) {
    if (recentCandles[i].ohlc.high > highest) {
      highest = recentCandles[i].ohlc.high;
      highestIdx = i;
    }
    if (recentCandles[i].ohlc.low < lowest) {
      lowest = recentCandles[i].ohlc.low;
      lowestIdx = i;
    }
  }

  const periodsSinceHigh = recentCandles.length - 1 - highestIdx;
  const periodsSinceLow = recentCandles.length - 1 - lowestIdx;

  const aroonUp = ((period - periodsSinceHigh) / period) * 100;
  const aroonDown = ((period - periodsSinceLow) / period) * 100;
  const aroonOscillator = aroonUp - aroonDown;

  let signal = 'NEUTRAL';
  let score = 0;

  if (aroonUp > 70 && aroonDown < 30) {
    signal = 'BUY';
    score = 70;
  } else if (aroonDown > 70 && aroonUp < 30) {
    signal = 'SELL';
    score = -70;
  } else if (aroonOscillator > 25) {
    signal = 'BUY';
    score = 50;
  } else if (aroonOscillator < -25) {
    signal = 'SELL';
    score = -50;
  }

  return {
    name: 'Aroon',
    category: 'trend',
    aroonUp,
    aroonDown,
    aroonOscillator,
    signal: {
      action: signal,
      score: score,
      strength: Math.abs(score) > 60 ? 'STRONG' : 'MODERATE'
    },
    interpretation: aroonUp > aroonDown
      ? `Uptrend (Up: ${aroonUp.toFixed(0)}%, Down: ${aroonDown.toFixed(0)}%)`
      : `Downtrend (Up: ${aroonUp.toFixed(0)}%, Down: ${aroonDown.toFixed(0)}%)`
  };
}

module.exports = { calculateAroon };
