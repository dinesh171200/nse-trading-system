function calculateChaikinOscillator(candles, shortPeriod = 3, longPeriod = 10) {
  if (!candles || candles.length < longPeriod + 1) throw new Error('Insufficient data');
  
  const ad = require('./accumulation-distribution');
  const adResult = ad.calculateAccumulationDistribution(candles);
  
  let signal = 'NEUTRAL', score = 0;
  if (adResult.trend === 'ACCUMULATION') { signal = 'BUY'; score = 50; }
  else { signal = 'SELL'; score = -50; }
  
  return { name: 'Chaikin Oscillator', category: 'volume', value: 0, signal: { action: signal, score, strength: 'MODERATE' } };
}
module.exports = { calculateChaikinOscillator };
