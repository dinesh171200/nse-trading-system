/**
 * Level Calculator Service
 * Calculates proper entry, stop loss, and target levels based on:
 * - Support and Resistance zones
 * - Pivot Points
 * - Swing Highs and Lows
 * - Risk/Reward ratios
 */

class LevelCalculator {
  /**
   * Calculate trading levels with proper support/resistance
   */
  async calculateTradingLevels(candles, action, currentPrice, indicatorResults) {
    const pivots = indicatorResults.pivots;
    const swingLevels = this.findSwingLevels(candles);
    const atr = this.calculateATR(candles, 14);

    let levels = {
      entry: currentPrice,
      stopLoss: 0,
      target1: 0,
      target2: 0,
      target3: 0,
      riskRewardRatio: 0,
      supportLevels: [],
      resistanceLevels: [],
      reasoning: []
    };

    if (action === 'BUY' || action === 'STRONG_BUY') {
      levels = this.calculateBuyLevels(
        currentPrice,
        pivots,
        swingLevels,
        atr,
        candles
      );
    } else if (action === 'SELL' || action === 'STRONG_SELL') {
      levels = this.calculateSellLevels(
        currentPrice,
        pivots,
        swingLevels,
        atr,
        candles
      );
    } else {
      // HOLD - no levels
      return levels;
    }

    // Calculate risk/reward
    const risk = Math.abs(currentPrice - levels.stopLoss);
    const reward = Math.abs(levels.target1 - currentPrice);
    levels.riskRewardRatio = reward / risk;

    return levels;
  }

  /**
   * Calculate BUY position levels
   */
  calculateBuyLevels(currentPrice, pivots, swingLevels, atr, candles) {
    const reasoning = [];

    // INTRADAY MODE: Tight stop losses for quick trades
    // Bank Nifty: 200-250 points (~0.35%), Nifty: 70-90 points (~0.35%)
    const isBankNifty = currentPrice > 50000;
    const intradayStopLoss = isBankNifty
      ? currentPrice * 0.0035  // 0.35% for Bank Nifty (200-250 pts)
      : currentPrice * 0.0035; // 0.35% for Nifty (70-90 pts)

    // Use tight intraday stop loss
    let stopLoss = currentPrice - intradayStopLoss;
    const slPoints = Math.round(currentPrice - stopLoss);
    reasoning.push(`Stop Loss at ₹${stopLoss.toFixed(2)} (-${slPoints} points / -0.35% for tight intraday risk management)`);

    // Optional: Adjust to recent swing low if it's closer and provides better protection
    const recentLow = this.findRecentLow(candles, 10); // Look at last 10 candles only
    if (recentLow && recentLow > stopLoss && recentLow < currentPrice) {
      const distanceToLow = currentPrice - recentLow;
      const maxDistance = isBankNifty ? 300 : 100; // Max 300 pts for BankNifty, 100 for Nifty

      if (distanceToLow < maxDistance) {
        stopLoss = recentLow - 5; // 5 points below recent low
        const newSlPoints = Math.round(currentPrice - stopLoss);
        reasoning.push(`Adjusted to recent swing low: ₹${stopLoss.toFixed(2)} (-${newSlPoints} points)`);
      }
    }

    // Ensure stop loss is reasonable (not too wide for intraday)
    const actualSL = currentPrice - stopLoss;
    const maxSL = isBankNifty ? 300 : 100; // Maximum allowed SL
    if (actualSL > maxSL) {
      stopLoss = currentPrice - maxSL;
      reasoning.push(`Stop Loss adjusted to ₹${stopLoss.toFixed(2)} (minimum ${minStopLoss} points)`);
    }

    // Calculate risk for target calculation
    const risk = Math.abs(currentPrice - stopLoss);

    // INTRADAY MODE: Fixed percentage-based targets for quick profits
    // Bank Nifty: 250pts (+0.4%), 450pts (+0.7%), 650pts (+1.0%)
    // Nifty: 90pts (+0.4%), 160pts (+0.7%), 230pts (+1.0%)
    let target1, target2, target3;

    target1 = currentPrice + (currentPrice * 0.004);  // +0.4% (quick intraday profit)
    target2 = currentPrice + (currentPrice * 0.007);  // +0.7% (extended move)
    target3 = currentPrice + (currentPrice * 0.010);  // +1.0% (strong move)

    const t1Points = Math.round(target1 - currentPrice);
    const t2Points = Math.round(target2 - currentPrice);
    const t3Points = Math.round(target3 - currentPrice);

    reasoning.push(`Target 1: ₹${target1.toFixed(2)} (+${t1Points} points / +0.4% - quick intraday profit)`);
    reasoning.push(`Target 2: ₹${target2.toFixed(2)} (+${t2Points} points / +0.7% - extended intraday move)`);
    reasoning.push(`Target 3: ₹${target3.toFixed(2)} (+${t3Points} points / +1.0% - strong intraday move)`);

    // Find recent high for additional context
    const recentHigh = this.findRecentHigh(candles, 20);
    if (recentHigh && recentHigh > currentPrice) {
      reasoning.push(`Recent swing high at ₹${recentHigh.toFixed(2)} - potential resistance`);
    }

    return {
      entry: currentPrice,
      stopLoss,
      target1,
      target2,
      target3,
      supportLevels: [],
      resistanceLevels: [],
      reasoning
    };
  }

