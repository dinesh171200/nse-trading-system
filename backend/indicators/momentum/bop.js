function calculateBOP(candles) {
  if (!candles || candles.length < 2) throw new Error('Insufficient data');
  
  const recent = candles.slice(-14);
  const bopValues = recent.map(c => {
    const range = c.ohlc.high - c.ohlc.low;
    return range === 0 ? 0 : (c.ohlc.close - c.ohlc.open) / range;
  });
  
  const avgBOP = bopValues.reduce((sum, v) => sum + v, 0) / bopValues.length;
  
  let signal = 'NEUTRAL', score = 0;
  if (avgBOP > 0.5) { signal = 'BUY'; score = 70; }
  else if (avgBOP < -0.5) { signal = 'SELL'; score = -70; }
  else if (avgBOP > 0) { signal = 'BUY'; score = avgBOP * 100; }
  else { signal = 'SELL'; score = avgBOP * 100; }
  
  return { name: 'Balance of Power', category: 'momentum', value: avgBOP, signal: { action: signal, score, strength: Math.abs(score) > 60 ? 'STRONG' : 'MODERATE' } };
}
module.exports = { calculateBOP };
