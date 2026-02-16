const technicalindicators = require('technicalindicators');

function calculatePVI(candles, maPeriod = 255) {
  if (!candles || candles.length < 2) {
    return {
      signal: { type: 'NEUTRAL', score: 0, strength: 'WEAK', confidence: 0 },
      values: null,
      error: 'Insufficient data for PVI calculation'
    };
  }

  try {
    const closes = candles.map(c => parseFloat(c.close));
    const volumes = candles.map(c => parseFloat(c.volume));

    // Calculate PVI
    // PVI only changes on days when volume increases
    // PVI[i] = PVI[i-1] if Volume[i] <= Volume[i-1]
    // PVI[i] = PVI[i-1] + ((Close[i] - Close[i-1]) / Close[i-1]) * PVI[i-1] if Volume[i] > Volume[i-1]

    const pviValues = [1000]; // Start at 1000 (base index value)

    for (let i = 1; i < candles.length; i++) {
      if (volumes[i] > volumes[i - 1]) {
        // Volume increased - "uninformed money" day
        const priceChange = (closes[i] - closes[i - 1]) / closes[i - 1];
        pviValues.push(pviValues[i - 1] * (1 + priceChange));
      } else {
        // Volume same or decreased - maintain previous PVI
        pviValues.push(pviValues[i - 1]);
      }
    }

    const currentPVI = pviValues[pviValues.length - 1];
    const previousPVI = pviValues.length > 1 ? pviValues[pviValues.length - 2] : null;

    // Calculate EMA of PVI (255 is traditional period)
    let pviEMA = null;
    const effectiveMAPeriod = Math.min(maPeriod, Math.floor(pviValues.length * 0.8));

    if (pviValues.length >= effectiveMAPeriod) {
      const emaInput = {
        values: pviValues,
        period: effectiveMAPeriod
      };
      const emaResults = technicalindicators.EMA.calculate(emaInput);
      if (emaResults && emaResults.length > 0) {
        pviEMA = emaResults[emaResults.length - 1];
      }
    }

    // Generate signal
    let signal = { type: 'NEUTRAL', score: 0, strength: 'WEAK', confidence: 50 };

    // PVI interpretation:
    // PVI tracks retail/"uninformed" money (high volume days)
    // PVI above EMA = Retail is bullish (can be contrarian indicator)
    // PVI below EMA = Retail is bearish
    // Generally less reliable than NVI, but useful for confirmation

    // 1. Crossover of EMA
    if (pviEMA !== null && previousPVI !== null) {
      // Calculate previous EMA position (approximate)
      const previousEMADistance = previousPVI - pviEMA;
      const currentEMADistance = currentPVI - pviEMA;

      // Bullish crossover: PVI crosses above EMA
      if (previousEMADistance <= 0 && currentEMADistance > 0) {
        signal.type = 'BUY';
        signal.score = 40;
        signal.strength = 'MODERATE';
        signal.confidence = 70;
        signal.reason = 'PVI crossed above EMA (retail sentiment turning bullish)';
      }
      // Bearish crossover: PVI crosses below EMA
      else if (previousEMADistance >= 0 && currentEMADistance < 0) {
        signal.type = 'SELL';
        signal.score = -40;
        signal.strength = 'MODERATE';
        signal.confidence = 70;
        signal.reason = 'PVI crossed below EMA (retail sentiment turning bearish)';
      }
    }

    // 2. Position relative to EMA
    if (signal.type === 'NEUTRAL' && pviEMA !== null) {
      const distance = ((currentPVI - pviEMA) / pviEMA) * 100;

      // Strongly above EMA
      if (distance > 2) {
        signal.type = 'BUY';
        signal.score = 35;
        signal.strength = 'MODERATE';
        signal.confidence = 65;
        signal.reason = `PVI strongly above EMA (+${distance.toFixed(1)}%) - retail bullish`;
      }
      // Moderately above EMA
      else if (distance > 0) {
        signal.type = 'BUY';
        signal.score = 25;
        signal.strength = 'WEAK';
        signal.confidence = 60;
        signal.reason = 'PVI above EMA - retail supports uptrend';
      }
      // Strongly below EMA
      else if (distance < -2) {
        signal.type = 'SELL';
        signal.score = -35;
        signal.strength = 'MODERATE';
        signal.confidence = 65;
        signal.reason = `PVI strongly below EMA (${distance.toFixed(1)}%) - retail bearish`;
      }
      // Moderately below EMA
      else {
        signal.type = 'SELL';
        signal.score = -25;
        signal.strength = 'WEAK';
        signal.confidence = 60;
        signal.reason = 'PVI below EMA - retail supports downtrend';
      }
    }

    // 3. PVI momentum (if no EMA available)
    if (signal.type === 'NEUTRAL' && previousPVI !== null) {
      if (currentPVI > previousPVI) {
        signal.type = 'BUY';
        signal.score = 20;
        signal.strength = 'WEAK';
        signal.confidence = 55;
        signal.reason = 'PVI rising - retail buying';
      } else if (currentPVI < previousPVI) {
        signal.type = 'SELL';
        signal.score = -20;
        signal.strength = 'WEAK';
        signal.confidence = 55;
        signal.reason = 'PVI falling - retail selling';
      }
    }

    // Determine trend
    let trend = 'NEUTRAL';
    if (pviEMA) {
      trend = currentPVI > pviEMA ? 'BULLISH' : 'BEARISH';
    } else if (previousPVI) {
      trend = currentPVI > previousPVI ? 'BULLISH' : 'BEARISH';
    }

    return {
      signal,
      values: {
        pvi: currentPVI,
        pviEMA: pviEMA,
        maPeriod: effectiveMAPeriod
      },
      trend: trend,
      retailActivity: pviEMA ?
        (currentPVI > pviEMA ? 'BUYING' : 'SELLING') :
        'UNKNOWN',
      interpretation: pviEMA ?
        (currentPVI > pviEMA ?
          'Retail traders (uninformed money) are bullish' :
          'Retail traders (uninformed money) are bearish') :
        'Insufficient data for EMA comparison',
      history: {
        values: pviValues.slice(-20)
      }
    };

  } catch (error) {
    return {
      signal: { type: 'NEUTRAL', score: 0, strength: 'WEAK', confidence: 0 },
      values: null,
      error: `PVI calculation error: ${error.message}`
    };
  }
}

module.exports = {
  calculatePVI,
  name: 'PVI',
  category: 'VOLUME',
  description: 'Positive Volume Index - Tracks up-volume days, monitors "uninformed money" (retail traders) activity'
};
