/**
 * Signal Performance Tracker
 * Monitors active signals and updates their status when targets/SL are hit
 */

const TradingSignal = require('../models/TradingSignal');
const SignalHistory = require('../models/SignalHistory');
const dataFetcher = require('./simple-data-fetcher');

class SignalTracker {
  constructor() {
    this.isTracking = false;
  }

  /**
   * Start tracking signal performance
   */
  async startTracking() {
    if (this.isTracking) return;

    this.isTracking = true;
    console.log('✓ Signal Performance Tracker started');

    // Check signals every minute
    setInterval(() => this.checkActiveSignals(), 60000);

    // Initial check
    await this.checkActiveSignals();
  }

  /**
   * Check all active signals and update their status
   */
  async checkActiveSignals() {
    try {
      // Find all active signals
      const activeSignals = await TradingSignal.find({
        status: 'ACTIVE',
        'signal.action': { $in: ['BUY', 'STRONG_BUY', 'SELL', 'STRONG_SELL'] }
      }).sort({ timestamp: -1 });

      if (activeSignals.length === 0) return;

      console.log(`\n🔍 Checking ${activeSignals.length} active signal(s)...`);

      for (const signal of activeSignals) {
        await this.checkSignalStatus(signal);
      }

    } catch (error) {
      console.error('Error checking active signals:', error.message);
    }
  }

  /**
   * Check individual signal status
   */
  async checkSignalStatus(signal) {
    try {
      // Get latest price from API (same as signal generator uses)
      const candles = await dataFetcher.fetch(signal.symbol);
      if (!candles || candles.length === 0) return;

      const latestCandle = candles[candles.length - 1];
      const currentPrice = latestCandle.ohlc.close;
      const isBuy = signal.signal.action.includes('BUY');

      let hitLevel = null;
      let outcome = null;
      let profitLoss = 0;
      let profitLossPercent = 0;

      // Check if stop loss was hit
      if (isBuy && currentPrice <= signal.levels.stopLoss) {
        hitLevel = 'STOP_LOSS';
        outcome = 'LOSS';
        profitLoss = signal.levels.stopLoss - signal.levels.entry;
        profitLossPercent = (profitLoss / signal.levels.entry) * 100;

      } else if (!isBuy && currentPrice >= signal.levels.stopLoss) {
        hitLevel = 'STOP_LOSS';
        outcome = 'LOSS';
        profitLoss = signal.levels.entry - signal.levels.stopLoss;
        profitLossPercent = (profitLoss / signal.levels.entry) * 100;
      }

      // Check if targets were hit
      else if (isBuy) {
        if (currentPrice >= signal.levels.target3) {
          hitLevel = 'TARGET_3';
          outcome = 'WIN';
          profitLoss = signal.levels.target3 - signal.levels.entry;
          profitLossPercent = (profitLoss / signal.levels.entry) * 100;

        } else if (currentPrice >= signal.levels.target2) {
          hitLevel = 'TARGET_2';
          outcome = 'WIN';
          profitLoss = signal.levels.target2 - signal.levels.entry;
          profitLossPercent = (profitLoss / signal.levels.entry) * 100;

        } else if (currentPrice >= signal.levels.target1) {
          hitLevel = 'TARGET_1';
          outcome = 'WIN';
          profitLoss = signal.levels.target1 - signal.levels.entry;
          profitLossPercent = (profitLoss / signal.levels.entry) * 100;
        }

      } else { // SELL
        if (currentPrice <= signal.levels.target3) {
          hitLevel = 'TARGET_3';
          outcome = 'WIN';
          profitLoss = signal.levels.entry - signal.levels.target3;
          profitLossPercent = (profitLoss / signal.levels.entry) * 100;

        } else if (currentPrice <= signal.levels.target2) {
          hitLevel = 'TARGET_2';
          outcome = 'WIN';
          profitLoss = signal.levels.entry - signal.levels.target2;
          profitLossPercent = (profitLoss / signal.levels.entry) * 100;

        } else if (currentPrice <= signal.levels.target1) {
          hitLevel = 'TARGET_1';
          outcome = 'WIN';
          profitLoss = signal.levels.entry - signal.levels.target1;
          profitLossPercent = (profitLoss / signal.levels.entry) * 100;
        }
      }

      // Update signal if target/SL was hit
      if (hitLevel) {
        signal.status = hitLevel === 'STOP_LOSS' ? 'HIT_SL' : 'HIT_TARGET';

        // Map hit level to target hit enum
        let targetHitEnum = 'NONE';
        if (hitLevel === 'STOP_LOSS') targetHitEnum = 'STOPLOSS';
        else if (hitLevel === 'TARGET_1') targetHitEnum = 'TARGET1';
        else if (hitLevel === 'TARGET_2') targetHitEnum = 'TARGET2';
        else if (hitLevel === 'TARGET_3') targetHitEnum = 'TARGET3';

        signal.performance = {
          outcome,
          entryFilled: true,
          exitPrice: currentPrice,
          exitTime: latestCandle.timestamp,
          targetHit: targetHitEnum,
          profitLoss,
          profitLossPercent,
          remarks: `Hit ${hitLevel.replace('_', ' ')} at ${this.formatPrice(currentPrice, signal.symbol)}`
        };

        await signal.save();

        // Also update SignalHistory if it exists
        await SignalHistory.findOneAndUpdate(
          { symbol: signal.symbol, marketTime: signal.timestamp },
          { $set: { performance: signal.performance } }
        );

        const emoji = outcome === 'WIN' ? '✅' : '❌';
        console.log(`${emoji} ${signal.symbol} ${signal.signal.action} signal ${hitLevel}`);
        console.log(`   Entry: ${this.formatPrice(signal.levels.entry, signal.symbol)} → Exit: ${this.formatPrice(currentPrice, signal.symbol)}`);
        console.log(`   P/L: ${profitLoss > 0 ? '+' : ''}${this.formatPrice(Math.abs(profitLoss), signal.symbol)} (${profitLossPercent > 0 ? '+' : ''}${profitLossPercent.toFixed(2)}%)`);

      } else {
        // Check if signal expired (4 hours old with no hit)
        const signalAge = Date.now() - signal.timestamp.getTime();
        const FOUR_HOURS = 4 * 60 * 60 * 1000;

        if (signalAge > FOUR_HOURS) {
          signal.status = 'EXPIRED';
          signal.performance = {
            outcome: 'PENDING',
            entryFilled: false,
            targetHit: 'NONE',
            remarks: 'Signal expired after 4 hours without hitting any level'
          };
          await signal.save();
          console.log(`⏰ ${signal.symbol} signal expired after 4 hours`);
        }
      }

    } catch (error) {
      console.error(`Error checking signal ${signal._id}:`, error.message);
    }
  }

