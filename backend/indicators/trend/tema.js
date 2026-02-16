const technicalindicators = require('technicalindicators');

function calculateTEMA(candles, periods = [9, 20]) {
  if (!candles || candles.length < Math.max(...periods)) {
    return {
      signal: { type: 'NEUTRAL', score: 0, strength: 'WEAK', confidence: 0 },
      values: null,
      error: 'Insufficient data for TEMA calculation'
    };
  }

  try {
    const closes = candles.map(c => parseFloat(c.close));
    const currentPrice = closes[closes.length - 1];

    const temaValues = {};
    const temaResults = {};

    // Calculate TEMA for each period
    for (const period of periods) {
      if (closes.length >= period) {
        const temaInput = {
          values: closes,
          period: period
        };

        const result = technicalindicators.TEMA.calculate(temaInput);
        if (result && result.length > 0) {
          temaValues[`tema${period}`] = result[result.length - 1];
          temaResults[`tema${period}`] = result;
        }
      }
    }

    if (Object.keys(temaValues).length === 0) {
      return {
        signal: { type: 'NEUTRAL', score: 0, strength: 'WEAK', confidence: 0 },
        values: null,
        error: 'TEMA calculation returned no results'
      };
    }

    // Generate signal
    let signal = { type: 'NEUTRAL', score: 0, strength: 'WEAK', confidence: 50 };
    let totalScore = 0;
    let signalCount = 0;

    // 1. Check for crossovers (most powerful signal)
    for (const period of periods) {
      const temaKey = `tema${period}`;
      if (temaResults[temaKey] && temaResults[temaKey].length >= 2) {
        const currentTEMA = temaResults[temaKey][temaResults[temaKey].length - 1];
        const previousTEMA = temaResults[temaKey][temaResults[temaKey].length - 2];
        const previousPrice = closes[closes.length - 2];

        // Bullish crossover: price crosses above TEMA
        if (previousPrice <= previousTEMA && currentPrice > currentTEMA) {
          const crossoverScore = period === 9 ? 55 : 50;
          totalScore += crossoverScore;
          signalCount++;
          signal.reason = `Price crossed above TEMA ${period} (strong bullish)`;
        }
        // Bearish crossover: price crosses below TEMA
        else if (previousPrice >= previousTEMA && currentPrice < currentTEMA) {
          const crossoverScore = period === 9 ? -55 : -50;
          totalScore += crossoverScore;
          signalCount++;
          signal.reason = `Price crossed below TEMA ${period} (strong bearish)`;
        }
      }
    }

    // 2. TEMA crossover (fast vs slow)
    if (temaResults.tema9 && temaResults.tema20 &&
        temaResults.tema9.length >= 2 && temaResults.tema20.length >= 2) {

      const currentFast = temaResults.tema9[temaResults.tema9.length - 1];
      const previousFast = temaResults.tema9[temaResults.tema9.length - 2];
      const currentSlow = temaResults.tema20[temaResults.tema20.length - 1];
      const previousSlow = temaResults.tema20[temaResults.tema20.length - 2];

      // Fast TEMA crosses above slow TEMA
      if (previousFast <= previousSlow && currentFast > currentSlow) {
        totalScore += 45;
        signalCount++;
        if (!signal.reason) signal.reason = 'Fast TEMA crossed above slow TEMA (bullish momentum)';
      }
      // Fast TEMA crosses below slow TEMA
      else if (previousFast >= previousSlow && currentFast < currentSlow) {
        totalScore += -45;
        signalCount++;
        if (!signal.reason) signal.reason = 'Fast TEMA crossed below slow TEMA (bearish momentum)';
      }
    }

    // 3. Price distance from TEMA (if no crossover)
    if (signalCount === 0) {
      for (const period of periods) {
        const temaKey = `tema${period}`;
        if (temaValues[temaKey]) {
          const temaValue = temaValues[temaKey];
          const distance = ((currentPrice - temaValue) / temaValue) * 100;

          // Weight fast TEMA more heavily (more responsive)
          const weight = period === 9 ? 1.3 : 1.0;

          if (distance > 2) {
            totalScore += Math.min(25, distance * 6) * weight;
            signalCount++;
          } else if (distance < -2) {
            totalScore += Math.max(-25, distance * 6) * weight;
            signalCount++;
          } else if (currentPrice > temaValue) {
            totalScore += 12 * weight;
            signalCount++;
          } else if (currentPrice < temaValue) {
            totalScore += -12 * weight;
            signalCount++;
          }
        }
      }
    }

    // 4. TEMA alignment and slope
    const alignmentBonus = checkTEMAAlignment(temaValues, temaResults, currentPrice);
    if (alignmentBonus !== 0) {
      totalScore += alignmentBonus;
    }

    // Calculate final signal
    if (signalCount > 0) {
      const avgScore = totalScore / signalCount;
      signal.score = Math.round(Math.max(-100, Math.min(100, avgScore)));

      if (Math.abs(signal.score) >= 50) {
        signal.type = signal.score > 0 ? 'BUY' : 'SELL';
        signal.strength = 'VERY_STRONG';
        signal.confidence = 85;
      } else if (Math.abs(signal.score) >= 35) {
        signal.type = signal.score > 0 ? 'BUY' : 'SELL';
        signal.strength = 'STRONG';
        signal.confidence = 75;
      } else if (Math.abs(signal.score) >= 20) {
        signal.type = signal.score > 0 ? 'BUY' : 'SELL';
        signal.strength = 'MODERATE';
        signal.confidence = 65;
      } else if (Math.abs(signal.score) >= 8) {
        signal.type = signal.score > 0 ? 'BUY' : 'SELL';
        signal.strength = 'WEAK';
        signal.confidence = 55;
      }
    }

    if (!signal.reason) {
      if (signal.score > 0) {
        signal.reason = 'Price above TEMA (bullish trend)';
      } else if (signal.score < 0) {
        signal.reason = 'Price below TEMA (bearish trend)';
      } else {
        signal.reason = 'Price at TEMA (neutral)';
      }
    }

    // Determine overall trend
    const trend = determineTrend(temaValues, temaResults, currentPrice);

    return {
      signal,
      values: temaValues,
      trend,
      alignment: alignmentBonus !== 0 ? (alignmentBonus > 0 ? 'BULLISH' : 'BEARISH') : 'NEUTRAL'
    };

  } catch (error) {
    return {
      signal: { type: 'NEUTRAL', score: 0, strength: 'WEAK', confidence: 0 },
      values: null,
      error: `TEMA calculation error: ${error.message}`
    };
  }
}

