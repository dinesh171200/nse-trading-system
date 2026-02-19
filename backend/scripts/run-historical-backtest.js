/**
 * Historical Backtesting Script
 * Tests the signal system on previous days' data to calculate actual performance
 */

require('dotenv').config();
const connectDB = require('../config/database');
const SignalHistory = require('../models/SignalHistory');
const signalCombiner = require('../services/signal-combiner');
const dataFetcher = require('../services/simple-data-fetcher');

// Configuration
const SYMBOLS = ['NIFTY50', 'BANKNIFTY', 'DOWJONES'];
const SIGNAL_INTERVAL_MINUTES = 30; // Generate signal every 30 minutes during market hours
const LOOKBACK_CANDLES = 100; // Use 100 candles for each signal generation

/**
 * Check if a signal hit target or stop loss
 */
function checkSignalOutcome(signal, futureCandles, symbol) {
  const isBuy = signal.signal.action.includes('BUY');
  const entryPrice = signal.levels.entry;
  const stopLoss = signal.levels.stopLoss;
  const target1 = signal.levels.target1;
  const target2 = signal.levels.target2;
  const target3 = signal.levels.target3;

  let outcome = null;
  let exitPrice = null;
  let exitTime = null;
  let targetHit = 'NONE';

  // Check each future candle
  for (const candle of futureCandles) {
    const high = candle.ohlc.high;
    const low = candle.ohlc.low;
    const close = candle.ohlc.close;

    if (isBuy) {
      // Check stop loss first (conservative approach)
      if (low <= stopLoss) {
        outcome = 'LOSS';
        exitPrice = stopLoss;
        exitTime = candle.timestamp;
        targetHit = 'STOPLOSS';
        break;
      }
      // Check targets (in order T3 -> T2 -> T1)
      if (target3 && high >= target3) {
        outcome = 'WIN';
        exitPrice = target3;
        exitTime = candle.timestamp;
        targetHit = 'TARGET3';
        break;
      } else if (target2 && high >= target2) {
        outcome = 'WIN';
        exitPrice = target2;
        exitTime = candle.timestamp;
        targetHit = 'TARGET2';
        break;
      } else if (target1 && high >= target1) {
        outcome = 'WIN';
        exitPrice = target1;
        exitTime = candle.timestamp;
        targetHit = 'TARGET1';
        break;
      }
    } else { // SELL
      // Check stop loss first
      if (high >= stopLoss) {
        outcome = 'LOSS';
        exitPrice = stopLoss;
        exitTime = candle.timestamp;
        targetHit = 'STOPLOSS';
        break;
      }
      // Check targets
      if (target3 && low <= target3) {
        outcome = 'WIN';
        exitPrice = target3;
        exitTime = candle.timestamp;
        targetHit = 'TARGET3';
        break;
      } else if (target2 && low <= target2) {
        outcome = 'WIN';
        exitPrice = target2;
        exitTime = candle.timestamp;
        targetHit = 'TARGET2';
        break;
      } else if (target1 && low <= target1) {
        outcome = 'WIN';
        exitPrice = target1;
        exitTime = candle.timestamp;
        targetHit = 'TARGET1';
        break;
      }
    }
  }

  if (!outcome) {
    // No target or SL hit - signal expired
    return null;
  }

  // Calculate P/L
  const profitLoss = isBuy
    ? exitPrice - entryPrice
    : entryPrice - exitPrice;
  const profitLossPercent = (profitLoss / entryPrice) * 100;

  return {
    outcome,
    exitPrice,
    exitTime,
    targetHit,
    profitLoss,
    profitLossPercent
  };
}

/**
 * Run backtest for a symbol
 */
