function calculateHistoricalVolatility(candles, period = 20) {
  if (!candles || candles.length < period + 1) throw new Error('Insufficient data');
  
  const returns = [];
  for (let i = candles.length - period; i < candles.length; i++) {
    const ret = Math.log(candles[i].ohlc.close / candles[i - 1].ohlc.close);
    returns.push(ret);
  }
  
  const mean = returns.reduce((sum, v) => sum + v, 0) / returns.length;
  const variance = returns.reduce((sum, v) => sum + Math.pow(v - mean, 2), 0) / returns.length;
  const hv = Math.sqrt(variance) * Math.sqrt(252) * 100;
  
  let signal = 'NEUTRAL', score = 0;
  if (hv > 40) { signal = 'SELL'; score = -35; }
  
  return { name: 'Historical Volatility', category: 'volatility', value: hv, signal: { action: signal, score, strength: 'WEAK' } };
}
module.exports = { calculateHistoricalVolatility };