function checkTEMAAlignment(temaValues, temaResults, currentPrice) {
  if (!temaValues.tema9 || !temaValues.tema20) return 0;

  const fast = temaValues.tema9;
  const slow = temaValues.tema20;

  // Calculate slope (trend direction)
  let fastSlope = 0;
  let slowSlope = 0;

  if (temaResults.tema9 && temaResults.tema9.length >= 3) {
    const recent = temaResults.tema9.slice(-3);
    fastSlope = (recent[2] - recent[0]) / recent[0] * 100;
  }

  if (temaResults.tema20 && temaResults.tema20.length >= 3) {
    const recent = temaResults.tema20.slice(-3);
    slowSlope = (recent[2] - recent[0]) / recent[0] * 100;
  }

  // Strong bullish: price > fast > slow, both slopes positive
  if (currentPrice > fast && fast > slow && fastSlope > 0 && slowSlope > 0) {
    return 18;
  }
  // Strong bearish: price < fast < slow, both slopes negative
  else if (currentPrice < fast && fast < slow && fastSlope < 0 && slowSlope < 0) {
    return -18;
  }
  // Moderate bullish: price > fast > slow
  else if (currentPrice > fast && fast > slow) {
    return 10;
  }
  // Moderate bearish: price < fast < slow
  else if (currentPrice < fast && fast < slow) {
    return -10;
  }

  return 0;
}

function determineTrend(temaValues, temaResults, currentPrice) {
  const fast = temaValues.tema9;
  const slow = temaValues.tema20;

  if (!fast || !slow) {
    return currentPrice > (fast || slow) ? 'BULLISH' : 'BEARISH';
  }

  // Calculate momentum (slope)
  let momentum = 'NEUTRAL';
  if (temaResults.tema9 && temaResults.tema9.length >= 3) {
    const recent = temaResults.tema9.slice(-3);
    const slope = (recent[2] - recent[0]) / recent[0] * 100;
    if (Math.abs(slope) > 1) {
      momentum = slope > 0 ? 'INCREASING' : 'DECREASING';
    }
  }

  if (currentPrice > fast && fast > slow) {
    return momentum === 'INCREASING' ? 'STRONG_BULLISH' : 'BULLISH';
  } else if (currentPrice < fast && fast < slow) {
    return momentum === 'DECREASING' ? 'STRONG_BEARISH' : 'BEARISH';
  } else if (currentPrice > fast) {
    return 'BULLISH';
  } else if (currentPrice < fast) {
    return 'BEARISH';
  }

  return 'NEUTRAL';
}

module.exports = {
  calculateTEMA,
  name: 'TEMA',
  category: 'TREND',
  description: 'Triple Exponential Moving Average - Even faster response than DEMA with minimal lag'
};
