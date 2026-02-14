require('dotenv').config();
const connectDB = require('../config/database');
const chartGenerator = require('../services/chart-generator');
const TickData = require('../models/TickData');
const ChartData = require('../models/ChartData');

async function testChartGenerator() {
  try {
    // Connect to database
    await connectDB();

    console.log('═══════════════════════════════════════════════════════════');
    console.log('  Chart Generator Test');
    console.log('═══════════════════════════════════════════════════════════');
    console.log('');

    // Check available tick data
    const niftyTicks = await TickData.countDocuments({ symbol: 'NIFTY50' });
    const bankNiftyTicks = await TickData.countDocuments({ symbol: 'BANKNIFTY' });

    console.log('📊 Available Tick Data:');
    console.log(`  Nifty 50:     ${niftyTicks} ticks`);
    console.log(`  Bank Nifty:   ${bankNiftyTicks} ticks`);
    console.log('');

    if (niftyTicks === 0 && bankNiftyTicks === 0) {
      console.log('⚠️  No tick data available. Please run data agent first:');
      console.log('   node scripts/test-data-agent.js');
      console.log('   OR');
      console.log('   curl http://localhost:3001/api/test/data-agent');
      console.log('');
      process.exit(1);
    }

    // Test single timeframe generation
    console.log('🧪 Testing single timeframe generation (5m for NIFTY50)...');
    const result = await chartGenerator.generateChart('NIFTY50', '5m', {
      lookbackHours: 24,
      forceRegenerate: true
    });
    console.log(`  ✓ Generated ${result.count} candles`);
    console.log('');

    // Test all timeframes for both symbols
    console.log('🔄 Generating charts for all timeframes...');
    console.log('');
    const allResults = await chartGenerator.generateAll({
      lookbackHours: 24,
      forceRegenerate: true
    });

    // Display summary
    console.log('═══════════════════════════════════════════════════════════');
    console.log('  Summary');
    console.log('═══════════════════════════════════════════════════════════');
    console.log('');

    for (const [symbol, results] of Object.entries(allResults)) {
      console.log(`${symbol}:`);
      results.forEach(r => {
        if (r.error) {
          console.log(`  ✗ ${r.timeframe}: ${r.error}`);
        } else {
          console.log(`  ✓ ${r.timeframe}: ${r.count} candles`);
        }
      });
      console.log('');
    }

    // Check database
    const totalCandles = await ChartData.countDocuments();
    console.log(`Total candles in database: ${totalCandles}`);
    console.log('');

    // Display sample candle
    console.log('Sample 5m candle (NIFTY50):');
    const sampleCandle = await ChartData.findOne({
      symbol: 'NIFTY50',
      timeframe: '5m'
    }).sort({ timestamp: -1 });

    if (sampleCandle) {
      console.log(`  Timestamp: ${sampleCandle.timestamp.toLocaleString()}`);
      console.log(`  Open:      ₹${sampleCandle.ohlc.open.toFixed(2)}`);
      console.log(`  High:      ₹${sampleCandle.ohlc.high.toFixed(2)}`);
      console.log(`  Low:       ₹${sampleCandle.ohlc.low.toFixed(2)}`);
      console.log(`  Close:     ₹${sampleCandle.ohlc.close.toFixed(2)}`);
      console.log(`  Volume:    ${sampleCandle.volume}`);
      console.log(`  Ticks:     ${sampleCandle.metadata.tickCount}`);
    }

    console.log('');
    console.log('═══════════════════════════════════════════════════════════');
    console.log('✓ Chart generation test completed successfully');
    console.log('═══════════════════════════════════════════════════════════');

    process.exit(0);

  } catch (error) {
    console.error('✗ Test failed:', error.message);
    console.error(error.stack);
    process.exit(1);
  }
}

// Run the test
testChartGenerator();
