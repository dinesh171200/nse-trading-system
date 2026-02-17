/**
 * Auto Signal Generator
 * Generates real-time trading signals analyzing all timeframes
 */

require('dotenv').config();
const connectDB = require('./config/database');
const ChartData = require('./models/ChartData');
const TradingSignal = require('./models/TradingSignal');
const signalCombiner = require('./services/signal-combiner');
const signalTracker = require('./services/signal-tracker');
const cron = require('node-cron');

const SYMBOLS = ['NIFTY50', 'BANKNIFTY'];
const TIMEFRAMES = ['1m', '5m', '15m', '30m', '1h'];
const MIN_CANDLES = 5; // Lowered for faster signal generation

// Track last signal prices for price-change detection
const lastSignalPrices = {
  NIFTY50: null,
  BANKNIFTY: null
};

// Minimum price change (%) to trigger signal regeneration
const PRICE_CHANGE_THRESHOLD = 0.3; // 0.3% price movement triggers new signal

// Check if significant price change occurred
function shouldGenerateSignal(symbol, currentPrice) {
  if (!lastSignalPrices[symbol]) return true; // First time, always generate

  const priceChange = Math.abs((currentPrice - lastSignalPrices[symbol]) / lastSignalPrices[symbol]) * 100;
  return priceChange >= PRICE_CHANGE_THRESHOLD;
}

async function generateSignals(triggeredBy = 'schedule') {
  try {
    const istTime = new Date().toLocaleString('en-IN', { timeZone: 'Asia/Kolkata' });
    console.log(`\n[${istTime}] 🔍 Analyzing market (triggered by: ${triggeredBy})...`);

    for (const symbol of SYMBOLS) {
      console.log(`\n📊 ${symbol}:`);

      let bestSignal = null;
      let bestConfidence = 0;

      // Analyze each timeframe
      for (const timeframe of TIMEFRAMES) {
        try {
          // Get latest candles for this timeframe
          const candles = await ChartData.find({ symbol, timeframe })
            .sort({ timestamp: -1 })
            .limit(100)
            .lean();

          if (candles.length < MIN_CANDLES) {
            console.log(`  ${timeframe}: ⏳ Not enough data (${candles.length}/${MIN_CANDLES})`);
            continue;
          }

          // Reverse to chronological order
          candles.reverse();

          // Generate signal for this timeframe
          const signal = await signalCombiner.generateSignal(candles, {
            symbol,
            timeframe,
            minConfidence: 0 // Generate all signals for analysis
          });

          const confidence = signal.signal.confidence;
          const action = signal.signal.action;

          console.log(`  ${timeframe}: ${action} (${confidence.toFixed(1)}%) - ${signal.signal.strength}`);

          // Track best signal across timeframes
          if (confidence > bestConfidence && action !== 'HOLD') {
            bestSignal = signal;
            bestConfidence = confidence;
          }

        } catch (error) {
          console.log(`  ${timeframe}: ❌ ${error.message}`);
        }
      }

      // Save best signal to database if confidence is high enough
      if (bestSignal && bestConfidence >= 50) {
        try {
          // Build comprehensive reasoning
          const entryReasoning = [
            `🎯 ${bestSignal.signal.action} Signal Generated`,
            `Timeframe: ${bestSignal.timeframe}`,
            `Confidence: ${bestConfidence.toFixed(1)}% (${bestSignal.signal.strength})`,
            '',
            '📊 Entry Basis:',
            ...bestSignal.reasoning.slice(0, 5),
            '',
            '💰 Trade Levels:',
            ...(bestSignal.levels.reasoning || [])
          ];

          const signalDoc = new TradingSignal({
            symbol,
            timeframe: bestSignal.timeframe,
            timestamp: new Date(),
            currentPrice: bestSignal.currentPrice,
            signal: bestSignal.signal,
            levels: {
              entry: bestSignal.levels.entry,
              stopLoss: bestSignal.levels.stopLoss,
              target1: bestSignal.levels.target1,
              target2: bestSignal.levels.target2,
              target3: bestSignal.levels.target3,
              riskRewardRatio: bestSignal.levels.riskRewardRatio
            },
            indicators: bestSignal.indicators,
            scoring: bestSignal.scoring,  // Include category scores
            reasoning: entryReasoning,
            alerts: bestSignal.alerts,
            // ENHANCED: Include market regime detection results
            marketRegime: bestSignal.marketRegime,
            // ENHANCED: Include dynamic weights used
            dynamicWeights: bestSignal.dynamicWeights,
            metadata: {
              candleCount: bestSignal.metadata?.candleCount || 0,
              source: 'auto-signal-generator',
              supportLevels: bestSignal.levels.supportLevels,
              resistanceLevels: bestSignal.levels.resistanceLevels,
              enhancedScoring: true  // Flag for enhanced scoring system
            }
          });

          await signalDoc.save();

          // Update last signal price for price-change detection
          lastSignalPrices[symbol] = bestSignal.currentPrice;

          console.log(`\n  ✅ SIGNAL SAVED: ${bestSignal.signal.action} @ ₹${bestSignal.currentPrice.toFixed(2)}`);
          console.log(`     Confidence: ${bestConfidence.toFixed(1)}% | Timeframe: ${bestSignal.timeframe}`);
          console.log(`     Entry: ₹${bestSignal.levels.entry.toFixed(2)} | SL: ₹${bestSignal.levels.stopLoss.toFixed(2)}`);
          console.log(`     Targets: ₹${bestSignal.levels.target1.toFixed(2)}, ₹${bestSignal.levels.target2.toFixed(2)}, ₹${bestSignal.levels.target3.toFixed(2)}`);

        } catch (error) {
          console.error(`  ❌ Error saving signal: ${error.message}`);
        }
      } else if (bestSignal) {
        console.log(`\n  ⚠️  Signal confidence too low (${bestConfidence.toFixed(1)}% < 50%)`);
      } else {
        console.log(`\n  ⏸️  No actionable signals (all HOLD)`);
      }
    }

    console.log('\n✓ Signal generation cycle completed');

  } catch (error) {
    console.error('❌ Error in signal generation:', error.message);
  }
}