async function backtestSymbol(symbol) {
  try {
    console.log(`\n${'='.repeat(60)}`);
    console.log(`📊 Backtesting ${symbol}`);
    console.log('='.repeat(60));

    // Fetch all available historical data
    const allCandles = await dataFetcher.fetch(symbol);
    if (!allCandles || allCandles.length < LOOKBACK_CANDLES + 50) {
      console.log(`❌ Not enough data for ${symbol}`);
      return;
    }

    console.log(`✓ Fetched ${allCandles.length} candles`);

    // Sort by timestamp
    allCandles.sort((a, b) => new Date(a.timestamp) - new Date(b.timestamp));

    // Calculate how many signals we can generate
    const totalSignals = Math.floor((allCandles.length - LOOKBACK_CANDLES) / SIGNAL_INTERVAL_MINUTES);
    console.log(`✓ Will generate ${totalSignals} signals (every ${SIGNAL_INTERVAL_MINUTES} candles)`);

    let totalWins = 0;
    let totalLosses = 0;
    let totalProfitLoss = 0;
    let signalsGenerated = 0;

    // Generate signals at intervals
    for (let i = LOOKBACK_CANDLES; i < allCandles.length - 50; i += SIGNAL_INTERVAL_MINUTES) {
      const historicalCandles = allCandles.slice(i - LOOKBACK_CANDLES, i);
      const futureCandles = allCandles.slice(i, i + 200); // Look ahead up to 200 candles (16+ hours)

      const lastCandle = historicalCandles[historicalCandles.length - 1];
      const signalTime = lastCandle.timestamp;

      // Generate signal
      const signal = await signalCombiner.generateSignal(historicalCandles, {
        symbol,
        timeframe: '5m',
        minConfidence: 0
      });

      const action = signal.signal.action;

      // Only test BUY/SELL signals (skip HOLD)
      if (action !== 'HOLD') {
        signalsGenerated++;

        // Check what would have happened
        const performance = checkSignalOutcome(signal, futureCandles, symbol);

        if (performance) {
          // Save to SignalHistory
          const historyDoc = new SignalHistory({
            symbol,
            timeframe: '5m',
            marketTime: signalTime,
            signal: {
              action: signal.signal.action,
              strength: signal.signal.strength,
              confidence: signal.signal.confidence,
              confidenceLevel: signal.signal.confidenceLevel
            },
            price: signal.currentPrice,
            levels: signal.levels,
            scoring: signal.scoring,
            reasoning: signal.reasoning,
            metadata: {
              candlesAnalyzed: LOOKBACK_CANDLES,
              indicatorsUsed: Object.keys(signal.indicators || {}).length,
              processingTime: 0,
              backtested: true
            },
            performance: {
              outcome: performance.outcome,
              entryFilled: true,
              exitPrice: performance.exitPrice,
              exitTime: performance.exitTime,
              targetHit: performance.targetHit,
              profitLoss: performance.profitLoss,
              profitLossPercent: performance.profitLossPercent,
              remarks: `Backtest: Hit ${performance.targetHit} at ${performance.exitPrice.toFixed(2)}`
            }
          });

          await historyDoc.save();

          if (performance.outcome === 'WIN') {
            totalWins++;
            totalProfitLoss += performance.profitLoss;
            console.log(`✅ ${action} @ ${signal.currentPrice.toFixed(2)} → ${performance.targetHit} → +${performance.profitLossPercent.toFixed(2)}%`);
          } else {
            totalLosses++;
            totalProfitLoss += performance.profitLoss;
            console.log(`❌ ${action} @ ${signal.currentPrice.toFixed(2)} → SL → ${performance.profitLossPercent.toFixed(2)}%`);
          }
        }
      }
    }

    // Print summary
    console.log(`\n${'─'.repeat(60)}`);
    console.log(`📈 ${symbol} Backtest Results:`);
    console.log(`${'─'.repeat(60)}`);
    console.log(`Total Signals: ${signalsGenerated}`);
    console.log(`Wins: ${totalWins} (${((totalWins / signalsGenerated) * 100).toFixed(2)}%)`);
    console.log(`Losses: ${totalLosses} (${((totalLosses / signalsGenerated) * 100).toFixed(2)}%)`);
    console.log(`Total P/L: ${totalProfitLoss > 0 ? '+' : ''}${totalProfitLoss.toFixed(2)}`);
    console.log(`Avg P/L per trade: ${(totalProfitLoss / signalsGenerated).toFixed(2)}`);
    console.log(`${'─'.repeat(60)}\n`);

  } catch (error) {
    console.error(`❌ Error backtesting ${symbol}:`, error.message);
  }
}

/**
 * Main execution
 */
async function main() {
  try {
    await connectDB();

    console.log('\n' + '═'.repeat(70));
    console.log('  🔬 HISTORICAL BACKTESTING - NSE Trading System');
    console.log('═'.repeat(70));
    console.log(`\n⚙️  Configuration:`);
    console.log(`  • Signal Interval: Every ${SIGNAL_INTERVAL_MINUTES} candles (~${SIGNAL_INTERVAL_MINUTES * 5} minutes)`);
    console.log(`  • Lookback Period: ${LOOKBACK_CANDLES} candles`);
    console.log(`  • Symbols: ${SYMBOLS.join(', ')}`);
    console.log(`  • Entry Thresholds: 48% confidence, 10% directional bias`);

    const shouldClearHistory = process.argv.includes('--clear');
    if (shouldClearHistory) {
      console.log(`\n🗑️  Clearing existing backtest history...`);
      const result = await SignalHistory.deleteMany({ 'metadata.backtested': true });
      console.log(`✓ Deleted ${result.deletedCount} previous backtest results`);
    }

    console.log('\n🚀 Starting backtesting...\n');

    // Run backtest for each symbol
    for (const symbol of SYMBOLS) {
      await backtestSymbol(symbol);
      await new Promise(resolve => setTimeout(resolve, 1000)); // Brief pause between symbols
    }

    console.log('\n' + '═'.repeat(70));
    console.log('  ✅ BACKTESTING COMPLETE!');
    console.log('═'.repeat(70));
    console.log('\n📊 View results:');
    console.log('  • Frontend: http://localhost:3000/backtesting');
    console.log('  • API: http://localhost:3001/api/signals/statistics?symbol=ALL&days=30');
    console.log('\n');

    process.exit(0);

  } catch (error) {
    console.error('❌ Backtesting error:', error);
    process.exit(1);
  }
}

main();
