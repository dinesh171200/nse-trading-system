const technicalindicators = require('technicalindicators');

// Custom WMA calculation helper
function calculateWMA(values, period) {
  if (values.length < period) return null;

  const weights = [];
  let weightSum = 0;
  for (let i = 1; i <= period; i++) {
    weights.push(i);
    weightSum += i;
  }

  const results = [];
  for (let i = period - 1; i < values.length; i++) {
    let sum = 0;
    for (let j = 0; j < period; j++) {
      sum += values[i - period + 1 + j] * weights[j];
    }
    results.push(sum / weightSum);
  }

  return results;
}

function calculateHMA(candles, periods = [9, 20, 50]) {
  if (!candles || candles.length < Math.max(...periods)) {
    return {
      signal: { type: 'NEUTRAL', score: 0, strength: 'WEAK', confidence: 0 },
      values: null,
      error: 'Insufficient data for HMA calculation'
    };
  }

  try {
    const closes = candles.map(c => parseFloat(c.close));
    const currentPrice = closes[closes.length - 1];

    const hmaValues = {};
    const hmaResults = {};

    // Calculate HMA for each period
    // HMA Formula: WMA(2*WMA(n/2) - WMA(n), sqrt(n))
    for (const period of periods) {
      if (closes.length >= period) {
        const halfPeriod = Math.floor(period / 2);
        const sqrtPeriod = Math.floor(Math.sqrt(period));

        // Step 1: Calculate WMA with period n/2
        const wmaHalf = calculateWMA(closes, halfPeriod);
        if (!wmaHalf || wmaHalf.length === 0) continue;

        // Step 2: Calculate WMA with period n
        const wmaFull = calculateWMA(closes, period);
        if (!wmaFull || wmaFull.length === 0) continue;

        // Step 3: Calculate 2*WMA(n/2) - WMA(n)
        const minLength = Math.min(wmaHalf.length, wmaFull.length);
        const rawHMA = [];
        for (let i = 0; i < minLength; i++) {
          const halfIndex = wmaHalf.length - minLength + i;
          const fullIndex = wmaFull.length - minLength + i;
          rawHMA.push(2 * wmaHalf[halfIndex] - wmaFull[fullIndex]);
        }

        // Step 4: Calculate WMA of the result with period sqrt(n)
        const hma = calculateWMA(rawHMA, sqrtPeriod);
        if (hma && hma.length > 0) {
          hmaValues[`hma${period}`] = hma[hma.length - 1];
          hmaResults[`hma${period}`] = hma;
        }
      }
    }

    if (Object.keys(hmaValues).length === 0) {
      return {
        signal: { type: 'NEUTRAL', score: 0, strength: 'WEAK', confidence: 0 },
        values: null,
        error: 'HMA calculation returned no results'
      };
    }

    // Generate signal
    let signal = { type: 'NEUTRAL', score: 0, strength: 'WEAK', confidence: 50 };
    let totalScore = 0;
    let signalCount = 0;

    // 1. Check for crossovers (most powerful signal - HMA is very responsive)
    for (const period of periods) {
      const hmaKey = `hma${period}`;
      if (hmaResults[hmaKey] && hmaResults[hmaKey].length >= 2) {
        const currentHMA = hmaResults[hmaKey][hmaResults[hmaKey].length - 1];
        const previousHMA = hmaResults[hmaKey][hmaResults[hmaKey].length - 2];

        // For HMA, we compare price at offset positions to account for the calculation lag
        const priceOffset = Math.min(closes.length - 1, hmaResults[hmaKey].length);
        const currentPriceIndex = closes.length - 1;
        const previousPriceIndex = closes.length - 2;

        const currentPriceForHMA = closes[currentPriceIndex];
        const previousPriceForHMA = closes[previousPriceIndex];

        // Bullish crossover: price crosses above HMA
        if (previousPriceForHMA <= previousHMA && currentPriceForHMA > currentHMA) {
          const crossoverScore = period === 9 ? 60 : (period === 20 ? 55 : 50);
          totalScore += crossoverScore;
          signalCount++;
          signal.reason = `Price crossed above HMA ${period} (strong bullish - low lag)`;
        }
        // Bearish crossover: price crosses below HMA
        else if (previousPriceForHMA >= previousHMA && currentPriceForHMA < currentHMA) {
          const crossoverScore = period === 9 ? -60 : (period === 20 ? -55 : -50);
          totalScore += crossoverScore;
          signalCount++;
          signal.reason = `Price crossed below HMA ${period} (strong bearish - low lag)`;
        }
      }
    }

    // 2. HMA slope analysis (trend direction)
    for (const period of periods) {
      const hmaKey = `hma${period}`;
      if (hmaResults[hmaKey] && hmaResults[hmaKey].length >= 3) {
        const recent = hmaResults[hmaKey].slice(-3);
        const slope = ((recent[2] - recent[0]) / recent[0]) * 100;

        // HMA slope is a strong trend indicator
        if (Math.abs(slope) > 0.5) {
          const slopeScore = slope > 0 ?
            Math.min(30, slope * 20) :
            Math.max(-30, slope * 20);
          const weight = period === 9 ? 1.2 : (period === 20 ? 1.0 : 0.8);
          totalScore += slopeScore * weight;
          signalCount++;

          if (Math.abs(slope) > 2 && !signal.reason) {
            signal.reason = slope > 0 ?
              `HMA ${period} strong upward slope (${slope.toFixed(2)}%)` :
              `HMA ${period} strong downward slope (${slope.toFixed(2)}%)`;
          }
        }
      }
    }

    // 3. Price position relative to HMA (if no strong signals yet)
    if (signalCount === 0 || Math.abs(totalScore / signalCount) < 30) {
      for (const period of periods) {
        const hmaKey = `hma${period}`;
        if (hmaValues[hmaKey]) {
          const hmaValue = hmaValues[hmaKey];
          const distance = ((currentPrice - hmaValue) / hmaValue) * 100;

          const weight = period === 9 ? 1.2 : (period === 20 ? 1.0 : 0.8);

          if (distance > 2) {
            totalScore += Math.min(25, distance * 5) * weight;
            signalCount++;
          } else if (distance < -2) {
            totalScore += Math.max(-25, distance * 5) * weight;
            signalCount++;
          } else if (currentPrice > hmaValue) {
            totalScore += 12 * weight;
            signalCount++;
          } else if (currentPrice < hmaValue) {
            totalScore += -12 * weight;
            signalCount++;
          }
        }
      }
    }

    // 4. HMA alignment bonus (trend strength)
    const alignmentBonus = checkHMAAlignment(hmaValues, hmaResults, currentPrice);
    if (alignmentBonus !== 0) {
      totalScore += alignmentBonus;
      if (Math.abs(alignmentBonus) >= 20 && !signal.reason) {
        signal.reason = alignmentBonus > 0 ?
          'All HMAs in perfect bullish alignment' :
          'All HMAs in perfect bearish alignment';
      }
    }

    // Calculate final signal
    if (signalCount > 0) {
      const avgScore = totalScore / signalCount;
      signal.score = Math.round(Math.max(-100, Math.min(100, avgScore)));

      if (Math.abs(signal.score) >= 55) {
        signal.type = signal.score > 0 ? 'BUY' : 'SELL';
        signal.strength = 'VERY_STRONG';
        signal.confidence = 90;
      } else if (Math.abs(signal.score) >= 40) {
        signal.type = signal.score > 0 ? 'BUY' : 'SELL';
        signal.strength = 'STRONG';
        signal.confidence = 80;
      } else if (Math.abs(signal.score) >= 25) {
        signal.type = signal.score > 0 ? 'BUY' : 'SELL';
        signal.strength = 'MODERATE';
        signal.confidence = 70;
      } else if (Math.abs(signal.score) >= 10) {
        signal.type = signal.score > 0 ? 'BUY' : 'SELL';
        signal.strength = 'WEAK';
        signal.confidence = 60;
      }
    }

    if (!signal.reason) {
      if (signal.score > 0) {
        signal.reason = 'Price above HMA (bullish trend)';
      } else if (signal.score < 0) {
        signal.reason = 'Price below HMA (bearish trend)';
      } else {
        signal.reason = 'Price at HMA (neutral)';
      }
    }

    // Determine overall trend
    const trend = determineTrend(hmaValues, hmaResults, currentPrice);

    return {
      signal,
      values: hmaValues,
      trend,
      alignment: alignmentBonus !== 0 ? (alignmentBonus > 0 ? 'BULLISH' : 'BEARISH') : 'NEUTRAL'
    };

  } catch (error) {
    return {
      signal: { type: 'NEUTRAL', score: 0, strength: 'WEAK', confidence: 0 },
      values: null,
      error: `HMA calculation error: ${error.message}`
    };
  }
}

