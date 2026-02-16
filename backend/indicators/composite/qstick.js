const technicalindicators = require('technicalindicators');

function calculateQStick(candles, period = 14) {
  if (!candles || candles.length < period) {
    return {
      signal: { type: 'NEUTRAL', score: 0, strength: 'WEAK', confidence: 0 },
      values: null,
      error: 'Insufficient data for QStick calculation'
    };
  }

  try {
    const opens = candles.map(c => parseFloat(c.open));
    const closes = candles.map(c => parseFloat(c.close));

    // Calculate difference: Close - Open for each candle
    const differences = [];
    for (let i = 0; i < candles.length; i++) {
      differences.push(closes[i] - opens[i]);
    }

    // Calculate EMA of the differences
    const emaInput = {
      values: differences,
      period: period
    };

    const qstickValues = technicalindicators.EMA.calculate(emaInput);

    if (!qstickValues || qstickValues.length === 0) {
      return {
        signal: { type: 'NEUTRAL', score: 0, strength: 'WEAK', confidence: 0 },
        values: null,
        error: 'QStick calculation produced no results'
      };
    }

    const currentQStick = qstickValues[qstickValues.length - 1];
    const previousQStick = qstickValues.length > 1 ? qstickValues[qstickValues.length - 2] : null;

    // Get current close price for percentage calculations
    const currentClose = closes[closes.length - 1];
    const qstickPercent = (currentQStick / currentClose) * 100;

    // Generate signal
    let signal = { type: 'NEUTRAL', score: 0, strength: 'WEAK', confidence: 50 };

    // QStick interpretation:
    // Positive QStick = More bullish candles (closes > opens)
    // Negative QStick = More bearish candles (opens > closes)
    // Magnitude indicates strength of trend

    // 1. Zero line crossover
    if (previousQStick !== null) {
      // Bullish: QStick crosses above zero
      if (previousQStick <= 0 && currentQStick > 0) {
        signal.type = 'BUY';
        signal.score = 60;
        signal.strength = 'VERY_STRONG';
        signal.confidence = 85;
        signal.reason = 'QStick crossed above zero (bullish candles now dominate)';
      }
      // Bearish: QStick crosses below zero
      else if (previousQStick >= 0 && currentQStick < 0) {
        signal.type = 'SELL';
        signal.score = -60;
        signal.strength = 'VERY_STRONG';
        signal.confidence = 85;
        signal.reason = 'QStick crossed below zero (bearish candles now dominate)';
      }
    }

    // 2. Strong directional movement
    if (signal.type === 'NEUTRAL') {
      // Very strong bullish (QStick > 0.5% of price)
      if (qstickPercent > 0.5) {
        signal.type = 'BUY';
        signal.score = Math.min(50, 30 + qstickPercent * 40);
        signal.strength = 'STRONG';
        signal.confidence = 80;
        signal.reason = `Strong bullish candle dominance (QStick ${qstickPercent.toFixed(2)}%)`;
      }
      // Very strong bearish (QStick < -0.5% of price)
      else if (qstickPercent < -0.5) {
        signal.type = 'SELL';
        signal.score = Math.max(-50, -30 + qstickPercent * 40);
        signal.strength = 'STRONG';
        signal.confidence = 80;
        signal.reason = `Strong bearish candle dominance (QStick ${qstickPercent.toFixed(2)}%)`;
      }
    }

    // 3. Momentum change
    if (signal.type === 'NEUTRAL' && previousQStick !== null && qstickValues.length >= 3) {
      const olderQStick = qstickValues[qstickValues.length - 3];

      const currentMomentum = currentQStick - previousQStick;
      const previousMomentum = previousQStick - olderQStick;

      // Momentum turning positive (bearish to bullish)
      if (previousMomentum <= 0 && currentMomentum > 0 && currentQStick < 0) {
        const momentumStrength = Math.abs(currentMomentum / currentClose) * 100;
        signal.type = 'BUY';
        signal.score = Math.min(45, 25 + momentumStrength * 100);
        signal.strength = 'MODERATE';
        signal.confidence = 70;
        signal.reason = 'QStick momentum turning positive (sentiment improving)';
      }
      // Momentum turning negative (bullish to bearish)
      else if (previousMomentum >= 0 && currentMomentum < 0 && currentQStick > 0) {
        const momentumStrength = Math.abs(currentMomentum / currentClose) * 100;
        signal.type = 'SELL';
        signal.score = Math.max(-45, -25 - momentumStrength * 100);
        signal.strength = 'MODERATE';
        signal.confidence = 70;
        signal.reason = 'QStick momentum turning negative (sentiment deteriorating)';
      }
    }

    // 4. Direction and strength
    if (signal.type === 'NEUTRAL') {
      // Positive QStick (bullish candles dominate)
      if (currentQStick > 0) {
        const strength = Math.abs(qstickPercent);

        if (strength > 0.3) {
          signal.type = 'BUY';
          signal.score = Math.min(35, 20 + strength * 50);
          signal.strength = 'MODERATE';
          signal.confidence = 65;
          signal.reason = `Bullish candles dominate (QStick ${qstickPercent.toFixed(2)}%)`;
        } else {
          signal.type = 'BUY';
          signal.score = 15;
          signal.strength = 'WEAK';
          signal.confidence = 55;
          signal.reason = 'Mildly bullish candle pattern';
        }
      }
      // Negative QStick (bearish candles dominate)
      else if (currentQStick < 0) {
        const strength = Math.abs(qstickPercent);

        if (strength > 0.3) {
          signal.type = 'SELL';
          signal.score = Math.max(-35, -20 - strength * 50);
          signal.strength = 'MODERATE';
          signal.confidence = 65;
          signal.reason = `Bearish candles dominate (QStick ${qstickPercent.toFixed(2)}%)`;
        } else {
          signal.type = 'SELL';
          signal.score = -15;
          signal.strength = 'WEAK';
          signal.confidence = 55;
          signal.reason = 'Mildly bearish candle pattern';
        }
      }
    }

    // 5. Trend consistency check
    let trendConsistency = 'MIXED';
    if (qstickValues.length >= 5) {
      const recent5 = qstickValues.slice(-5);
      const allPositive = recent5.every(val => val > 0);
      const allNegative = recent5.every(val => val < 0);

      if (allPositive) {
        trendConsistency = 'STRONG_BULLISH';
        // Boost confidence if trend is consistent
        if (signal.type === 'BUY') {
          signal.confidence = Math.min(95, signal.confidence + 10);
        }
      } else if (allNegative) {
        trendConsistency = 'STRONG_BEARISH';
        // Boost confidence if trend is consistent
        if (signal.type === 'SELL') {
          signal.confidence = Math.min(95, signal.confidence + 10);
        }
      }
    }

    return {
      signal,
      values: {
        qstick: currentQStick,
        qstickPercent: qstickPercent,
        period: period
      },
      trend: currentQStick > 0 ? 'BULLISH' : 'BEARISH',
      trendConsistency: trendConsistency,
      candlePattern: currentQStick > 0 ?
        'Closes consistently above opens' :
        'Opens consistently above closes',
      history: {
        values: qstickValues.slice(-20)
      }
    };

  } catch (error) {
    return {
      signal: { type: 'NEUTRAL', score: 0, strength: 'WEAK', confidence: 0 },
      values: null,
      error: `QStick calculation error: ${error.message}`
    };
  }
}

module.exports = {
  calculateQStick,
  name: 'QStick',
  category: 'COMPOSITE',
  description: 'QStick Indicator - Measures open-close relationship to identify bullish/bearish candle dominance'
};
