function calculateIchimoku(candles, tenkanPeriod = 9, kijunPeriod = 26, senkouPeriod = 52) {
  if (!candles || candles.length < senkouPeriod) throw new Error('Insufficient data');
  
  const calcLine = (period) => {
    const recent = candles.slice(-period);
    const high = Math.max(...recent.map(c => c.ohlc.high));
    const low = Math.min(...recent.map(c => c.ohlc.low));
    return (high + low) / 2;
  };
  
  const tenkan = calcLine(tenkanPeriod);
  const kijun = calcLine(kijunPeriod);
  const senkou = calcLine(senkouPeriod);
  
  const currentPrice = candles[candles.length - 1].ohlc.close;
  let signal = 'NEUTRAL', score = 0;
  
  if (tenkan > kijun && currentPrice > senkou) { signal = 'BUY'; score = 75; }
  else if (tenkan < kijun && currentPrice < senkou) { signal = 'SELL'; score = -75; }
  else if (tenkan > kijun) { signal = 'BUY'; score = 50; }
  else if (tenkan < kijun) { signal = 'SELL'; score = -50; }
  
  return { name: 'Ichimoku Cloud', category: 'trend', tenkan, kijun, senkou, signal: { action: signal, score, strength: Math.abs(score) > 70 ? 'STRONG' : 'MODERATE' } };
}
module.exports = { calculateIchimoku };
