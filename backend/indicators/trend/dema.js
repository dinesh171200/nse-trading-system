const technicalindicators = require('technicalindicators');

function calculateDEMA(candles, periods = [9, 20, 50]) {
  if (!candles || candles.length < Math.max(...periods)) {
    return {
      signal: { type: 'NEUTRAL', score: 0, strength: 'WEAK', confidence: 0 },
      values: null,
      error: 'Insufficient data for DEMA calculation'
    };
  }

  try {
    const closes = candles.map(c => parseFloat(c.close));
    const currentPrice = closes[closes.length - 1];

    const demaValues = {};
    const demaResults = {};

    // Calculate DEMA for each period
    for (const period of periods) {
      if (closes.length >= period) {
        const demaInput = {
          values: closes,
          period: period
        };

        const result = technicalindicators.DEMA.calculate(demaInput);
        if (result && result.length > 0) {
          demaValues[`dema${period}`] = result[result.length - 1];
          demaResults[`dema${period}`] = result;
        }
      }
    }

    if (Object.keys(demaValues).length === 0) {
      return {
        signal: { type: 'NEUTRAL', score: 0, strength: 'WEAK', confidence: 0 },
        values: null,
        error: 'DEMA calculation returned no results'
      };
    }

    // Generate signal
    let signal = { type: 'NEUTRAL', score: 0, strength: 'WEAK', confidence: 50 };
    let totalScore = 0;
    let signalCount = 0;

    // 1. Check for crossovers (most powerful signal)
    for (const period of periods) {
      const demaKey = `dema${period}`;
      if (demaResults[demaKey] && demaResults[demaKey].length >= 2) {
        const currentDEMA = demaResults[demaKey][demaResults[demaKey].length - 1];
        const previousDEMA = demaResults[demaKey][demaResults[demaKey].length - 2];
        const previousPrice = closes[closes.length - 2];

        // Bullish crossover: price crosses above DEMA
        if (previousPrice <= previousDEMA && currentPrice > currentDEMA) {
          const crossoverScore = period === 20 ? 50 : (period === 9 ? 45 : 40);
          totalScore += crossoverScore;
          signalCount++;
          signal.reason = `Price crossed above DEMA ${period} (bullish)`;
        }
        // Bearish crossover: price crosses below DEMA
        else if (previousPrice >= previousDEMA && currentPrice < currentDEMA) {
          const crossoverScore = period === 20 ? -50 : (period === 9 ? -45 : -40);
          totalScore += crossoverScore;
          signalCount++;
          signal.reason = `Price crossed below DEMA ${period} (bearish)`;
        }
      }
    }

    // 2. Price distance from DEMA (if no crossover)
    if (signalCount === 0) {
      for (const period of periods) {
        const demaKey = `dema${period}`;
        if (demaValues[demaKey]) {
          const demaValue = demaValues[demaKey];
          const distance = ((currentPrice - demaValue) / demaValue) * 100;

          // Weight shorter periods more heavily
          const weight = period === 9 ? 1.2 : (period === 20 ? 1.0 : 0.8);

          if (distance > 2) {
            totalScore += Math.min(20, distance * 5) * weight;
            signalCount++;
          } else if (distance < -2) {
            totalScore += Math.max(-20, distance * 5) * weight;
            signalCount++;
          } else if (currentPrice > demaValue) {
            totalScore += 10 * weight;
            signalCount++;
          } else if (currentPrice < demaValue) {
            totalScore += -10 * weight;
            signalCount++;
          }
        }
      }
    }

    // 3. DEMA alignment (trend strength)
    const alignmentBonus = checkDEMAAlignment(demaValues, currentPrice);
    if (alignmentBonus !== 0) {
      totalScore += alignmentBonus;
      if (Math.abs(alignmentBonus) >= 15) {
        signal.reason = alignmentBonus > 0 ? 'All DEMAs in bullish alignment' : 'All DEMAs in bearish alignment';
      }
    }

    // Calculate final signal
    if (signalCount > 0) {
      const avgScore = totalScore / signalCount;
      signal.score = Math.round(Math.max(-100, Math.min(100, avgScore)));

      if (Math.abs(signal.score) >= 45) {
        signal.type = signal.score > 0 ? 'BUY' : 'SELL';
        signal.strength = 'VERY_STRONG';
        signal.confidence = 85;
      } else if (Math.abs(signal.score) >= 30) {
        signal.type = signal.score > 0 ? 'BUY' : 'SELL';
        signal.strength = 'STRONG';
        signal.confidence = 75;
      } else if (Math.abs(signal.score) >= 15) {
        signal.type = signal.score > 0 ? 'BUY' : 'SELL';
        signal.strength = 'MODERATE';
        signal.confidence = 65;
      } else if (Math.abs(signal.score) >= 5) {
        signal.type = signal.score > 0 ? 'BUY' : 'SELL';
        signal.strength = 'WEAK';
        signal.confidence = 55;
      }
    }

    if (!signal.reason) {
      if (signal.score > 0) {
        signal.reason = 'Price above DEMA (bullish trend)';
      } else if (signal.score < 0) {
        signal.reason = 'Price below DEMA (bearish trend)';
      } else {
        signal.reason = 'Price at DEMA (neutral)';
      }
    }

    // Determine overall trend
    const trend = determineTrend(demaValues, currentPrice);

    return {
      signal,
      values: demaValues,
      trend,
      alignment: alignmentBonus !== 0 ? (alignmentBonus > 0 ? 'BULLISH' : 'BEARISH') : 'NEUTRAL'
    };

  } catch (error) {
    return {
      signal: { type: 'NEUTRAL', score: 0, strength: 'WEAK', confidence: 0 },
      values: null,
      error: `DEMA calculation error: ${error.message}`
    };
  }
}