  /**
   * Format price with correct currency symbol
   */
  formatPrice(price, symbol) {
    const currencySymbol = symbol === 'DOWJONES' ? '$' : '₹';
    return `${currencySymbol}${price.toFixed(2)}`;
  }

  /**
   * Get signal performance statistics
   */
  async getPerformanceStats(symbol, days = 7) {
    try {
      const startDate = new Date();
      startDate.setDate(startDate.getDate() - days);

      const signals = await TradingSignal.find({
        symbol,
        timestamp: { $gte: startDate },
        'performance.outcome': { $in: ['WIN', 'LOSS'] }
      });

      const wins = signals.filter(s => s.performance.outcome === 'WIN');
      const losses = signals.filter(s => s.performance.outcome === 'LOSS');

      const totalPL = signals.reduce((sum, s) => sum + (s.performance.profitLoss || 0), 0);
      const totalPLPercent = signals.reduce((sum, s) => sum + (s.performance.profitLossPercent || 0), 0);

      return {
        totalSignals: signals.length,
        wins: wins.length,
        losses: losses.length,
        winRate: signals.length > 0 ? ((wins.length / signals.length) * 100).toFixed(2) : 0,
        totalPL: totalPL.toFixed(2),
        avgPL: signals.length > 0 ? (totalPL / signals.length).toFixed(2) : 0,
        totalPLPercent: totalPLPercent.toFixed(2),
        avgPLPercent: signals.length > 0 ? (totalPLPercent / signals.length).toFixed(2) : 0,
        target1Hits: wins.filter(s => s.performance.hitLevel === 'TARGET_1').length,
        target2Hits: wins.filter(s => s.performance.hitLevel === 'TARGET_2').length,
        target3Hits: wins.filter(s => s.performance.hitLevel === 'TARGET_3').length
      };

    } catch (error) {
      console.error('Error getting performance stats:', error.message);
      return null;
    }
  }
}

module.exports = new SignalTracker();
