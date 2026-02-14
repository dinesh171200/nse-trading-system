/**
 * Historical Data Loader
 * Loads historical minute-by-minute data for testing
 *
 * Fetches data for Feb 13, 2024 (9:15 AM - 3:30 PM IST)
 */

const axios = require('axios');
const TickData = require('../models/TickData');

class HistoricalDataLoader {
  constructor() {
    this.baseURL = 'https://query1.finance.yahoo.com/v8/finance/chart';
  }

  /**
   * Fetch historical intraday data from Yahoo Finance
   * @param {String} symbol - Yahoo symbol (^NSEI for Nifty, ^NSEBANK for Bank Nifty)
   * @param {Date} startDate - Start date
   * @param {Date} endDate - End date
   * @returns {Array} Minute-by-minute candles
   */
  async fetchHistoricalData(symbol, startDate, endDate) {
    try {
      const period1 = Math.floor(startDate.getTime() / 1000);
      const period2 = Math.floor(endDate.getTime() / 1000);

      const url = `${this.baseURL}/${symbol}?period1=${period1}&period2=${period2}&interval=1m`;

      console.log(`Fetching historical data from Yahoo Finance...`);
      console.log(`URL: ${url}`);

      const response = await axios.get(url, {
        headers: {
          'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36'
        },
        timeout: 30000
      });

      if (!response.data || !response.data.chart || !response.data.chart.result) {
        throw new Error('Invalid response from Yahoo Finance');
      }

      const result = response.data.chart.result[0];
      const timestamps = result.timestamp;
      const quotes = result.indicators.quote[0];

      if (!timestamps || timestamps.length === 0) {
        throw new Error('No historical data available for this date range');
      }

      // Convert to candle format
      const candles = [];
      for (let i = 0; i < timestamps.length; i++) {
        const timestamp = new Date(timestamps[i] * 1000);

        // Only include market hours (9:15 AM - 3:30 PM IST)
        const hour = timestamp.getHours();
        const minute = timestamp.getMinutes();

        // Convert to IST (UTC+5:30)
        const istHour = (hour + 5) % 24;
        const istMinute = minute + 30;

        // Skip if outside market hours
        if (istHour < 9 || istHour > 15) continue;
        if (istHour === 9 && istMinute < 15) continue;
        if (istHour === 15 && istMinute > 30) continue;

        candles.push({
          timestamp,
          open: quotes.open[i] || quotes.close[i],
          high: quotes.high[i] || quotes.close[i],
          low: quotes.low[i] || quotes.close[i],
          close: quotes.close[i],
          volume: quotes.volume[i] || 0
        });
      }

      return candles;
    } catch (error) {
      throw new Error(`Failed to fetch historical data: ${error.message}`);
    }
  }

  /**
   * Load historical data for Feb 13, 2024
   * @param {String} symbol - NIFTY50 or BANKNIFTY
   * @returns {Object} Result with loaded data count
   */
  async loadFeb13Data(symbol = 'NIFTY50') {
    try {
      // Feb 13, 2024 - 9:00 AM to 4:00 PM IST (to include full market hours)
      const startDate = new Date('2024-02-13T03:30:00.000Z'); // 9:00 AM IST
      const endDate = new Date('2024-02-13T10:30:00.000Z');   // 4:00 PM IST

      // Yahoo Finance symbols
      const yahooSymbol = symbol === 'NIFTY50' ? '^NSEI' : '^NSEBANK';

      console.log(`\n📊 Loading historical data for ${symbol}...`);
      console.log(`Date: Feb 13, 2024 (9:15 AM - 3:30 PM IST)`);

      const candles = await this.fetchHistoricalData(yahooSymbol, startDate, endDate);

      if (candles.length === 0) {
        throw new Error('No data available for this date range');
      }

      console.log(`✓ Fetched ${candles.length} minute candles`);

      // Store in database
      console.log(`\n💾 Storing data in database...`);

      const savedRecords = [];
      for (const candle of candles) {
        const tickData = {
          symbol,
          price: candle.close,
          timestamp: candle.timestamp,
          volume: candle.volume,
          metadata: {
            open: candle.open,
            high: candle.high,
            low: candle.low,
            change: 0,
            changePercent: 0
          },
          source: 'Yahoo Finance Historical'
        };

        const saved = await TickData.create(tickData);
        savedRecords.push(saved);
      }

      console.log(`✓ Saved ${savedRecords.length} records to database`);

      return {
        symbol,
        date: 'Feb 13, 2024',
        candlesLoaded: candles.length,
        timeRange: {
          start: candles[0].timestamp,
          end: candles[candles.length - 1].timestamp
        },
        priceRange: {
          open: candles[0].open,
          high: Math.max(...candles.map(c => c.high)),
          low: Math.min(...candles.map(c => c.low)),
          close: candles[candles.length - 1].close
        }
      };

    } catch (error) {
      throw new Error(`Failed to load historical data: ${error.message}`);
    }
  }

  /**
   * Load data for both Nifty and Bank Nifty
   */
  async loadAllData() {
    try {
      console.log('═══════════════════════════════════════════════════════════════');
      console.log('  HISTORICAL DATA LOADER');
      console.log('  Feb 13, 2024 (9:15 AM - 3:30 PM IST)');
      console.log('═══════════════════════════════════════════════════════════════\n');

      // Clear existing data first
      console.log('🗑️  Clearing old data...');
      await TickData.deleteMany({});
      console.log('✓ Database cleared\n');

      // Load Nifty 50
      const niftyResult = await this.loadFeb13Data('NIFTY50');

      // Load Bank Nifty
      const bankNiftyResult = await this.loadFeb13Data('BANKNIFTY');

      return {
        nifty: niftyResult,
        bankNifty: bankNiftyResult
      };

    } catch (error) {
      throw error;
    }
  }
}

module.exports = new HistoricalDataLoader();
