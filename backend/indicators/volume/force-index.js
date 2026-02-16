function calculateForceIndex(candles, period = 13) {
  if (!candles || candles.length < period + 1) throw new Error('Insufficient data');
  
  const forces = [];
  for (let i = 1; i < candles.length; i++) {
    const force = (candles[i].ohlc.close - candles[i - 1].ohlc.close) * (candles[i].volume || 0);
    forces.push(force);
  }
  
  const recent = forces.slice(-period);
  const avg = recent.reduce((sum, v) => sum + v, 0) / period;
  
  let signal = 'NEUTRAL', score = 0;
  if (avg > 0) { signal = 'BUY'; score = Math.min(50, avg / 1000); }
  else if (avg < 0) { signal = 'SELL'; score = Math.max(-50, avg / 1000); }
  
  return { name: 'Force Index', category: 'volume', value: avg, signal: { action: signal, score, strength: 'WEAK' } };
}
module.exports = { calculateForceIndex };
