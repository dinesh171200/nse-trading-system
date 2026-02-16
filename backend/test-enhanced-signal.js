/**
 * Test Enhanced Signal Generation
 * Directly tests the signal combiner with enhanced features
 */

const mongoose = require('mongoose');
require('dotenv').config();

const ChartData = require('./models/ChartData');
const signalCombiner = require('./services/signal-combiner');

async function testEnhancedSignal() {
  try {
    console.log('\n🧪 Testing Enhanced Signal Generation...\n');

    // Connect to database
    await mongoose.connect(process.env.MONGODB_URI, {
      useNewUrlParser: true,
      useUnifiedTopology: true
    });
    console.log('✓ Connected to MongoDB\n');

    // Fetch recent chart data for NIFTY50
    const charts = await ChartData.find({ symbol: 'NIFTY50' })
      .sort({ timestamp: -1 })
      .limit(200)
      .lean();

    if (!charts || charts.length === 0) {
      console.log('❌ No chart data found for NIFTY50');
      process.exit(1);
    }

    console.log(`✓ Fetched ${charts.length} candles for NIFTY50\n`);

    const chartData = charts.reverse();

    // Generate signal with enhanced features
    console.log('⏳ Generating signal with enhanced features...\n');
    const signal = await signalCombiner.generateSignal(chartData, {
      symbol: 'NIFTY50',
      timeframe: '5m',
      minConfidence: 0
    });

    // Display enhanced features
    console.log('═══════════════════════════════════════════════════');
    console.log('📊 ENHANCED SIGNAL GENERATION TEST RESULTS');
    console.log('═══════════════════════════════════════════════════\n');

    console.log('🔍 Market Regime Detection:');
    console.log('  Regime:', signal.marketRegime?.regime || 'NULL');
    console.log('  Volatility:', signal.marketRegime?.volatility || 'NULL');
    console.log('  Confidence:', signal.marketRegime?.confidence || 'NULL');
    console.log('  Interpretation:', signal.marketRegime?.interpretation || 'NULL');
    console.log();

    console.log('⚖️  Dynamic Weights:');
    if (signal.dynamicWeights) {
      console.log('  Trend:', (signal.dynamicWeights.TREND * 100).toFixed(1) + '%');
      console.log('  Momentum:', (signal.dynamicWeights.MOMENTUM * 100).toFixed(1) + '%');
      console.log('  Volume:', (signal.dynamicWeights.VOLUME * 100).toFixed(1) + '%');
      console.log('  Volatility:', (signal.dynamicWeights.VOLATILITY * 100).toFixed(1) + '%');
      console.log('  Support/Resistance:', (signal.dynamicWeights.SUPPORT_RESISTANCE * 100).toFixed(1) + '%');
      console.log('  Patterns:', (signal.dynamicWeights.PATTERNS * 100).toFixed(1) + '%');
    } else {
      console.log('  NULL');
    }
    console.log();

    console.log('📈 Signal:');
    console.log('  Action:', signal.signal.action);
    console.log('  Strength:', signal.signal.strength);
    console.log('  Confidence:', signal.signal.confidence.toFixed(2) + '%');
    console.log();

    console.log('📊 Indicators Calculated:', Object.keys(signal.indicators).length);
    console.log();

    console.log('🎯 New Indicators Present:');
    const newIndicators = [
      'ppo', 'elder_ray', 'kst', 'rvi', 'coppock_curve',
      'schaff_trend', 'wavetrend', 'dema', 'tema', 'hma',
      'klinger', 'pvt', 'nvi', 'pvi', 'ulcer_index', 'natr',
      'bollinger_bandwidth', 'bollinger_percent_b', 'qstick', 'trix', 'tsi'
    ];

    let foundCount = 0;
    for (const indicator of newIndicators) {
      if (signal.indicators[indicator]) {
        foundCount++;
        console.log(`  ✓ ${indicator}`);
      }
    }
    console.log(`\n  Total: ${foundCount}/${newIndicators.length} new indicators found`);
    console.log();

    console.log('═══════════════════════════════════════════════════');
    console.log(signal.marketRegime && signal.dynamicWeights
      ? '✅ ENHANCED FEATURES WORKING CORRECTLY'
      : '❌ ENHANCED FEATURES NOT WORKING');
    console.log('═══════════════════════════════════════════════════\n');

    process.exit(0);

  } catch (error) {
    console.error('❌ Error:', error.message);
    console.error(error.stack);
    process.exit(1);
  }
}

testEnhancedSignal();