async function start() {
  await connectDB();

  console.log('═══════════════════════════════════════════════════');
  console.log('  🎯 Auto Signal Generator - Multi-Timeframe Analysis');
  console.log('═══════════════════════════════════════════════════\n');
  console.log('✓ Analyzing: Nifty 50 & Bank Nifty');
  console.log('✓ Timeframes: 1m, 5m, 15m, 30m, 1h');
  console.log('✓ Update Interval: Every 1 minute');
  console.log('✓ Min Confidence: 50% to save signal');
  console.log('✓ Levels: Support/Resistance + Pivot Points');
  console.log('✓ Performance Tracking: Active');
  console.log('✓ Press Ctrl+C to stop\n');

  // Start signal performance tracker
  await signalTracker.startTracking();

  // Generate signals immediately
  await generateSignals('initial');

  // Schedule 1: Time-based - Run every 3 minutes regardless of price
  cron.schedule('*/3 * * * *', () => generateSignals('3-minute schedule'));

  // Schedule 2: Price-change based - Check every minute for significant price movement
  cron.schedule('* * * * *', async () => {
    try {
      // Get current prices
      const latestData = await ChartData.find({})
        .sort({ timestamp: -1 })
        .limit(2);

      for (const data of latestData) {
        const symbol = data.symbol;
        const currentPrice = data.ohlc.close;

        // Check if price changed significantly
        if (shouldGenerateSignal(symbol, currentPrice)) {
          const priceChange = lastSignalPrices[symbol]
            ? Math.abs((currentPrice - lastSignalPrices[symbol]) / lastSignalPrices[symbol]) * 100
            : 0;

          console.log(`\n⚡ Price change detected for ${symbol}: ${priceChange.toFixed(2)}% (threshold: ${PRICE_CHANGE_THRESHOLD}%)`);
          await generateSignals(`price-change: ${priceChange.toFixed(2)}%`);
          break; // Generate once, then wait for next check
        }
      }
    } catch (error) {
      // Silently fail - don't spam logs
    }
  });

  console.log('✓ Price-change monitoring: Active (checks every minute)');
  console.log(`✓ Price-change threshold: ${PRICE_CHANGE_THRESHOLD}% movement triggers new signal`);
}

start().catch(console.error);
