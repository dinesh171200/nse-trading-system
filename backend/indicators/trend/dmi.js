function calculateDMI(candles, period = 14) {
  if (!candles || candles.length < period + 1) throw new Error('Insufficient data');
  
  let positiveDM = 0, negativeDM = 0;
  for (let i = candles.length - period; i < candles.length; i++) {
    const upMove = candles[i].ohlc.high - candles[i - 1].ohlc.high;
    const downMove = candles[i - 1].ohlc.low - candles[i].ohlc.low;
    if (upMove > downMove && upMove > 0) positiveDM += upMove;
    if (downMove > upMove && downMove > 0) negativeDM += downMove;
  }
  
  const plusDI = (positiveDM / period) * 100;
  const minusDI = (negativeDM / period) * 100;
  
  let signal = 'NEUTRAL', score = 0;
  if (plusDI > minusDI && plusDI > 25) { signal = 'BUY'; score = 65; }
  else if (minusDI > plusDI && minusDI > 25) { signal = 'SELL'; score = -65; }
  
  return { name: 'DMI', category: 'trend', plusDI, minusDI, signal: { action: signal, score, strength: 'MODERATE' } };
}
module.exports = { calculateDMI };
