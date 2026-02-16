function calculateChoppinessIndex(candles, period = 14) {
  if (!candles || candles.length < period + 1) throw new Error('Insufficient data');
  
  const recent = candles.slice(-period);
  const high = Math.max(...recent.map(c => c.ohlc.high));
  const low = Math.min(...recent.map(c => c.ohlc.low));
  
  let sumATR = 0;
  for (let i = 1; i < recent.length; i++) {
    const tr = Math.max(recent[i].ohlc.high - recent[i].ohlc.low, Math.abs(recent[i].ohlc.high - recent[i - 1].ohlc.close), Math.abs(recent[i].ohlc.low - recent[i - 1].ohlc.close));
    sumATR += tr;
  }
  
  const ci = (Math.log(sumATR / (high - low)) / Math.log(period)) * 100;
  
  let signal = 'NEUTRAL', score = 0;
  if (ci < 38.2) { signal = 'BUY'; score = 40; }
  else if (ci > 61.8) { signal = 'SELL'; score = -40; }
  
  return { name: 'Choppiness Index', category: 'trend', value: ci, signal: { action: signal, score, strength: 'WEAK' } };
}
module.exports = { calculateChoppinessIndex };