function checkDEMAAlignment(demaValues, currentPrice) {
  const values = Object.keys(demaValues)
    .sort((a, b) => {
      const periodA = parseInt(a.replace('dema', ''));
      const periodB = parseInt(b.replace('dema', ''));
      return periodA - periodB;
    })
    .map(key => demaValues[key]);

  if (values.length < 2) return 0;

  // Check if DEMAs are in ascending order (bullish) or descending order (bearish)
  let bullishAlignment = true;
  let bearishAlignment = true;

  for (let i = 1; i < values.length; i++) {
    if (values[i] >= values[i - 1]) bearishAlignment = false;
    if (values[i] <= values[i - 1]) bullishAlignment = false;
  }

  // Check if price is aligned with DEMA order
  if (bullishAlignment && currentPrice > values[0]) {
    return 15; // Strong bullish alignment
  } else if (bearishAlignment && currentPrice < values[0]) {
    return -15; // Strong bearish alignment
  }

  return 0;
}

function determineTrend(demaValues, currentPrice) {
  const shortDEMA = demaValues.dema9;
  const medDEMA = demaValues.dema20;
  const longDEMA = demaValues.dema50;

  if (shortDEMA && medDEMA && longDEMA) {
    if (currentPrice > shortDEMA && shortDEMA > medDEMA && medDEMA > longDEMA) {
      return 'STRONG_BULLISH';
    } else if (currentPrice < shortDEMA && shortDEMA < medDEMA && medDEMA < longDEMA) {
      return 'STRONG_BEARISH';
    }
  }

  if (shortDEMA && currentPrice > shortDEMA) {
    return 'BULLISH';
  } else if (shortDEMA && currentPrice < shortDEMA) {
    return 'BEARISH';
  }

  return 'NEUTRAL';
}

module.exports = {
  calculateDEMA,
  name: 'DEMA',
  category: 'TREND',
  description: 'Double Exponential Moving Average - Faster response than EMA with reduced lag'
};
