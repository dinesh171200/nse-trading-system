/**
 * Load Historical Data for Feb 13, 2024
 *
 * This script loads real minute-by-minute market data
 * to test the system with actual market movements
 */

require('dotenv').config();
const connectDB = require('../config/database');
const historicalLoader = require('../services/historical-data-loader');
const chartGenerator = require('../services/chart-generator');

async function loadAndTest() {
  try {
    // Connect to database
    await connectDB();

    // Load historical data
    const result = await historicalLoader.loadAllData();

    console.log('\n═══════════════════════════════════════════════════════════════');
    console.log('  DATA LOADING SUMMARY');
    console.log('═══════════════════════════════════════════════════════════════\n');

    // Nifty 50 Summary
    console.log('📈 NIFTY 50:');
    console.log(`   Candles Loaded: ${result.nifty.candlesLoaded}`);
    console.log(`   Time Range:     ${result.nifty.timeRange.start.toLocaleTimeString()} - ${result.nifty.timeRange.end.toLocaleTimeString()}`);
    console.log(`   Open:           ₹${result.nifty.priceRange.open.toFixed(2)}`);
    console.log(`   High:           ₹${result.nifty.priceRange.high.toFixed(2)}`);
    console.log(`   Low:            ₹${result.nifty.priceRange.low.toFixed(2)}`);
    console.log(`   Close:          ₹${result.nifty.priceRange.close.toFixed(2)}`);

    const niftyChange = result.nifty.priceRange.close - result.nifty.priceRange.open;
    const niftyChangePct = (niftyChange / result.nifty.priceRange.open) * 100;
    console.log(`   Change:         ${niftyChange > 0 ? '+' : ''}₹${niftyChange.toFixed(2)} (${niftyChangePct > 0 ? '+' : ''}${niftyChangePct.toFixed(2)}%)`);
    console.log('');

    // Bank Nifty Summary
    console.log('🏦 BANK NIFTY:');
    console.log(`   Candles Loaded: ${result.bankNifty.candlesLoaded}`);
    console.log(`   Time Range:     ${result.bankNifty.timeRange.start.toLocaleTimeString()} - ${result.bankNifty.timeRange.end.toLocaleTimeString()}`);
    console.log(`   Open:           ₹${result.bankNifty.priceRange.open.toFixed(2)}`);
    console.log(`   High:           ₹${result.bankNifty.priceRange.high.toFixed(2)}`);
    console.log(`   Low:            ₹${result.bankNifty.priceRange.low.toFixed(2)}`);
    console.log(`   Close:          ₹${result.bankNifty.priceRange.close.toFixed(2)}`);

    const bankChange = result.bankNifty.priceRange.close - result.bankNifty.priceRange.open;
    const bankChangePct = (bankChange / result.bankNifty.priceRange.open) * 100;
    console.log(`   Change:         ${bankChange > 0 ? '+' : ''}₹${bankChange.toFixed(2)} (${bankChangePct > 0 ? '+' : ''}${bankChangePct.toFixed(2)}%)`);
    console.log('');

    // Generate charts from loaded data
    console.log('═══════════════════════════════════════════════════════════════');
    console.log('  GENERATING CHARTS FROM HISTORICAL DATA');
    console.log('═══════════════════════════════════════════════════════════════\n');

    console.log('📊 Generating OHLC charts for all timeframes...\n');

    // Generate charts for Nifty 50
    const niftyCharts = await chartGenerator.generateAllTimeframes('NIFTY50', 72);
    console.log(`✓ Generated ${niftyCharts.totalCandles} candles for NIFTY50 across ${niftyCharts.timeframes} timeframes`);

    // Generate charts for Bank Nifty
    const bankCharts = await chartGenerator.generateAllTimeframes('BANKNIFTY', 72);
    console.log(`✓ Generated ${bankCharts.totalCandles} candles for BANKNIFTY across ${bankCharts.timeframes} timeframes`);

    console.log('\n═══════════════════════════════════════════════════════════════');
    console.log('✓ HISTORICAL DATA LOADED SUCCESSFULLY!');
    console.log('═══════════════════════════════════════════════════════════════\n');

    console.log('🎯 Next Steps:');
    console.log('   1. Test signals: curl "localhost:3001/api/test/signal?symbol=NIFTY50&timeframe=5m"');
    console.log('   2. View on frontend: http://localhost:3000');
    console.log('   3. Test different timeframes: 1m, 5m, 15m, 30m, 1h');
    console.log('');

    process.exit(0);

  } catch (error) {
    console.error('\n❌ Error loading historical data:', error.message);
    console.error(error.stack);
    process.exit(1);
  }
}

// Run the loader
loadAndTest();
