function calculateCMO(candles, period = 14) {
  if (!candles || candles.length < period + 1) throw new Error('Insufficient data');
  let sumUp = 0, sumDown = 0;
  for (let i = candles.length - period; i < candles.length; i++) {
    const change = candles[i].ohlc.close - candles[i - 1].ohlc.close;
    if (change > 0) sumUp += change;
    else sumDown += Math.abs(change);
  }
  const cmo = ((sumUp - sumDown) / (sumUp + sumDown)) * 100;
  
  let signal = 'NEUTRAL', score = 0;
  if (cmo > 50) { signal = 'BUY'; score = 70; }
  else if (cmo < -50) { signal = 'SELL'; score = -70; }
  else if (cmo > 0) { signal = 'BUY'; score = cmo * 0.8; }
  else { signal = 'SELL'; score = cmo * 0.8; }
  
  return { name: 'CMO', category: 'momentum', value: cmo, signal: { action: signal, score, strength: Math.abs(score) > 60 ? 'STRONG' : 'MODERATE' } };
}
module.exports = { calculateCMO };
