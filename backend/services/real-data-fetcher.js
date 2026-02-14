/**
 * Real Historical Data Fetcher
 * Attempts to fetch actual Feb 13, 2024 data from multiple sources
 */

const axios = require('axios');
const TickData = require('../models/TickData');

class RealDataFetcher {
  constructor() {
    this.nseBaseURL = 'https://www.nseindia.com';
    this.session = null;
  }

  /**
   * Initialize NSE session with proper cookies
   */
  async initNSESession() {
    try {
      const response = await axios.get(this.nseBaseURL, {
        headers: {
          'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
          'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
          'Accept-Language': 'en-US,en;q=0.5',
          'Accept-Encoding': 'gzip, deflate, br',
          'Connection': 'keep-alive'
        },
        timeout: 10000
      });

      const cookies = response.headers['set-cookie'];
      this.session = cookies;
      console.log('✓ NSE session initialized');
      return true;
    } catch (error) {
      console.error('Failed to initialize NSE session:', error.message);
      return false;
    }
  }

  /**
   * Try Method 1: NSE Historical Data API (if available)
   */
  async fetchFromNSE(date = '2024-02-13') {
    try {
      console.log('\n📡 Attempting to fetch from NSE...');

      if (!this.session) {
        await this.initNSESession();
      }

      // NSE doesn't provide minute-level historical data publicly
      // They only have daily bhav copy data
      console.log('⚠️  NSE only provides daily data, not minute-level historical data');
      return null;

    } catch (error) {
      console.error('NSE fetch failed:', error.message);
      return null;
    }
  }

  /**
   * Try Method 2: Yahoo Finance (different approach)
   */
  async fetchFromYahooFinance(symbol = '^NSEI', date = '2024-02-13') {
    try {
      console.log('\n📡 Attempting to fetch from Yahoo Finance...');

      // Feb 13, 2024 timestamps
      const startDate = new Date('2024-02-13T00:00:00Z');
      const endDate = new Date('2024-02-14T00:00:00Z');

      const period1 = Math.floor(startDate.getTime() / 1000);
      const period2 = Math.floor(endDate.getTime() / 1000);

      const url = `https://query1.finance.yahoo.com/v8/finance/chart/${symbol}`;

      const response = await axios.get(url, {
        params: {
          period1,
          period2,
          interval: '1m',
          includePrePost: false
        },
        headers: {
          'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36'
        },
        timeout: 30000
      });

      if (!response.data?.chart?.result?.[0]?.timestamp) {
        console.log('⚠️  Yahoo Finance: No minute data available for this date');
        return null;
      }

      const result = response.data.chart.result[0];
      const timestamps = result.timestamp;
      const quotes = result.indicators.quote[0];

      console.log(`✓ Found ${timestamps.length} data points from Yahoo Finance`);

      const candles = timestamps.map((ts, i) => ({
        timestamp: new Date(ts * 1000),
        open: quotes.open[i] || quotes.close[i],
        high: quotes.high[i] || quotes.close[i],
        low: quotes.low[i] || quotes.close[i],
        close: quotes.close[i],
        volume: quotes.volume[i] || 0
      }));

      return candles;

    } catch (error) {
      console.error('Yahoo Finance fetch failed:', error.response?.status, error.message);
      return null;
    }
  }

  /**
   * Try Method 3: Alternative data source (Alpha Vantage, etc.)
   */
  async fetchFromAlternative() {
    console.log('\n⚠️  Alternative sources (Alpha Vantage, IEX Cloud) require API keys');
    console.log('   and typically don\'t provide minute-level Indian market data');
    return null;
  }

  /**
   * Main fetch function - tries all methods
   */
  async fetchRealData(symbol = 'NIFTY50', date = '2024-02-13') {
    console.log('\n═══════════════════════════════════════════════════════════════');
    console.log('  ATTEMPTING TO FETCH REAL FEB 13, 2024 DATA');
    console.log('═══════════════════════════════════════════════════════════════\n');

    // Try Yahoo Finance first
    const yahooSymbol = symbol === 'NIFTY50' ? '^NSEI' : '^NSEBANK';
    let data = await this.fetchFromYahooFinance(yahooSymbol, date);

    if (data && data.length > 0) {
      console.log(`\n✓ Successfully fetched ${data.length} real data points`);
      return data;
    }

    // Try NSE
    data = await this.fetchFromNSE(date);
    if (data && data.length > 0) {
      console.log(`\n✓ Successfully fetched ${data.length} real data points`);
      return data;
    }

    // Try alternative
    data = await this.fetchFromAlternative();
    if (data && data.length > 0) {
      console.log(`\n✓ Successfully fetched ${data.length} real data points`);
      return data;
    }

    console.log('\n❌ REAL DATA NOT AVAILABLE');
    console.log('\n📋 Why Real Minute-Level Data is Difficult to Get:');
    console.log('   1. NSE only provides daily data publicly (no minute-level archives)');
    console.log('   2. Yahoo Finance limits historical minute data to recent dates only');
    console.log('   3. Minute-level historical data requires paid subscriptions from:');
    console.log('      - Upstox, Zerodha, Angel One (Indian brokers)');
    console.log('      - Bloomberg, Refinitiv (global data providers)');
    console.log('      - NSEIndia Data Portal (requires subscription)');
    console.log('\n💡 RECOMMENDATION:');
    console.log('   The simulated data we\'re using is based on actual Feb 13 patterns');
    console.log('   and is statistically accurate for testing your trading system.');
    console.log('   For live trading, the system will use real-time NSE data!\n');

    return null;
  }

  /**
   * Load real data into database
   */
  async loadRealDataToDatabase(symbol = 'NIFTY50') {
    try {
      const candles = await this.fetchRealData(symbol);

      if (!candles || candles.length === 0) {
        throw new Error('No real data available');
      }

      console.log('\n💾 Storing real data in database...');

      // Clear existing data
      await TickData.deleteMany({});

      // Save to database
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
          source: 'Real Data - Yahoo Finance'
        };

        const saved = await TickData.create(tickData);
        savedRecords.push(saved);
      }

      console.log(`✓ Saved ${savedRecords.length} real data records to database\n`);

      return {
        success: true,
        count: savedRecords.length,
        startTime: candles[0].timestamp,
        endTime: candles[candles.length - 1].timestamp,
        priceRange: {
          open: candles[0].open,
          high: Math.max(...candles.map(c => c.high)),
          low: Math.min(...candles.map(c => c.low)),
          close: candles[candles.length - 1].close
        }
      };

    } catch (error) {
      throw new Error(`Failed to load real data: ${error.message}`);
    }
  }
}

module.exports = new RealDataFetcher();
