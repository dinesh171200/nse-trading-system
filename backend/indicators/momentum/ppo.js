const technicalindicators = require('technicalindicators');

function calculatePPO(candles, fastPeriod = 12, slowPeriod = 26, signalPeriod = 9) {
  if (!candles || candles.length < slowPeriod + signalPeriod) {
    return {
      signal: { type: 'NEUTRAL', score: 0, strength: 'WEAK', confidence: 0 },
      values: null,
      error: 'Insufficient data for PPO calculation'
    };
  }

  try {
    const closes = candles.map(c => parseFloat(c.close));

    // Calculate PPO using technicalindicators library
    const ppoInput = {
      values: closes,
      fastPeriod: fastPeriod,
      slowPeriod: slowPeriod,
      signalPeriod: signalPeriod,
      SimpleMAOscillator: false,
      SimpleMASignal: false
    };

    const ppoResults = technicalindicators.PPO.calculate(ppoInput);

    if (!ppoResults || ppoResults.length === 0) {
      return {
        signal: { type: 'NEUTRAL', score: 0, strength: 'WEAK', confidence: 0 },
        values: null,
        error: 'PPO calculation returned no results'
      };
    }

    const latestPPO = ppoResults[ppoResults.length - 1];
    const previousPPO = ppoResults.length > 1 ? ppoResults[ppoResults.length - 2] : null;

    const ppoValue = latestPPO.ppo;
    const signalValue = latestPPO.signal;
    const histogram = latestPPO.histogram;

    // Generate signal
    let signal = { type: 'NEUTRAL', score: 0, strength: 'WEAK', confidence: 50 };

    // 1. Zero line crossover (most powerful signal)
    if (previousPPO) {
      // Bullish: PPO crosses above zero
      if (previousPPO.ppo <= 0 && ppoValue > 0) {
        signal.type = 'BUY';
        signal.score = 60;
        signal.strength = 'VERY_STRONG';
        signal.confidence = 85;
        signal.reason = 'PPO crossed above zero line (bullish momentum)';
      }
      // Bearish: PPO crosses below zero
      else if (previousPPO.ppo >= 0 && ppoValue < 0) {
        signal.type = 'SELL';
        signal.score = -60;
        signal.strength = 'VERY_STRONG';
        signal.confidence = 85;
        signal.reason = 'PPO crossed below zero line (bearish momentum)';
      }
      // Signal line crossover
      else if (previousPPO.histogram <= 0 && histogram > 0) {
        signal.type = 'BUY';
        signal.score = 50;
        signal.strength = 'STRONG';
        signal.confidence = 75;
        signal.reason = 'PPO crossed above signal line';
      }
      else if (previousPPO.histogram >= 0 && histogram < 0) {
        signal.type = 'SELL';
        signal.score = -50;
        signal.strength = 'STRONG';
        signal.confidence = 75;
        signal.reason = 'PPO crossed below signal line';
      }
    }

    // 2. Divergence detection (if no crossover)
    if (signal.type === 'NEUTRAL' && candles.length >= slowPeriod + 10) {
      const recentCandles = candles.slice(-10);
      const recentPPO = ppoResults.slice(-10);

      const priceHigh = Math.max(...recentCandles.map(c => parseFloat(c.high)));
      const priceLow = Math.min(...recentCandles.map(c => parseFloat(c.low)));
      const ppoHigh = Math.max(...recentPPO.map(r => r.ppo));
      const ppoLow = Math.min(...recentPPO.map(r => r.ppo));

      const currentPrice = parseFloat(candles[candles.length - 1].close);

      // Bullish divergence: price makes lower low, PPO makes higher low
      if (currentPrice <= priceLow * 1.01 && ppoValue >= ppoLow * 1.1) {
        signal.type = 'BUY';
        signal.score = 40;
        signal.strength = 'MODERATE';
        signal.confidence = 70;
        signal.reason = 'Bullish divergence detected on PPO';
      }
      // Bearish divergence: price makes higher high, PPO makes lower high
      else if (currentPrice >= priceHigh * 0.99 && ppoValue <= ppoHigh * 0.9) {
        signal.type = 'SELL';
        signal.score = -40;
        signal.strength = 'MODERATE';
        signal.confidence = 70;
        signal.reason = 'Bearish divergence detected on PPO';
      }
    }

    // 3. Position-based signal (if still neutral)
    if (signal.type === 'NEUTRAL') {
      if (ppoValue > 2) {
        signal.type = 'BUY';
        signal.score = Math.min(30, ppoValue * 10);
        signal.strength = 'MODERATE';
        signal.confidence = 60;
        signal.reason = `PPO strongly positive (${ppoValue.toFixed(2)}%)`;
      } else if (ppoValue < -2) {
        signal.type = 'SELL';
        signal.score = Math.max(-30, ppoValue * 10);
        signal.strength = 'MODERATE';
        signal.confidence = 60;
        signal.reason = `PPO strongly negative (${ppoValue.toFixed(2)}%)`;
      } else if (histogram > 0) {
        signal.type = 'BUY';
        signal.score = 15;
        signal.strength = 'WEAK';
        signal.confidence = 55;
        signal.reason = 'PPO above signal line';
      } else if (histogram < 0) {
        signal.type = 'SELL';
        signal.score = -15;
        signal.strength = 'WEAK';
        signal.confidence = 55;
        signal.reason = 'PPO below signal line';
      }
    }

    return {
      signal,
      values: {
        ppo: ppoValue,
        signal: signalValue,
        histogram: histogram,
        fastPeriod,
        slowPeriod,
        signalPeriod
      },
      trend: ppoValue > 0 ? 'BULLISH' : 'BEARISH',
      momentum: histogram > 0 ? 'INCREASING' : 'DECREASING'
    };

  } catch (error) {
    return {
      signal: { type: 'NEUTRAL', score: 0, strength: 'WEAK', confidence: 0 },
      values: null,
      error: `PPO calculation error: ${error.message}`
    };
  }
}

module.exports = {
  calculatePPO,
  name: 'PPO',
  category: 'MOMENTUM',
  description: 'Percentage Price Oscillator - Normalized MACD variant better for comparing across different price levels'
};
