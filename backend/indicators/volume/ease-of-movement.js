function calculateEaseOfMovement(candles, period = 14) {
  if (!candles || candles.length < period + 1) throw new Error('Insufficient data');
  
  const emvValues = [];
  for (let i = 1; i < candles.length; i++) {
    const distance = ((candles[i].ohlc.high + candles[i].ohlc.low) / 2) - ((candles[i - 1].ohlc.high + candles[i - 1].ohlc.low) / 2);
    const boxRatio = (candles[i].volume || 1) / (candles[i].ohlc.high - candles[i].ohlc.low);
    const emv = distance / boxRatio;
    emvValues.push(emv);
  }
  
  const recent = emvValues.slice(-period);
  const avg = recent.reduce((sum, v) => sum + v, 0) / period;
  
  let signal = 'NEUTRAL', score = 0;
  if (avg > 0) { signal = 'BUY'; score = 45; }
  else if (avg < 0) { signal = 'SELL'; score = -45; }
  
  return { name: 'Ease of Movement', category: 'volume', value: avg, signal: { action: signal, score, strength: 'WEAK' } };
}
module.exports = { calculateEaseOfMovement };
