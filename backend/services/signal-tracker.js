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
      // Find all active signals from TradingSignal
      const activeSignals = await TradingSignal.find({
        status: 'ACTIVE',
        'signal.action': { $in: ['BUY', 'STRONG_BUY', 'SELL', 'STRONG_SELL'] }
      }).sort({ timestamp: -1 });

      // Also check recent SignalHistory records without performance
      const today = new Date();
      today.setHours(0, 0, 0, 0);

      const pendingHistorySignals = await SignalHistory.find({
        marketTime: { $gte: today },
        'signal.action': { $in: ['BUY', 'STRONG_BUY', 'SELL', 'STRONG_SELL'] },
        $or: [
          { performance: { $exists: false } },
          { 'performance.outcome': 'PENDING' }
        ]
      }).sort({ marketTime: -1 });

      const totalSignals = activeSignals.length + pendingHistorySignals.length;
      if (totalSignals === 0) return;

      console.log(`\n🔍 Checking ${totalSignals} signal(s) (${activeSignals.length} active, ${pendingHistorySignals.length} history)...`);

      // Check TradingSignal records
      for (const signal of activeSignals) {
        await this.checkSignalStatus(signal);
      }

      // Check SignalHistory records
      for (const signal of pendingHistorySignals) {
        await this.checkHistorySignalStatus(signal);
      }

    } catch (error) {
      console.error('Error checking active signals:', error.message);
    }
  }

  /**
   * Check SignalHistory record status
   */
  async checkHistorySignalStatus(signal) {
    try {
      // Get latest price from API
      const candles = await dataFetcher.fetch(signal.symbol);
      if (!candles || candles.length === 0) return;

      const latestCandle = candles[candles.length - 1];
      const currentPrice = latestCandle.ohlc.close;
      const isBuy = signal.signal.action.includes('BUY');
      const entryPrice = signal.levels?.entry || signal.price;

      let hitLevel = null;
      let outcome = null;
      let profitLoss = 0;
      let profitLossPercent = 0;

      // Check if stop loss was hit
      if (signal.levels?.stopLoss) {
        if (isBuy && currentPrice <= signal.levels.stopLoss) {
          hitLevel = 'STOP_LOSS';
          outcome = 'LOSS';
          profitLoss = signal.levels.stopLoss - entryPrice;
          profitLossPercent = (profitLoss / entryPrice) * 100;
        } else if (!isBuy && currentPrice >= signal.levels.stopLoss) {
          hitLevel = 'STOP_LOSS';
          outcome = 'LOSS';
          profitLoss = entryPrice - signal.levels.stopLoss;
          profitLossPercent = (profitLoss / entryPrice) * 100;
        }
      }

      // Check if targets were hit
      if (!hitLevel && signal.levels) {
        if (isBuy) {
          if (signal.levels.target3 && currentPrice >= signal.levels.target3) {
            hitLevel = 'TARGET_3';
            outcome = 'WIN';
            profitLoss = signal.levels.target3 - entryPrice;
            profitLossPercent = (profitLoss / entryPrice) * 100;
          } else if (signal.levels.target2 && currentPrice >= signal.levels.target2) {
            hitLevel = 'TARGET_2';
            outcome = 'WIN';
            profitLoss = signal.levels.target2 - entryPrice;
            profitLossPercent = (profitLoss / entryPrice) * 100;
          } else if (signal.levels.target1 && currentPrice >= signal.levels.target1) {
            hitLevel = 'TARGET_1';
            outcome = 'WIN';
            profitLoss = signal.levels.target1 - entryPrice;
            profitLossPercent = (profitLoss / entryPrice) * 100;
          }
        } else { // SELL
          if (signal.levels.target3 && currentPrice <= signal.levels.target3) {
            hitLevel = 'TARGET_3';
            outcome = 'WIN';
            profitLoss = entryPrice - signal.levels.target3;
            profitLossPercent = (profitLoss / entryPrice) * 100;
          } else if (signal.levels.target2 && currentPrice <= signal.levels.target2) {
            hitLevel = 'TARGET_2';
            outcome = 'WIN';
            profitLoss = entryPrice - signal.levels.target2;
            profitLossPercent = (profitLoss / entryPrice) * 100;
          } else if (signal.levels.target1 && currentPrice <= signal.levels.target1) {
            hitLevel = 'TARGET_1';
            outcome = 'WIN';
            profitLoss = entryPrice - signal.levels.target1;
            profitLossPercent = (profitLoss / entryPrice) * 100;
          }
        }
      }

      // Update signal if target/SL was hit
      if (hitLevel) {
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

        const emoji = outcome === 'WIN' ? '✅' : '❌';
        console.log(`${emoji} ${signal.symbol} ${signal.signal.action} signal ${hitLevel}`);
        console.log(`   Entry: ${this.formatPrice(entryPrice, signal.symbol)} → Exit: ${this.formatPrice(currentPrice, signal.symbol)}`);
        console.log(`   P/L: ${profitLoss > 0 ? '+' : ''}${this.formatPrice(Math.abs(profitLoss), signal.symbol)} (${profitLossPercent > 0 ? '+' : ''}${profitLossPercent.toFixed(2)}%)`);
      }

    } catch (error) {
      console.error(`Error checking history signal ${signal._id}:`, error.message);
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
        // Check if market closed without hitting target/SL
        const marketClosed = this.isMarketClosed();

        if (marketClosed) {
          // Compare current price vs entry to determine P/L
          const priceDiff = isBuy ? (currentPrice - signal.levels.entry) : (signal.levels.entry - currentPrice);
          const wasProfit = priceDiff > 0;

          signal.status = wasProfit ? 'CLOSED_PROFIT' : 'CLOSED_LOSS';
          signal.performance = {
            outcome: wasProfit ? 'WIN' : 'LOSS',
            entryFilled: true,
            exitPrice: currentPrice,
            exitTime: latestCandle.timestamp,
            targetHit: 'MARKET_CLOSE',
            profitLoss: priceDiff,
            profitLossPercent: (priceDiff / signal.levels.entry) * 100,
            remarks: wasProfit
              ? '✓ Market closed in profit (Target not hit)'
              : '✗ Market closed in loss (Stop loss not hit)'
          };

          await signal.save();

          // Also update SignalHistory
          await SignalHistory.findOneAndUpdate(
            { symbol: signal.symbol, marketTime: signal.timestamp },
            { $set: { performance: signal.performance } }
          );

          const emoji = wasProfit ? '✅' : '❌';
          console.log(`${emoji} ${signal.symbol} signal closed at market close`);
          console.log(`   Entry: ${this.formatPrice(signal.levels.entry, signal.symbol)} → Close: ${this.formatPrice(currentPrice, signal.symbol)}`);
          console.log(`   P/L: ${priceDiff > 0 ? '+' : ''}${this.formatPrice(Math.abs(priceDiff), signal.symbol)} (${(priceDiff / signal.levels.entry * 100).toFixed(2)}%)`);
          console.log(`   ${signal.performance.remarks}`);

        } else {
          // Check if signal expired (4 hours old with no hit and market still open)
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
      }

    } catch (error) {
      console.error(`Error checking signal ${signal._id}:`, error.message);
    }
  }

  /**
   * Check if market is closed
   * NSE: 9:15 AM - 3:30 PM IST (Mon-Fri)
   */
  isMarketClosed() {
    const now = new Date();
    const istTime = new Date(now.toLocaleString('en-US', { timeZone: 'Asia/Kolkata' }));

    const day = istTime.getDay(); // 0 = Sunday, 6 = Saturday
    const hours = istTime.getHours();
    const minutes = istTime.getMinutes();
    const currentMinutes = hours * 60 + minutes;

    // Weekend
    if (day === 0 || day === 6) return true;

    // Market hours: 9:15 AM (555 min) to 3:30 PM (930 min)
    const marketOpen = 9 * 60 + 15;  // 555 minutes (9:15 AM)
    const marketClose = 15 * 60 + 30; // 930 minutes (3:30 PM)

    // Market closed if before 9:15 AM or after 3:30 PM
    return currentMinutes < marketOpen || currentMinutes > marketClose;
  }

  /**
   * Format price with correct currency symbol
   */
  formatPrice(price, symbol) {
    const currencySymbol = symbol === 'DOWJONES' ? '$' : '₹';
    return `${currencySymbol}${price.toFixed(2)}`;
  }

  /**
   * Process all signals at market close
   * Check remaining signals and calculate P/L based on close price
   */
  async processMarketCloseSignals() {
    try {
      console.log('\n🔔 Market closed - Processing remaining signals...\n');

      // Get all signals without performance data from SignalHistory
      const signals = await SignalHistory.find({
        $or: [
          { performance: { $exists: false } },
          { 'performance.outcome': 'PENDING' },
          { 'performance.outcome': { $exists: false } }
        ]
      }).sort({ marketTime: -1 });

      if (signals.length === 0) {
        console.log('✓ No signals to process at market close');
        return { processed: 0, profits: 0, losses: 0 };
      }

      console.log(`📊 Processing ${signals.length} signals at market close...`);

      let processed = 0;
      let profits = 0;
      let losses = 0;

      for (const signal of signals) {
        try {
          // Fetch latest price data
          const candles = await dataFetcher.fetch(signal.symbol);
          if (!candles || candles.length === 0) continue;

          const latestCandle = candles[candles.length - 1];
          const closePrice = latestCandle.ohlc.close;
          const entryPrice = signal.levels?.entry || signal.price;

          if (!entryPrice) continue;

          // Determine if BUY or SELL
          const isBuy = signal.signal?.action?.includes('BUY');

          // Calculate P/L
          let priceDiff, wasProfit;
          if (isBuy) {
            priceDiff = closePrice - entryPrice;
            wasProfit = priceDiff > 0;
          } else {
            priceDiff = entryPrice - closePrice;
            wasProfit = priceDiff > 0;
          }

          const profitLossPercent = (priceDiff / entryPrice) * 100;

          // Update signal performance
          signal.performance = {
            outcome: wasProfit ? 'WIN' : 'LOSS',
            entryFilled: true,
            exitPrice: closePrice,
            exitTime: latestCandle.timestamp,
            targetHit: 'MARKET_CLOSE',
            profitLoss: priceDiff,
            profitLossPercent,
            remarks: wasProfit
              ? '✓ Market closed in profit (Target not hit)'
              : '✗ Market closed in loss (Stop loss not hit)'
          };

          await signal.save();
          processed++;

          if (wasProfit) {
            profits++;
            console.log(`✅ ${signal.symbol} ${signal.signal.action}: +${this.formatPrice(Math.abs(priceDiff), signal.symbol)} (${profitLossPercent >= 0 ? '+' : ''}${profitLossPercent.toFixed(2)}%)`);
          } else {
            losses++;
            console.log(`❌ ${signal.symbol} ${signal.signal.action}: ${this.formatPrice(Math.abs(priceDiff), signal.symbol)} (${profitLossPercent.toFixed(2)}%)`);
          }

        } catch (error) {
          console.error(`Error processing signal ${signal._id}:`, error.message);
        }
      }

      const winRate = processed > 0 ? ((profits / processed) * 100).toFixed(1) : 0;

      console.log(`\n✅ Market close processing complete!`);
      console.log(`   Total: ${processed} signals`);
      console.log(`   Profits: ${profits} ✅`);
      console.log(`   Losses: ${losses} ❌`);
      console.log(`   Win Rate: ${winRate}%\n`);

      return { processed, profits, losses, winRate };

    } catch (error) {
      console.error('Error processing market close signals:', error.message);
      return { processed: 0, profits: 0, losses: 0 };
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
