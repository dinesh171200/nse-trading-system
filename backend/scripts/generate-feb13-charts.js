/**
 * Generate Charts from Feb 13, 2024 Historical Data
 * Uses the actual Feb 13 data instead of lookback time
 */

require('dotenv').config();
const connectDB = require('../config/database');
const TickData = require('../models/TickData');
const ChartData = require('../models/ChartData');
const { generateOHLC, getGroupingFunction } = require('../utils/ohlc-generator');
const { TIMEFRAMES } = require('../config/constants');

async function generateChartsForFeb13() {
  try {
    await connectDB();

    console.log('\n═══════════════════════════════════════════════════════════════');
    console.log('  GENERATING CHARTS FROM FEB 13, 2024 DATA');
    console.log('═══════════════════════════════════════════════════════════════\n');

    // Define Feb 13, 2024 date range
    const startDate = new Date('2024-02-13T03:45:00.000Z'); // 9:15 AM IST
    const endDate = new Date('2024-02-13T10:00:00.000Z');   // 3:30 PM IST + buffer

    const symbols = ['NIFTY50', 'BANKNIFTY'];
    const timeframes = Object.values(TIMEFRAMES);

    for (const symbol of symbols) {
      console.log(`📈 Generating charts for ${symbol}...`);

      // Fetch Feb 13 tick data
      const ticks = await TickData.find({
        symbol,
        timestamp: { $gte: startDate, $lt: endDate }
      }).sort({ timestamp: 1 });

      console.log(`   Found ${ticks.length} ticks from Feb 13, 2024`);

      if (ticks.length === 0) {
        console.log(`   ⚠️  No data found for ${symbol}`);
        continue;
      }

      // Clear existing chart data for Feb 13
      await ChartData.deleteMany({
        symbol,
        timestamp: { $gte: startDate, $lt: endDate }
      });

      let totalCandles = 0;

      // Generate for each timeframe
      for (const timeframe of timeframes) {
        console.log(`   📊 ${timeframe}: `, { ending: '' });

        // Group ticks by timeframe
        const groupingFunc = getGroupingFunction(timeframe);
        const groupedTicks = groupingFunc(ticks);

        // Generate OHLC candles
        const candles = [];
        for (const [timestamp, tickGroup] of Object.entries(groupedTicks)) {
          const ohlc = generateOHLC(tickGroup);

          if (ohlc) {
            candles.push({
              symbol,
              timeframe,
              timestamp: new Date(timestamp),
              ohlc: {
                open: ohlc.open,
                high: ohlc.high,
                low: ohlc.low,
                close: ohlc.close
              },
              volume: ohlc.volume,
              metadata: {
                tickCount: ohlc.tickCount,
                calculatedFrom: ohlc.firstTick,
                calculatedTo: ohlc.lastTick
              }
            });
          }
        }

        // Save to database
        if (candles.length > 0) {
          await ChartData.insertMany(candles);
        }

        totalCandles += candles.length;
        console.log(`${candles.length} candles`);
      }

      console.log(`   ✓ Total: ${totalCandles} candles across ${timeframes.length} timeframes\n`);
    }

    console.log('═══════════════════════════════════════════════════════════════');
    console.log('✓ CHARTS GENERATED SUCCESSFULLY!');
    console.log('═══════════════════════════════════════════════════════════════\n');

    console.log('🎯 Next Steps:');
    console.log('   1. Test day summary: curl "localhost:3001/api/demo/day-summary/NIFTY50?timeframe=5m"');
    console.log('   2. View charts: curl "localhost:3001/api/charts/NIFTY50/5m?limit=50"');
    console.log('   3. Generate signal: curl "localhost:3001/api/test/signal?symbol=NIFTY50&timeframe=5m"');
    console.log('');

    process.exit(0);

  } catch (error) {
    console.error('\n❌ Error:', error.message);
    console.error(error.stack);
    process.exit(1);
  }
}

generateChartsForFeb13();
