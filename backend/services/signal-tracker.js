/**
 * Signal Performance Tracker
 * Monitors active signals and updates their status when targets/SL are hit
 */

const TradingSignal = require('../models/TradingSignal');
const TickData = require('../models/TickData');

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
      // Get latest tick data for this symbol
      const latestTick = await TickData.findOne({
        symbol: signal.symbol,
        timestamp: { $gte: signal.timestamp }
      }).sort({ timestamp: -1 }).limit(1);

      if (!latestTick) return;

      const currentPrice = latestTick.price;
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
        signal.performance = {
          outcome,
          entryFilled: true,
          exitPrice: currentPrice,
          profitLoss,
          profitLossPercent,
          hitLevel
        };

        // Store exit time in metadata
        if (!signal.metadata) signal.metadata = {};
        signal.metadata.exitTime = latestTick.timestamp;

        await signal.save();

        const emoji = outcome === 'WIN' ? '✅' : '❌';
        console.log(`${emoji} ${signal.symbol} ${signal.signal.action} signal ${hitLevel}`);
        console.log(`   Entry: ₹${signal.levels.entry.toFixed(2)} → Exit: ₹${currentPrice.toFixed(2)}`);
        console.log(`   P/L: ${profitLoss > 0 ? '+' : ''}₹${profitLoss.toFixed(2)} (${profitLossPercent > 0 ? '+' : ''}${profitLossPercent.toFixed(2)}%)`);

      } else {
        // Check if signal expired (4 hours old with no hit)
        const signalAge = Date.now() - signal.timestamp.getTime();
        const FOUR_HOURS = 4 * 60 * 60 * 1000;

        if (signalAge > FOUR_HOURS) {
          signal.status = 'EXPIRED';
          signal.performance = {
            outcome: 'EXPIRED',
            entryFilled: false
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