function checkHMAAlignment(hmaValues, hmaResults, currentPrice) {
  const values = Object.keys(hmaValues)
    .sort((a, b) => {
      const periodA = parseInt(a.replace('hma', ''));
      const periodB = parseInt(b.replace('hma', ''));
      return periodA - periodB;
    })
    .map(key => hmaValues[key]);

  if (values.length < 2) return 0;

  // Check slope of each HMA
  const slopes = [];
  for (const key of Object.keys(hmaResults)) {
    const results = hmaResults[key];
    if (results && results.length >= 3) {
      const recent = results.slice(-3);
      const slope = (recent[2] - recent[0]) / recent[0];
      slopes.push(slope);
    }
  }

  // Strong bullish: price > hma9 > hma20 > hma50, all slopes positive
  let bullishAlignment = currentPrice > values[0];
  let bearishAlignment = currentPrice < values[0];

  for (let i = 1; i < values.length; i++) {
    if (values[i] >= values[i - 1]) bullishAlignment = false;
    if (values[i] <= values[i - 1]) bearishAlignment = false;
  }

  const allSlopesPositive = slopes.every(s => s > 0);
  const allSlopesNegative = slopes.every(s => s < 0);

  if (bullishAlignment && allSlopesPositive) {
    return 20; // Very strong bullish alignment
  } else if (bearishAlignment && allSlopesNegative) {
    return -20; // Very strong bearish alignment
  } else if (bullishAlignment) {
    return 12; // Moderate bullish alignment
  } else if (bearishAlignment) {
    return -12; // Moderate bearish alignment
  }

  return 0;
}

