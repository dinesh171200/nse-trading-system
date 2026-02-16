function calculateSupportResistanceLevels(candles, period = 50) {
  if (!candles || candles.length < period) throw new Error('Insufficient data');
  
  const recent = candles.slice(-period);
  const highs = recent.map(c => c.ohlc.high).sort((a, b) => b - a);
  const lows = recent.map(c => c.ohlc.low).sort((a, b) => a - b);
  
  const resistance = highs.slice(0, 3);
  const support = lows.slice(0, 3);
  
  const currentPrice = candles[candles.length - 1].ohlc.close;
  let signal = 'NEUTRAL', score = 0;
  
  if (Math.abs(currentPrice - support[0]) / currentPrice < 0.01) { signal = 'BUY'; score = 55; }
  else if (Math.abs(currentPrice - resistance[0]) / currentPrice < 0.01) { signal = 'SELL'; score = -55; }
  
  return { name: 'S/R Levels', category: 'supportResistance', support, resistance, signal: { action: signal, score, strength: 'MODERATE' } };
}
module.exports = { calculateSupportResistanceLevels };
