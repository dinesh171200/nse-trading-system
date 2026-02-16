const technicalindicators = require('technicalindicators');

function calculateElderRay(candles, period = 13) {
  if (!candles || candles.length < period) {
    return {
      signal: { type: 'NEUTRAL', score: 0, strength: 'WEAK', confidence: 0 },
      values: null,
      error: 'Insufficient data for Elder Ray calculation'
    };
  }

  try {
    const closes = candles.map(c => parseFloat(c.close));
    const highs = candles.map(c => parseFloat(c.high));
    const lows = candles.map(c => parseFloat(c.low));

    // Calculate EMA
    const emaInput = {
      values: closes,
      period: period
    };

    const emaResults = technicalindicators.EMA.calculate(emaInput);

    if (!emaResults || emaResults.length === 0) {
      return {
        signal: { type: 'NEUTRAL', score: 0, strength: 'WEAK', confidence: 0 },
        values: null,
        error: 'EMA calculation failed for Elder Ray'
      };
    }

    // Calculate Bull Power and Bear Power for all available periods
    const bullPower = [];
    const bearPower = [];
    const startIndex = candles.length - emaResults.length;

    for (let i = 0; i < emaResults.length; i++) {
      const candleIndex = startIndex + i;
      const high = highs[candleIndex];
      const low = lows[candleIndex];
      const ema = emaResults[i];

      // Bull Power = High - EMA
      bullPower.push(high - ema);
      // Bear Power = Low - EMA
      bearPower.push(low - ema);
    }

    const currentBullPower = bullPower[bullPower.length - 1];
    const currentBearPower = bearPower[bearPower.length - 1];
    const previousBullPower = bullPower.length > 1 ? bullPower[bullPower.length - 2] : null;
    const previousBearPower = bearPower.length > 1 ? bearPower[bearPower.length - 2] : null;

    const currentEMA = emaResults[emaResults.length - 1];
    const previousEMA = emaResults.length > 1 ? emaResults[emaResults.length - 2] : null;
    const currentClose = closes[closes.length - 1];

    // Generate signal
    let signal = { type: 'NEUTRAL', score: 0, strength: 'WEAK', confidence: 50 };

    // Normalize power values to percentage for consistent scoring
    const bullPowerPercent = (currentBullPower / currentEMA) * 100;
    const bearPowerPercent = (currentBearPower / currentEMA) * 100;

    // Determine EMA trend
    const emaTrend = previousEMA ? (currentEMA > previousEMA ? 'UP' : 'DOWN') : 'NEUTRAL';

    // 1. STRONGEST SIGNAL: Both Bull and Bear Power aligned
    // Perfect bullish: Bull Power positive and rising, Bear Power rising (less negative)
    if (currentBullPower > 0 && currentBearPower > previousBearPower &&
        currentBullPower > previousBullPower && emaTrend === 'UP') {
      signal.type = 'BUY';
      signal.score = 70;
      signal.strength = 'VERY_STRONG';
      signal.confidence = 90;
      signal.reason = 'Both Bull and Bear Power showing strong bullish alignment';
    }
    // Perfect bearish: Bull Power falling, Bear Power negative and falling
    else if (currentBearPower < 0 && currentBullPower < previousBullPower &&
             currentBearPower < previousBearPower && emaTrend === 'DOWN') {
      signal.type = 'SELL';
      signal.score = -70;
      signal.strength = 'VERY_STRONG';
      signal.confidence = 90;
      signal.reason = 'Both Bull and Bear Power showing strong bearish alignment';
    }

    // 2. STRONG SIGNAL: One power indicator very strong
    // Very strong Bull Power
    else if (currentBullPower > 0 && bullPowerPercent > 1.5) {
      signal.type = 'BUY';
      signal.score = 50;
      signal.strength = 'STRONG';
      signal.confidence = 80;
      signal.reason = `Strong Bull Power (${bullPowerPercent.toFixed(2)}% above EMA)`;

      // Boost if Bear Power is also improving
      if (currentBearPower > previousBearPower) {
        signal.score = 60;
        signal.confidence = 85;
      }
    }
    // Very strong Bear Power (negative is strong for bears)
    else if (currentBearPower < 0 && bearPowerPercent < -1.5) {
      signal.type = 'SELL';
      signal.score = -50;
      signal.strength = 'STRONG';
      signal.confidence = 80;
      signal.reason = `Strong Bear Power (${Math.abs(bearPowerPercent).toFixed(2)}% below EMA)`;

      // Boost if Bull Power is also weakening
      if (currentBullPower < previousBullPower) {
        signal.score = -60;
        signal.confidence = 85;
      }
    }

    // 3. MODERATE SIGNAL: Clear directional bias
    // Bullish: Bull Power positive OR Bear Power improving
    else if (currentBullPower > 0 || (currentBearPower > previousBearPower && currentBearPower > -currentEMA * 0.01)) {
      const bullScore = currentBullPower > 0 ? Math.min(30, bullPowerPercent * 20) : 0;
      const bearScore = currentBearPower > previousBearPower ? 15 : 0;

      signal.type = 'BUY';
      signal.score = Math.round(bullScore + bearScore);
      signal.strength = signal.score >= 30 ? 'MODERATE' : 'WEAK';
      signal.confidence = signal.score >= 30 ? 70 : 60;
      signal.reason = 'Bull Power positive, buyers in control';
    }
    // Bearish: Bear Power negative OR Bull Power weakening
    else if (currentBearPower < 0 || (currentBullPower < previousBullPower && currentBullPower < currentEMA * 0.01)) {
      const bearScore = currentBearPower < 0 ? Math.max(-30, bearPowerPercent * 20) : 0;
      const bullScore = currentBullPower < previousBullPower ? -15 : 0;

      signal.type = 'SELL';
      signal.score = Math.round(bearScore + bullScore);
      signal.strength = Math.abs(signal.score) >= 30 ? 'MODERATE' : 'WEAK';
      signal.confidence = Math.abs(signal.score) >= 30 ? 70 : 60;
      signal.reason = 'Bear Power negative, sellers in control';
    }

    // 4. WEAK SIGNAL: Based on trends
    else {
      if (currentBullPower > previousBullPower && currentBearPower > previousBearPower) {
        signal.type = 'BUY';
        signal.score = 20;
        signal.strength = 'WEAK';
        signal.confidence = 55;
        signal.reason = 'Both powers improving (weak bullish)';
      } else if (currentBullPower < previousBullPower && currentBearPower < previousBearPower) {
        signal.type = 'SELL';
        signal.score = -20;
        signal.strength = 'WEAK';
        signal.confidence = 55;
        signal.reason = 'Both powers declining (weak bearish)';
      }
    }

    // Determine market condition
    let marketCondition = 'NEUTRAL';
    if (currentBullPower > 0 && currentBearPower > 0) {
      marketCondition = 'STRONG_BULLISH';
    } else if (currentBullPower < 0 && currentBearPower < 0) {
      marketCondition = 'STRONG_BEARISH';
    } else if (currentBullPower > 0) {
      marketCondition = 'BULLISH';
    } else if (currentBearPower < 0) {
      marketCondition = 'BEARISH';
    }

    return {
      signal,
      values: {
        bullPower: currentBullPower,
        bearPower: currentBearPower,
        bullPowerPercent: bullPowerPercent,
        bearPowerPercent: bearPowerPercent,
        ema: currentEMA,
        period: period
      },
      trend: emaTrend,
      marketCondition: marketCondition,
      history: {
        bullPower: bullPower.slice(-10), // Last 10 periods
        bearPower: bearPower.slice(-10)
      }
    };

  } catch (error) {
    return {
      signal: { type: 'NEUTRAL', score: 0, strength: 'WEAK', confidence: 0 },
      values: null,
      error: `Elder Ray calculation error: ${error.message}`
    };
  }
}

module.exports = {
  calculateElderRay,
  name: 'Elder Ray',
  category: 'MOMENTUM',
  description: 'Elder Ray Index (Bull/Bear Power) - Separates bullish and bearish momentum relative to EMA'
};
