function calculateAwesomeOscillator(candles, shortPeriod = 5, longPeriod = 34) {
  if (!candles || candles.length < longPeriod) throw new Error('Insufficient data');
  
  const medianPrices = candles.map(c => (c.ohlc.high + c.ohlc.low) / 2);
  
  const sma5 = medianPrices.slice(-shortPeriod).reduce((sum, v) => sum + v, 0) / shortPeriod;
  const sma34 = medianPrices.slice(-longPeriod).reduce((sum, v) => sum + v, 0) / longPeriod;
  
  const ao = sma5 - sma34;
  
  let signal = 'NEUTRAL', score = 0;
  if (ao > 0) { signal = 'BUY'; score = Math.min(ao * 10, 60); }
  else { signal = 'SELL'; score = Math.max(ao * 10, -60); }
  
  return { name: 'Awesome Oscillator', category: 'momentum', value: ao, signal: { action: signal, score, strength: Math.abs(score) > 40 ? 'MODERATE' : 'WEAK' } };
}
module.exports = { calculateAwesomeOscillator };
