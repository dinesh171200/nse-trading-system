const TickData = require('../models/TickData');
const ChartData = require('../models/ChartData');
const { generateOHLC, getGroupingFunction } = require('../utils/ohlc-generator');
const { TIMEFRAMES } = require('../config/constants');

class ChartGenerator {
  constructor() {
    this.timeframes = Object.values(TIMEFRAMES);
  }

  /**
   * Generate chart for a specific symbol and timeframe
   * @param {String} symbol - NIFTY50 or BANKNIFTY
   * @param {String} timeframe - 1m, 5m, 15m, 30m, 1h, 1d
   * @param {Object} options - { lookbackHours, forceRegenerate }
   */
  async generateChart(symbol, timeframe, options = {}) {
    try {
      const { lookbackHours = 24, forceRegenerate = false } = options;

      // Calculate lookback time
      const lookbackTime = new Date();
      lookbackTime.setHours(lookbackTime.getHours() - lookbackHours);

      // Fetch tick data
      const ticks = await TickData.find({
        symbol,
        timestamp: { $gte: lookbackTime }
      }).sort({ timestamp: 1 });

      if (ticks.length === 0) {
        console.log(`  ⚠️  No tick data found for ${symbol}`);
        return { symbol, timeframe, candles: [], count: 0 };
      }

      console.log(`  📊 Processing ${ticks.length} ticks for ${symbol} (${timeframe})...`);

      // Group ticks by timeframe interval
      const groupingFunc = getGroupingFunction(timeframe);
      const groupedTicks = groupingFunc(ticks);

      // Generate OHLC candles
      const candles = [];
      for (const [timestamp, tickGroup] of Object.entries(groupedTicks)) {
        const ohlc = generateOHLC(tickGroup);

        if (ohlc) {
          const candleData = {
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
          };

          candles.push(candleData);
        }
      }

      // Store candles in database
      if (candles.length > 0) {
        // Delete existing candles for this timeframe if force regenerate
        if (forceRegenerate) {
          await ChartData.deleteMany({
            symbol,
            timeframe,
            timestamp: { $gte: lookbackTime }
          });
        }

        // Use upsert to avoid duplicates
        for (const candle of candles) {
          await ChartData.findOneAndUpdate(
            {
              symbol: candle.symbol,
              timeframe: candle.timeframe,
              timestamp: candle.timestamp
            },
            candle,
            { upsert: true, new: true }
          );
        }

        console.log(`  ✓ Generated ${candles.length} candles for ${symbol} (${timeframe})`);
      }

      return {
        symbol,
        timeframe,
        candles,
        count: candles.length
      };

    } catch (error) {
      console.error(`  ✗ Error generating chart for ${symbol} (${timeframe}):`, error.message);
      throw error;
    }
  }

  /**
   * Generate charts for all timeframes
   * @param {String} symbol - NIFTY50 or BANKNIFTY
   * @param {Object} options - Generation options
   */
  async generateAllTimeframes(symbol, options = {}) {
    console.log(`📈 Generating charts for ${symbol}...`);

    const results = [];

    for (const timeframe of this.timeframes) {
      try {
        const result = await this.generateChart(symbol, timeframe, options);
        results.push(result);
      } catch (error) {
        console.error(`  ✗ Failed to generate ${timeframe} chart:`, error.message);
        results.push({
          symbol,
          timeframe,
          error: error.message,
          count: 0
        });
      }
    }

    const totalCandles = results.reduce((sum, r) => sum + (r.count || 0), 0);
    console.log(`✓ Generated ${totalCandles} total candles for ${symbol}`);

    return results;
  }

  /**
   * Generate charts for all symbols and all timeframes
   */
  async generateAll(options = {}) {
    console.log('');
    console.log('═══════════════════════════════════════');
    console.log('  Chart Generator');
    console.log('═══════════════════════════════════════');
    console.log('');

    const symbols = ['NIFTY50', 'BANKNIFTY'];
    const allResults = {};

    for (const symbol of symbols) {
      allResults[symbol] = await this.generateAllTimeframes(symbol, options);
      console.log('');
    }

    return allResults;
  }

  /**
   * Get latest candles for a symbol and timeframe
   * @param {String} symbol - NIFTY50 or BANKNIFTY
   * @param {String} timeframe - 1m, 5m, 15m, 30m, 1h, 1d
   * @param {Number} limit - Number of candles to return
   */
  async getLatestCandles(symbol, timeframe, limit = 100) {
    try {
      const candles = await ChartData.find({
        symbol,
        timeframe
      })
        .sort({ timestamp: -1 })
        .limit(limit);

      // Reverse to get chronological order
      return candles.reverse();
    } catch (error) {
      console.error(`Error fetching candles: ${error.message}`);
      throw error;
    }
  }

  /**
   * Get candles for a date range
   */
  async getCandlesInRange(symbol, timeframe, startDate, endDate) {
    try {
      const candles = await ChartData.find({
        symbol,
        timeframe,
        timestamp: {
          $gte: new Date(startDate),
          $lte: new Date(endDate)
        }
      }).sort({ timestamp: 1 });

      return candles;
    } catch (error) {
      console.error(`Error fetching candles in range: ${error.message}`);
      throw error;
    }
  }

  /**
   * Delete old chart data
   * @param {Number} daysToKeep - Number of days to keep
   */
  async cleanup(daysToKeep = 30) {
    try {
      const cutoffDate = new Date();
      cutoffDate.setDate(cutoffDate.getDate() - daysToKeep);

      const result = await ChartData.deleteMany({
        timestamp: { $lt: cutoffDate }
      });

      console.log(`✓ Cleaned up ${result.deletedCount} old chart records`);
      return result;
    } catch (error) {
      console.error(`Error cleaning up chart data: ${error.message}`);
      throw error;
    }
  }
}

module.exports = new ChartGenerator();
