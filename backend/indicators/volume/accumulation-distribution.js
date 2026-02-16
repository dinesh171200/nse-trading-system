/**
 * Accumulation/Distribution Line (A/D)
 * Volume indicator measuring cumulative flow of money
 */

function calculateAccumulationDistribution(candles) {
  if (!candles || candles.length < 2) {
    throw new Error('Insufficient data for A/D calculation');
  }

  const adValues = [];
  let cumulativeAD = 0;

  for (let i = 0; i < candles.length; i++) {
    const high = candles[i].ohlc.high;
    const low = candles[i].ohlc.low;
    const close = candles[i].ohlc.close;
    const volume = candles[i].volume || 0;

    // Money Flow Multiplier
    const mfm = high === low ? 0 : ((close - low) - (high - close)) / (high - low);

    // Money Flow Volume
    const mfv = mfm * volume;

    // Cumulative A/D
    cumulativeAD += mfv;
    adValues.push(cumulativeAD);
  }

  const currentAD = adValues[adValues.length - 1];
  const previousAD = adValues[adValues.length - 2];
  const change = currentAD - previousAD;

  // Calculate trend over last 10 periods
  let trendScore = 0;
  if (adValues.length >= 10) {
    const recent = adValues.slice(-10);
    let upMoves = 0;
    for (let i = 1; i < recent.length; i++) {
      if (recent[i] > recent[i - 1]) upMoves++;
    }
    trendScore = (upMoves / 9) * 100 - 50; // -50 to +50
  }

  let signal = 'NEUTRAL';
  let score = 0;

  if (change > 0 && trendScore > 20) {
    signal = 'BUY';
    score = Math.min(40 + trendScore, 75);
  } else if (change < 0 && trendScore < -20) {
    signal = 'SELL';
    score = Math.max(-40 + trendScore, -75);
  } else if (trendScore > 10) {
    signal = 'BUY';
    score = trendScore;
  } else if (trendScore < -10) {
    signal = 'SELL';
    score = trendScore;
  }

  return {
    name: 'Accumulation/Distribution',
    category: 'volume',
    value: currentAD,
    change: change,
    trend: trendScore > 0 ? 'ACCUMULATION' : 'DISTRIBUTION',
    trendStrength: Math.abs(trendScore),
    signal: {
      action: signal,
      score: score,
      strength: Math.abs(score) > 60 ? 'STRONG' : Math.abs(score) > 30 ? 'MODERATE' : 'WEAK'
    },
    interpretation: change > 0
      ? 'Money flowing into the asset - Accumulation'
      : 'Money flowing out of the asset - Distribution'
  };
}

module.exports = {
  calculateAccumulationDistribution
};
