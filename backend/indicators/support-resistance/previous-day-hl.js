function calculatePreviousDayHL(candles) {
  if (!candles || candles.length < 2) throw new Error('Insufficient data');
  
  const yesterday = candles[candles.length - 2];
  const prevHigh = yesterday.ohlc.high;
  const prevLow = yesterday.ohlc.low;
  const prevClose = yesterday.ohlc.close;
  
  const currentPrice = candles[candles.length - 1].ohlc.close;
  let signal = 'NEUTRAL', score = 0;
  
  if (currentPrice > prevHigh) { signal = 'BUY'; score = 65; }
  else if (currentPrice < prevLow) { signal = 'SELL'; score = -65; }
  
  return { name: 'Previous Day H/L', category: 'supportResistance', prevHigh, prevLow, prevClose, signal: { action: signal, score, strength: 'MODERATE' } };
}
module.exports = { calculatePreviousDayHL };
