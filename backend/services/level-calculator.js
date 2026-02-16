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

    // Determine minimum stop loss based on instrument
    const minStopLoss = currentPrice > 50000 ? 50 : 20; // Bank Nifty: 50 pts, Nifty: 20 pts

    // Find nearest support below for stop loss
    let stopLoss = currentPrice - (atr * 2); // Fallback

    // Check pivot support levels
    const supports = [pivots.support.s1, pivots.support.s2, pivots.support.s3];
    const nearestSupport = supports
      .filter(s => s < currentPrice)
      .sort((a, b) => b - a)[0]; // Closest support below

    if (nearestSupport && (currentPrice - nearestSupport) >= minStopLoss && (currentPrice - nearestSupport) < 100) {
      // Use pivot support if it provides adequate stop loss
      stopLoss = nearestSupport - 2; // Place SL 2 points below support
      const slDistance = currentPrice - stopLoss;
      reasoning.push(`Stop Loss at ₹${stopLoss.toFixed(2)} (₹${slDistance.toFixed(2)} below entry, below S1 pivot at ₹${nearestSupport.toFixed(2)})`);
    } else {
      // Use swing low with minimum distance
      const recentLow = this.findRecentLow(candles, 20);
      if (recentLow && recentLow < currentPrice && (currentPrice - recentLow) >= minStopLoss) {
        stopLoss = recentLow - 2;
        const slDistance = currentPrice - stopLoss;
        reasoning.push(`Stop Loss at ₹${stopLoss.toFixed(2)} (₹${slDistance.toFixed(2)} below entry, below swing low at ₹${recentLow.toFixed(2)})`);
      } else {
        // Use minimum stop loss distance
        stopLoss = currentPrice - minStopLoss;
        reasoning.push(`Stop Loss at ₹${stopLoss.toFixed(2)} (${minStopLoss} points below entry for risk management)`);
      }
    }

    // Ensure minimum stop loss distance
    const actualSL = currentPrice - stopLoss;
    if (actualSL < minStopLoss) {
      stopLoss = currentPrice - minStopLoss;
      reasoning.push(`Stop Loss adjusted to ₹${stopLoss.toFixed(2)} (minimum ${minStopLoss} points)`);
    }

    // Calculate risk for target calculation
    const risk = Math.abs(currentPrice - stopLoss);

    // Find resistance levels above for targets
    const resistances = [pivots.resistance.r1, pivots.resistance.r2, pivots.resistance.r3];
    const resistancesAbove = resistances
      .filter(r => r > currentPrice)
      .sort((a, b) => a - b); // Ascending order

    let target1, target2, target3;

    // Always use risk-reward based targets for consistency (minimum 2:1, 3:1, 4:1)
    target1 = currentPrice + (risk * 2);   // 2:1 R/R
    target2 = currentPrice + (risk * 3);   // 3:1 R/R
    target3 = currentPrice + (risk * 4);   // 4:1 R/R

    reasoning.push(`Target 1: ₹${target1.toFixed(2)} (2:1 risk/reward = ${(risk * 2).toFixed(2)} points)`);
    reasoning.push(`Target 2: ₹${target2.toFixed(2)} (3:1 risk/reward = ${(risk * 3).toFixed(2)} points)`);
    reasoning.push(`Target 3: ₹${target3.toFixed(2)} (4:1 risk/reward = ${(risk * 4).toFixed(2)} points)`);

    // Mention nearby resistance levels
    if (resistancesAbove.length > 0) {
      reasoning.push(`Nearby resistances at: ₹${resistancesAbove.map(r => r.toFixed(2)).join(', ')}`);
    }

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
      supportLevels: supports.filter(s => s < currentPrice),
      resistanceLevels: resistancesAbove,
      reasoning
    };
  }

  /**
   * Calculate SELL position levels
   */
  calculateSellLevels(currentPrice, pivots, swingLevels, atr, candles) {
    const reasoning = [];

    // Determine minimum stop loss based on instrument
    const minStopLoss = currentPrice > 50000 ? 50 : 20; // Bank Nifty: 50 pts, Nifty: 20 pts

    // Find nearest resistance above for stop loss
    let stopLoss = currentPrice + (atr * 2); // Fallback

    const resistances = [pivots.resistance.r1, pivots.resistance.r2, pivots.resistance.r3];
    const nearestResistance = resistances
      .filter(r => r > currentPrice)
      .sort((a, b) => a - b)[0]; // Closest resistance above

    if (nearestResistance && (nearestResistance - currentPrice) >= minStopLoss && (nearestResistance - currentPrice) < 100) {
      stopLoss = nearestResistance + 2;
      const slDistance = stopLoss - currentPrice;
      reasoning.push(`Stop Loss at ₹${stopLoss.toFixed(2)} (₹${slDistance.toFixed(2)} above entry, above R1 pivot at ₹${nearestResistance.toFixed(2)})`);
    } else {
      const recentHigh = this.findRecentHigh(candles, 20);
      if (recentHigh && recentHigh > currentPrice && (recentHigh - currentPrice) >= minStopLoss) {
        stopLoss = recentHigh + 2;
        const slDistance = stopLoss - currentPrice;
        reasoning.push(`Stop Loss at ₹${stopLoss.toFixed(2)} (₹${slDistance.toFixed(2)} above entry, above swing high at ₹${recentHigh.toFixed(2)})`);
      } else {
        stopLoss = currentPrice + minStopLoss;
        reasoning.push(`Stop Loss at ₹${stopLoss.toFixed(2)} (${minStopLoss} points above entry for risk management)`);
      }
    }

    // Ensure minimum stop loss distance
    const actualSL = stopLoss - currentPrice;
    if (actualSL < minStopLoss) {
      stopLoss = currentPrice + minStopLoss;
      reasoning.push(`Stop Loss adjusted to ₹${stopLoss.toFixed(2)} (minimum ${minStopLoss} points)`);
    }

    // Calculate risk for target calculation
    const risk = Math.abs(stopLoss - currentPrice);

    // Find support levels below for targets
    const supports = [pivots.support.s1, pivots.support.s2, pivots.support.s3];
    const supportsBelow = supports
      .filter(s => s < currentPrice)
      .sort((a, b) => b - a); // Descending order

    let target1, target2, target3;

    // Always use risk-reward based targets for consistency (minimum 2:1, 3:1, 4:1)
    target1 = currentPrice - (risk * 2);   // 2:1 R/R
    target2 = currentPrice - (risk * 3);   // 3:1 R/R
    target3 = currentPrice - (risk * 4);   // 4:1 R/R

    reasoning.push(`Target 1: ₹${target1.toFixed(2)} (2:1 risk/reward = ${(risk * 2).toFixed(2)} points)`);
    reasoning.push(`Target 2: ₹${target2.toFixed(2)} (3:1 risk/reward = ${(risk * 3).toFixed(2)} points)`);
    reasoning.push(`Target 3: ₹${target3.toFixed(2)} (4:1 risk/reward = ${(risk * 4).toFixed(2)} points)`);

    // Mention nearby support levels
    if (supportsBelow.length > 0) {
      reasoning.push(`Nearby supports at: ₹${supportsBelow.map(s => s.toFixed(2)).join(', ')}`);
    }

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
      supportLevels: supportsBelow,
      resistanceLevels: resistances.filter(r => r > currentPrice),
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
