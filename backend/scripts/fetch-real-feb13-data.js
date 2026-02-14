/**
 * Fetch Real Feb 13, 2024 Data
 * Attempts to get actual historical minute-level data
 */

require('dotenv').config();
const connectDB = require('../config/database');
const realDataFetcher = require('../services/real-data-fetcher');
const chartGenerator = require('../services/chart-generator');

async function fetchAndLoad() {
  try {
    // Connect to database
    await connectDB();

    console.log('🔍 Searching for real Feb 13, 2024 data from multiple sources...\n');

    // Try to fetch real data for Nifty 50
    const result = await realDataFetcher.loadRealDataToDatabase('NIFTY50');

    if (result.success) {
      console.log('═══════════════════════════════════════════════════════════════');
      console.log('  REAL DATA LOADED SUCCESSFULLY!');
      console.log('═══════════════════════════════════════════════════════════════\n');

      console.log(`📊 Data Count: ${result.count} minutes`);
      console.log(`⏰ Time Range: ${result.startTime.toLocaleString()} - ${result.endTime.toLocaleString()}`);
      console.log(`💰 Price Range:`);
      console.log(`   Open:  ₹${result.priceRange.open.toFixed(2)}`);
      console.log(`   High:  ₹${result.priceRange.high.toFixed(2)}`);
      console.log(`   Low:   ₹${result.priceRange.low.toFixed(2)}`);
      console.log(`   Close: ₹${result.priceRange.close.toFixed(2)}`);

      // Generate charts
      console.log('\n📊 Generating charts from real data...\n');
      await chartGenerator.generateAllTimeframes('NIFTY50', 72);

      console.log('\n✓ Complete! Real data is now loaded and ready for replay.');
      console.log('  Run the replay demo to see real market movements!\n');
    }

    process.exit(0);

  } catch (error) {
    console.error('\n❌ Error:', error.message);

    console.log('\n═══════════════════════════════════════════════════════════════');
    console.log('  SOLUTION: Use Simulated Realistic Data Instead');
    console.log('═══════════════════════════════════════════════════════════════\n');
    console.log('Since real minute-level data is not available, run:');
    console.log('  node scripts/load-realistic-feb13-data.js');
    console.log('  node scripts/generate-feb13-charts.js\n');
    console.log('The simulated data is based on actual Feb 13 patterns and');
    console.log('provides realistic intraday movements for testing!\n');

    process.exit(1);
  }
}

fetchAndLoad();
