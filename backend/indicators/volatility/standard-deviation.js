function calculateStandardDeviation(candles, period = 20) {
  if (!candles || candles.length < period) throw new Error('Insufficient data');
  
  const closes = candles.slice(-period).map(c => c.ohlc.close);
  const mean = closes.reduce((sum, v) => sum + v, 0) / period;
  const variance = closes.reduce((sum, v) => sum + Math.pow(v - mean, 2), 0) / period;
  const std = Math.sqrt(variance);
  
  const pct = (std / mean) * 100;
  
  let signal = 'NEUTRAL', score = 0;
  if (pct > 3) { signal = 'SELL'; score = -40; }
  
  return { name: 'Standard Deviation', category: 'volatility', value: std, percentage: pct, signal: { action: signal, score, strength: 'WEAK' } };
}
module.exports = { calculateStandardDeviation };
