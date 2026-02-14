/**
 * Realistic Market Data Generator
 * Generates realistic intraday data based on actual market patterns
 * Simulates Feb 13, 2024 (9:15 AM - 3:30 PM IST)
 */

const TickData = require('../models/TickData');

class RealisticDataGenerator {
  /**
   * Generate realistic minute-by-minute data for a full trading day
   * Based on actual Feb 13, 2024 Nifty patterns:
   * - Opened around 21,900
   * - Traded in range 21,850 - 21,950
   * - Closed slightly positive
   */
  generateDayData(symbol = 'NIFTY50', basePrice = 21900) {
    const ticks = [];

    // Market timings: 9:15 AM - 3:30 PM (375 minutes)
    const startTime = new Date('2024-02-13T03:45:00.000Z'); // 9:15 AM IST
    const totalMinutes = 375;

    // Define market phases with realistic behavior
    const phases = [
      { name: 'OPENING', start: 0, end: 30, volatility: 0.0015, trend: -0.0002 }, // 9:15-9:45: Opening volatility, slight dip
      { name: 'MORNING', start: 30, end: 120, volatility: 0.001, trend: 0.0003 }, // 9:45-11:15: Recovery and rise
      { name: 'MID_DAY', start: 120, end: 240, volatility: 0.0008, trend: -0.0001 }, // 11:15-1:15: Consolidation
      { name: 'AFTERNOON', start: 240, end: 330, volatility: 0.001, trend: 0.0002 }, // 1:15-3:00: Afternoon rally attempt
      { name: 'CLOSING', start: 330, end: 375, volatility: 0.0012, trend: -0.0001 } // 3:00-3:30: Closing volatility
    ];

    let currentPrice = basePrice;

    for (let minute = 0; minute < totalMinutes; minute++) {
      // Find current phase
      const phase = phases.find(p => minute >= p.start && minute < p.end);

      // Calculate realistic price movement
      const trendEffect = currentPrice * phase.trend;
      const volatility = currentPrice * phase.volatility;
      const randomWalk = (Math.random() - 0.5) * 2 * volatility;

      // Add mean reversion (prices tend to revert to average)
      const meanReversion = (basePrice - currentPrice) * 0.02;

      // Add momentum (continuation of recent moves)
      const momentum = minute > 5 ? (ticks[minute - 1].close - ticks[minute - 5].close) * 0.1 : 0;

      // Calculate OHLC for this minute
      const open = currentPrice;
      const priceChange = trendEffect + randomWalk + meanReversion + momentum;
      const close = open + priceChange;

      // High and low with realistic spread
      const highLowSpread = volatility * 0.5;
      const high = Math.max(open, close) + Math.random() * highLowSpread;
      const low = Math.min(open, close) - Math.random() * highLowSpread;

      // Generate volume (higher at open/close, lower at lunch)
      let volumeMultiplier = 1.0;
      if (minute < 30 || minute > 330) volumeMultiplier = 1.5; // Higher at open/close
      if (minute > 180 && minute < 240) volumeMultiplier = 0.7; // Lower at lunch

      const volume = Math.floor((50000 + Math.random() * 100000) * volumeMultiplier);

      // Create timestamp
      const timestamp = new Date(startTime.getTime() + minute * 60 * 1000);

      ticks.push({
        timestamp,
        open,
        high,
        low,
        close,
        volume,
        phase: phase.name
      });

      currentPrice = close;
    }

    return ticks;
  }

  /**
   * Load generated data into database
   */
  async loadData(symbol = 'NIFTY50', basePrice = 21900) {
    try {
      console.log(`\n📊 Generating realistic data for ${symbol}...`);
      console.log(`Date: Feb 13, 2024 (9:15 AM - 3:30 PM IST)`);
      console.log(`Base Price: ₹${basePrice.toFixed(2)}`);

      const ticks = this.generateDayData(symbol, basePrice);

      console.log(`✓ Generated ${ticks.length} minute candles`);
      console.log(`\n💾 Storing data in database...`);

      // Save to database
      const savedRecords = [];
      for (const tick of ticks) {
        const change = tick.close - ticks[0].open;
        const changePercent = (change / ticks[0].open) * 100;

        const tickData = {
          symbol,
          price: tick.close,
          timestamp: tick.timestamp,
          volume: tick.volume,
          metadata: {
            open: tick.open,
            high: tick.high,
            low: tick.low,
            change,
            changePercent
          },
          source: 'Realistic Generator (Feb 13, 2024)'
        };

        const saved = await TickData.create(tickData);
        savedRecords.push(saved);
      }

      console.log(`✓ Saved ${savedRecords.length} records to database`);

      // Calculate day statistics
      const prices = ticks.map(t => t.close);
      const dayStats = {
        open: ticks[0].open,
        high: Math.max(...prices),
        low: Math.min(...prices),
        close: ticks[ticks.length - 1].close,
        change: ticks[ticks.length - 1].close - ticks[0].open,
        changePercent: ((ticks[ticks.length - 1].close - ticks[0].open) / ticks[0].open) * 100,
        totalTicks: ticks.length,
        timeRange: {
          start: ticks[0].timestamp,
          end: ticks[ticks.length - 1].timestamp
        }
      };

      return dayStats;

    } catch (error) {
      throw new Error(`Failed to load data: ${error.message}`);
    }
  }

  /**
   * Load data for both indices
   */
  async loadAllData() {
    try {
      console.log('═══════════════════════════════════════════════════════════════');
      console.log('  REALISTIC DATA GENERATOR');
      console.log('  Feb 13, 2024 (9:15 AM - 3:30 PM IST)');
      console.log('═══════════════════════════════════════════════════════════════\n');

      // Clear existing data
      console.log('🗑️  Clearing old data...');
      await TickData.deleteMany({});
      console.log('✓ Database cleared\n');

      // Generate Nifty 50 data (Feb 13, 2024 actual range: ~21,850-21,950)
      const niftyStats = await this.loadData('NIFTY50', 21900);

      // Generate Bank Nifty data (Feb 13, 2024 actual range: ~46,200-46,500)
      const bankNiftyStats = await this.loadData('BANKNIFTY', 46350);

      return {
        nifty: niftyStats,
        bankNifty: bankNiftyStats
      };

    } catch (error) {
      throw error;
    }
  }
}

module.exports = new RealisticDataGenerator();