  /**
   * Calculate SELL position levels
   */
  calculateSellLevels(currentPrice, pivots, swingLevels, atr, candles) {
    const reasoning = [];

    // INTRADAY MODE: Tight stop losses for quick short trades
    // Bank Nifty: 200-250 points (~0.35%), Nifty: 70-90 points (~0.35%)
    const isBankNifty = currentPrice > 50000;
    const intradayStopLoss = isBankNifty
      ? currentPrice * 0.0035  // 0.35% for Bank Nifty
      : currentPrice * 0.0035; // 0.35% for Nifty

    // Use tight intraday stop loss
    let stopLoss = currentPrice + intradayStopLoss;
    const slPoints = Math.round(stopLoss - currentPrice);
    reasoning.push(`Stop Loss at ₹${stopLoss.toFixed(2)} (+${slPoints} points / +0.35% for tight intraday risk management)`);

    // Optional: Adjust to recent swing high if it's closer and provides better protection
    const recentHigh = this.findRecentHigh(candles, 10); // Look at last 10 candles only
    if (recentHigh && recentHigh < stopLoss && recentHigh > currentPrice) {
      const distanceToHigh = recentHigh - currentPrice;
      const maxDistance = isBankNifty ? 300 : 100; // Max 300 pts for BankNifty, 100 for Nifty

      if (distanceToHigh < maxDistance) {
        stopLoss = recentHigh + 5; // 5 points above recent high
        const newSlPoints = Math.round(stopLoss - currentPrice);
        reasoning.push(`Adjusted to recent swing high: ₹${stopLoss.toFixed(2)} (+${newSlPoints} points)`);
      }
    }

    // Ensure stop loss is reasonable (not too wide for intraday)
    const actualSL = stopLoss - currentPrice;
    const maxSL = isBankNifty ? 300 : 100; // Maximum allowed SL
    if (actualSL > maxSL) {
      stopLoss = currentPrice + maxSL;
    }

    // Calculate risk for reference
    const risk = Math.abs(stopLoss - currentPrice);

    // INTRADAY MODE: Fixed percentage-based targets for quick short profits
    // Bank Nifty: 250pts (-0.4%), 450pts (-0.7%), 650pts (-1.0%)
    // Nifty: 90pts (-0.4%), 160pts (-0.7%), 230pts (-1.0%)
    let target1, target2, target3;

    target1 = currentPrice - (currentPrice * 0.004);  // -0.4% (quick intraday profit)
    target2 = currentPrice - (currentPrice * 0.007);  // -0.7% (extended move)
    target3 = currentPrice - (currentPrice * 0.010);  // -1.0% (strong move)

    const t1Points = Math.round(currentPrice - target1);
    const t2Points = Math.round(currentPrice - target2);
    const t3Points = Math.round(currentPrice - target3);

    reasoning.push(`Target 1: ₹${target1.toFixed(2)} (-${t1Points} points / -0.4% - quick intraday profit)`);
    reasoning.push(`Target 2: ₹${target2.toFixed(2)} (-${t2Points} points / -0.7% - extended intraday move)`);
    reasoning.push(`Target 3: ₹${target3.toFixed(2)} (-${t3Points} points / -1.0% - strong intraday move)`);

    const recentLow = this.findRecentLow(candles, 20);
    if (recentLow && recentLow < currentPrice) {
      reasoning.push(`Recent swing low at ₹${recentLow.toFixed(2)} - potential support`);
    }

    return {
      entry: currentPrice,
      stopLoss,
      target1,
      target2,
      target3,
      supportLevels: [],
      resistanceLevels: [],
      reasoning
    };
  }

  /**
   * Find swing levels (highs and lows)
   */
  findSwingLevels(candles, lookback = 20) {
    const recent = candles.slice(-lookback);

    return {
      swingHigh: Math.max(...recent.map(c => c.ohlc.high)),
      swingLow: Math.min(...recent.map(c => c.ohlc.low))
    };
  }

  /**
   * Find recent high
   */
  findRecentHigh(candles, lookback = 20) {
    if (candles.length < lookback) return null;
    const recent = candles.slice(-lookback);
    return Math.max(...recent.map(c => c.ohlc.high));
  }

  /**
   * Find recent low
   */
  findRecentLow(candles, lookback = 20) {
    if (candles.length < lookback) return null;
    const recent = candles.slice(-lookback);
    return Math.min(...recent.map(c => c.ohlc.low));
  }

  /**
   * Calculate ATR (Average True Range)
   */
  calculateATR(candles, period = 14) {
    if (candles.length < period + 1) {
      const lastCandle = candles[candles.length - 1];
      return lastCandle.ohlc.high - lastCandle.ohlc.low;
    }

    const trueRanges = [];
    for (let i = 1; i < candles.length; i++) {
      const high = candles[i].ohlc.high;
      const low = candles[i].ohlc.low;
      const prevClose = candles[i - 1].ohlc.close;

      const tr = Math.max(
        high - low,
        Math.abs(high - prevClose),
        Math.abs(low - prevClose)
      );
      trueRanges.push(tr);
    }

    const recentTR = trueRanges.slice(-period);
    return recentTR.reduce((sum, tr) => sum + tr, 0) / recentTR.length;
  }
}

module.exports = new LevelCalculator();
