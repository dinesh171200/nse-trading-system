/**
 * Load Realistic Historical Data for Feb 13, 2024
 *
 * This script loads realistic minute-by-minute market data
 * to test the system with simulated actual market movements
 */

require('dotenv').config();
const connectDB = require('../config/database');
const realisticGenerator = require('../services/realistic-data-generator');
const chartGenerator = require('../services/chart-generator');

async function loadAndTest() {
  try {
    // Connect to database
    await connectDB();

    // Load realistic data
    const result = await realisticGenerator.loadAllData();

    console.log('\n═══════════════════════════════════════════════════════════════');
    console.log('  DATA LOADING SUMMARY');
    console.log('═══════════════════════════════════════════════════════════════\n');

    // Nifty 50 Summary
    console.log('📈 NIFTY 50:');
    console.log(`   Candles Generated: ${result.nifty.totalTicks}`);
    console.log(`   Time Range:        ${result.nifty.timeRange.start.toLocaleString('en-IN', { timeZone: 'Asia/Kolkata' })} - ${result.nifty.timeRange.end.toLocaleString('en-IN', { timeZone: 'Asia/Kolkata' })}`);
    console.log(`   Open:              ₹${result.nifty.open.toFixed(2)}`);
    console.log(`   High:              ₹${result.nifty.high.toFixed(2)}`);
    console.log(`   Low:               ₹${result.nifty.low.toFixed(2)}`);
    console.log(`   Close:             ₹${result.nifty.close.toFixed(2)}`);
    console.log(`   Change:            ${result.nifty.change > 0 ? '+' : ''}₹${result.nifty.change.toFixed(2)} (${result.nifty.changePercent > 0 ? '+' : ''}${result.nifty.changePercent.toFixed(2)}%)`);
    console.log('');

    // Bank Nifty Summary
    console.log('🏦 BANK NIFTY:');
    console.log(`   Candles Generated: ${result.bankNifty.totalTicks}`);
    console.log(`   Time Range:        ${result.bankNifty.timeRange.start.toLocaleString('en-IN', { timeZone: 'Asia/Kolkata' })} - ${result.bankNifty.timeRange.end.toLocaleString('en-IN', { timeZone: 'Asia/Kolkata' })}`);
    console.log(`   Open:              ₹${result.bankNifty.open.toFixed(2)}`);
    console.log(`   High:              ₹${result.bankNifty.high.toFixed(2)}`);
    console.log(`   Low:               ₹${result.bankNifty.low.toFixed(2)}`);
    console.log(`   Close:             ₹${result.bankNifty.close.toFixed(2)}`);
    console.log(`   Change:            ${result.bankNifty.change > 0 ? '+' : ''}₹${result.bankNifty.change.toFixed(2)} (${result.bankNifty.changePercent > 0 ? '+' : ''}${result.bankNifty.changePercent.toFixed(2)}%)`);
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
    console.log('✓ REALISTIC DATA LOADED SUCCESSFULLY!');
    console.log('═══════════════════════════════════════════════════════════════\n');

    console.log('🎯 Next Steps:');
    console.log('   1. Test signals: curl "localhost:5000/api/test/signal?symbol=NIFTY50&timeframe=5m"');
    console.log('   2. Day summary: curl "localhost:5000/api/demo/day-summary/NIFTY50?timeframe=5m"');
    console.log('   3. Replay data: curl "localhost:5000/api/demo/replay/NIFTY50?limit=50"');
    console.log('   4. View on frontend: http://localhost:3000');
    console.log('');

    process.exit(0);

  } catch (error) {
    console.error('\n❌ Error loading realistic data:', error.message);
    console.error(error.stack);
    process.exit(1);
  }
}

// Run the loader
loadAndTest();
