function calculateVolumeOscillator(candles, shortPeriod = 5, longPeriod = 10) {
  if (!candles || candles.length < longPeriod) throw new Error('Insufficient data');
  
  const shortVol = candles.slice(-shortPeriod).reduce((sum, c) => sum + (c.volume || 0), 0) / shortPeriod;
  const longVol = candles.slice(-longPeriod).reduce((sum, c) => sum + (c.volume || 0), 0) / longPeriod;
  
  const vo = ((shortVol - longVol) / longVol) * 100;
  
  let signal = 'NEUTRAL', score = 0;
  if (vo > 10) { signal = 'BUY'; score = 50; }
  else if (vo < -10) { signal = 'SELL'; score = -50; }
  
  return { name: 'Volume Oscillator', category: 'volume', value: vo, signal: { action: signal, score, strength: 'WEAK' } };
}
module.exports = { calculateVolumeOscillator };
