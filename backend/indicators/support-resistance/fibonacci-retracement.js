function calculateFibonacciRetracement(candles, period = 50) {
  if (!candles || candles.length < period) throw new Error('Insufficient data');
  
  const recent = candles.slice(-period);
  const high = Math.max(...recent.map(c => c.ohlc.high));
  const low = Math.min(...recent.map(c => c.ohlc.low));
  const diff = high - low;
  
  const levels = {
    level_0: high,
    level_236: high - (diff * 0.236),
    level_382: high - (diff * 0.382),
    level_500: high - (diff * 0.500),
    level_618: high - (diff * 0.618),
    level_786: high - (diff * 0.786),
    level_100: low
  };
  
  const currentPrice = candles[candles.length - 1].ohlc.close;
  let signal = 'NEUTRAL', score = 0;
  
  if (Math.abs(currentPrice - levels.level_618) / currentPrice < 0.005) { signal = 'BUY'; score = 60; }
  else if (Math.abs(currentPrice - levels.level_382) / currentPrice < 0.005) { signal = 'BUY'; score = 50; }
  
  return { name: 'Fibonacci Retracement', category: 'supportResistance', levels, signal: { action: signal, score, strength: 'MODERATE' } };
}
module.exports = { calculateFibonacciRetracement };