function determineTrend(hmaValues, hmaResults, currentPrice) {
  const short = hmaValues.hma9;
  const med = hmaValues.hma20;
  const long = hmaValues.hma50;

  // Calculate short HMA slope
  let momentum = 'NEUTRAL';
  if (hmaResults.hma9 && hmaResults.hma9.length >= 3) {
    const recent = hmaResults.hma9.slice(-3);
    const slope = (recent[2] - recent[0]) / recent[0] * 100;
    if (Math.abs(slope) > 1) {
      momentum = slope > 0 ? 'INCREASING' : 'DECREASING';
    }
  }

  if (short && med && long) {
    if (currentPrice > short && short > med && med > long) {
      return momentum === 'INCREASING' ? 'STRONG_BULLISH' : 'BULLISH';
    } else if (currentPrice < short && short < med && med < long) {
      return momentum === 'DECREASING' ? 'STRONG_BEARISH' : 'BEARISH';
    }
  }

  if (short && currentPrice > short) {
    return 'BULLISH';
  } else if (short && currentPrice < short) {
    return 'BEARISH';
  }

  return 'NEUTRAL';
}

module.exports = {
  calculateHMA,
  name: 'HMA',
  category: 'TREND',
  description: 'Hull Moving Average - Best lag reduction using weighted moving average technique'
};
