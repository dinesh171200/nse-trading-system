const technicalindicators = require('technicalindicators');

function calculateNVI(candles, maPeriod = 255) {
  if (!candles || candles.length < 2) {
    return {
      signal: { type: 'NEUTRAL', score: 0, strength: 'WEAK', confidence: 0 },
      values: null,
      error: 'Insufficient data for NVI calculation'
    };
  }

  try {
    const closes = candles.map(c => parseFloat(c.close));
    const volumes = candles.map(c => parseFloat(c.volume));

    // Calculate NVI
    // NVI only changes on days when volume decreases
    // NVI[i] = NVI[i-1] if Volume[i] >= Volume[i-1]
    // NVI[i] = NVI[i-1] + ((Close[i] - Close[i-1]) / Close[i-1]) * NVI[i-1] if Volume[i] < Volume[i-1]

    const nviValues = [1000]; // Start at 1000 (base index value)

    for (let i = 1; i < candles.length; i++) {
      if (volumes[i] < volumes[i - 1]) {
        // Volume decreased - "smart money" day
        const priceChange = (closes[i] - closes[i - 1]) / closes[i - 1];
        nviValues.push(nviValues[i - 1] * (1 + priceChange));
      } else {
        // Volume same or increased - maintain previous NVI
        nviValues.push(nviValues[i - 1]);
      }
    }

    const currentNVI = nviValues[nviValues.length - 1];
    const previousNVI = nviValues.length > 1 ? nviValues[nviValues.length - 2] : null;

    // Calculate EMA of NVI (255 is traditional period, approximates 1-year MA)
    let nviEMA = null;
    const effectiveMAPeriod = Math.min(maPeriod, Math.floor(nviValues.length * 0.8));

    if (nviValues.length >= effectiveMAPeriod) {
      const emaInput = {
        values: nviValues,
        period: effectiveMAPeriod
      };
      const emaResults = technicalindicators.EMA.calculate(emaInput);
      if (emaResults && emaResults.length > 0) {
        nviEMA = emaResults[emaResults.length - 1];
      }
    }

    // Generate signal
    let signal = { type: 'NEUTRAL', score: 0, strength: 'WEAK', confidence: 50 };

    // NVI interpretation:
    // NVI above EMA = Smart money is bullish (high probability of bull market)
    // NVI below EMA = Smart money is bearish (lower probability scenario but significant)
    // NVI tracks "informed" traders who trade when volume is low

    // 1. Crossover of EMA (most powerful signal)
    if (nviEMA !== null && previousNVI !== null) {
      // Calculate previous EMA position (approximate)
      const previousEMADistance = previousNVI - nviEMA;
      const currentEMADistance = currentNVI - nviEMA;

      // Bullish crossover: NVI crosses above EMA
      if (previousEMADistance <= 0 && currentEMADistance > 0) {
        signal.type = 'BUY';
        signal.score = 55;
        signal.strength = 'STRONG';
        signal.confidence = 80;
        signal.reason = 'NVI crossed above EMA (smart money turning bullish)';
      }
      // Bearish crossover: NVI crosses below EMA
      else if (previousEMADistance >= 0 && currentEMADistance < 0) {
        signal.type = 'SELL';
        signal.score = -55;
        signal.strength = 'STRONG';
        signal.confidence = 80;
        signal.reason = 'NVI crossed below EMA (smart money turning bearish)';
      }
    }

    // 2. Position relative to EMA
    if (signal.type === 'NEUTRAL' && nviEMA !== null) {
      const distance = ((currentNVI - nviEMA) / nviEMA) * 100;

      // Strongly above EMA
      if (distance > 2) {
        signal.type = 'BUY';
        signal.score = 45;
        signal.strength = 'MODERATE';
        signal.confidence = 75;
        signal.reason = `NVI strongly above EMA (+${distance.toFixed(1)}%) - smart money bullish`;
      }
      // Moderately above EMA
      else if (distance > 0) {
        signal.type = 'BUY';
        signal.score = 30;
        signal.strength = 'MODERATE';
        signal.confidence = 65;
        signal.reason = 'NVI above EMA - smart money supports uptrend';
      }
      // Strongly below EMA
      else if (distance < -2) {
        signal.type = 'SELL';
        signal.score = -45;
        signal.strength = 'MODERATE';
        signal.confidence = 75;
        signal.reason = `NVI strongly below EMA (${distance.toFixed(1)}%) - smart money bearish`;
      }
      // Moderately below EMA
      else {
        signal.type = 'SELL';
        signal.score = -30;
        signal.strength = 'MODERATE';
        signal.confidence = 65;
        signal.reason = 'NVI below EMA - smart money supports downtrend';
      }
    }

    // 3. NVI momentum (if no EMA available)
    if (signal.type === 'NEUTRAL' && previousNVI !== null) {
      if (currentNVI > previousNVI) {
        signal.type = 'BUY';
        signal.score = 25;
        signal.strength = 'WEAK';
        signal.confidence = 60;
        signal.reason = 'NVI rising - smart money accumulating';
      } else if (currentNVI < previousNVI) {
        signal.type = 'SELL';
        signal.score = -25;
        signal.strength = 'WEAK';
        signal.confidence = 60;
        signal.reason = 'NVI falling - smart money distributing';
      }
    }

    // Determine trend
    let trend = 'NEUTRAL';
    if (nviEMA) {
      trend = currentNVI > nviEMA ? 'BULLISH' : 'BEARISH';
    } else if (previousNVI) {
      trend = currentNVI > previousNVI ? 'BULLISH' : 'BEARISH';
    }

    return {
      signal,
      values: {
        nvi: currentNVI,
        nviEMA: nviEMA,
        maPeriod: effectiveMAPeriod
      },
      trend: trend,
      smartMoneyActivity: nviEMA ?
        (currentNVI > nviEMA ? 'ACCUMULATING' : 'DISTRIBUTING') :
        'UNKNOWN',
      interpretation: nviEMA ?
        (currentNVI > nviEMA ?
          'Smart money (informed traders) are bullish' :
          'Smart money (informed traders) are bearish') :
        'Insufficient data for EMA comparison',
      history: {
        values: nviValues.slice(-20)
      }
    };

  } catch (error) {
    return {
      signal: { type: 'NEUTRAL', score: 0, strength: 'WEAK', confidence: 0 },
      values: null,
      error: `NVI calculation error: ${error.message}`
    };
  }
}

module.exports = {
  calculateNVI,
  name: 'NVI',
  category: 'VOLUME',
  description: 'Negative Volume Index - Tracks down-volume days, monitors "smart money" (informed traders) activity'
};
