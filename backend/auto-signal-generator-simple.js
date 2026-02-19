/**
 * SIMPLIFIED Auto Signal Generator
 * Fetches data directly from APIs (same as frontend)
 * No MongoDB data storage needed - just fetch and generate signals
 */

require('dotenv').config();
const connectDB = require('./config/database');
const TradingSignal = require('./models/TradingSignal');
const signalCombiner = require('./services/signal-combiner');
const dataFetcher = require('./services/simple-data-fetcher');
const cron = require('node-cron');

const SYMBOLS = ['NIFTY50', 'BANKNIFTY', 'DOWJONES'];

async function generateSignals(triggeredBy = 'schedule') {
  try {
    const istTime = new Date().toLocaleString('en-IN', { timeZone: 'Asia/Kolkata' });
    console.log(`\n[${istTime}] 🔍 Generating signals (${triggeredBy})...`);

    for (const symbol of SYMBOLS) {
      try {
        console.log(`\n📊 ${symbol}:`);

        // Fetch fresh data from API (same as frontend)
        const candles = await dataFetcher.fetch(symbol);

        if (!candles || candles.length < 50) {
          console.log(`  ⏳ Not enough data (${candles?.length || 0}/50 candles)`);
          continue;
        }

        // Sort by timestamp
        candles.sort((a, b) => new Date(a.timestamp) - new Date(b.timestamp));

        // Use last 100 candles for analysis
        const recentCandles = candles.slice(-100);

        // Generate signal
        const signal = await signalCombiner.generateSignal(recentCandles, {
          symbol,
          timeframe: '5m',
          minConfidence: 0 // Generate all signals
        });

        if (!signal || !signal.signal) {
          console.log(`  ❌ Signal generation returned invalid data`);
          continue;
        }

        const action = signal.signal.action;
        const confidence = signal.signal.confidence;
        const bullish = signal.signal.bullishPercentage;
        const bearish = signal.signal.bearishPercentage;

        console.log(`  ${action} - ${confidence.toFixed(1)}% confidence`);
        console.log(`  📈 Bullish: ${bullish}% | 📉 Bearish: ${bearish}%`);

        // Save signal to database (ONLY the signal, not the raw data)
        const signalDoc = new TradingSignal({
          symbol,
          timeframe: '5m',
          timestamp: new Date(),
          currentPrice: signal.currentPrice,
          signal: signal.signal,
          levels: signal.levels,
          indicators: signal.indicators,
          scoring: signal.scoring,
          reasoning: signal.reasoning,
          alerts: signal.alerts,
          marketRegime: signal.marketRegime,
          dynamicWeights: signal.dynamicWeights,
          metadata: {
            candleCount: recentCandles.length,
            source: 'simple-auto-generator',
            enhancedScoring: true
          }
        });

        await signalDoc.save();

        if (action !== 'HOLD') {
          console.log(`  ✅ ${action} @ $${signal.currentPrice.toFixed(2)}`);
          console.log(`     Entry: ${signal.levels.entry.toFixed(2)} | SL: ${signal.levels.stopLoss.toFixed(2)}`);
        } else {
          console.log(`  ⏸️  No entry - market ranging`);
        }

      } catch (error) {
        console.log(`  ❌ Error: ${error.message}`);
        console.log(`     Stack: ${error.stack?.split('\n')[1]?.trim()}`); // Show first line of stack
      }
    }

    console.log('\n✓ Signal generation completed');

  } catch (error) {
    console.error('❌ Signal generation error:', error.message);
  }
}

async function start() {
  await connectDB();

  console.log('═══════════════════════════════════════════════════');
  console.log('  🎯 SIMPLIFIED Auto Signal Generator');
  console.log('═══════════════════════════════════════════════════\n');
  console.log('✓ Symbols: Nifty 50, Bank Nifty, Dow Jones');
  console.log('✓ Data Source: MoneyControl & Investing.com (same as frontend)');
  console.log('✓ Update: Every 1 minute (real-time signals)');
  console.log('✓ No MongoDB data storage - fetch fresh every time');
  console.log('✓ Press Ctrl+C to stop\n');

  // Generate immediately
  await generateSignals('initial');

  // Schedule every 1 minute for real-time updates
  cron.schedule('*/1 * * * *', () => generateSignals('1-minute schedule'));

  console.log('✓ Scheduler started - signals every 1 minute');
}

start().catch(console.error);
