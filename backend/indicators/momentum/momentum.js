function calculateMomentum(candles, period = 10) {
  if (!candles || candles.length < period + 1) throw new Error('Insufficient data');
  const current = candles[candles.length - 1].ohlc.close;
  const past = candles[candles.length - period - 1].ohlc.close;
  const value = current - past;
  const pct = (value / past) * 100;
  
  let signal = 'NEUTRAL', score = 0;
  if (pct > 2) { signal = 'BUY'; score = Math.min(pct * 20, 75); }
  else if (pct < -2) { signal = 'SELL'; score = Math.max(pct * 20, -75); }
  
  return { name: 'Momentum', category: 'momentum', value, signal: { action: signal, score, strength: Math.abs(score) > 60 ? 'STRONG' : 'MODERATE' } };
}
module.exports = { calculateMomentum };
