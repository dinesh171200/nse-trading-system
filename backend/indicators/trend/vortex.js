function calculateVortex(candles, period = 14) {
  if (!candles || candles.length < period + 1) throw new Error('Insufficient data');
  
  let plusVM = 0, minusVM = 0, trSum = 0;
  for (let i = candles.length - period; i < candles.length; i++) {
    plusVM += Math.abs(candles[i].ohlc.high - candles[i - 1].ohlc.low);
    minusVM += Math.abs(candles[i].ohlc.low - candles[i - 1].ohlc.high);
    const tr = Math.max(candles[i].ohlc.high - candles[i].ohlc.low, Math.abs(candles[i].ohlc.high - candles[i - 1].ohlc.close), Math.abs(candles[i].ohlc.low - candles[i - 1].ohlc.close));
    trSum += tr;
  }
  
  const plusVI = plusVM / trSum;
  const minusVI = minusVM / trSum;
  
  let signal = 'NEUTRAL', score = 0;
  if (plusVI > minusVI && plusVI > 1.1) { signal = 'BUY'; score = 60; }
  else if (minusVI > plusVI && minusVI > 1.1) { signal = 'SELL'; score = -60; }
  
  return { name: 'Vortex', category: 'trend', plusVI, minusVI, signal: { action: signal, score, strength: 'MODERATE' } };
}
module.exports = { calculateVortex };
