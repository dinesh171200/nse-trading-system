const axios = require('axios');
const cheerio = require('cheerio');
const nseConfig = require('../config/nse-config');

class NSEFetcher {
  constructor() {
    this.baseURL = nseConfig.baseURL;
    this.headers = nseConfig.headers;
    this.cookies = null;
    this.retryCount = nseConfig.retryCount;
    this.timeout = nseConfig.timeout;
  }

  /**
   * Initialize session by getting cookies from NSE
   */
  async initSession() {
    try {
      const response = await axios.get(this.baseURL, {
        headers: this.headers,
        timeout: this.timeout
      });

      // Extract cookies from response
      if (response.headers['set-cookie']) {
        this.cookies = response.headers['set-cookie']
          .map(cookie => cookie.split(';')[0])
          .join('; ');
      }

      return true;
    } catch (error) {
      console.error('Failed to initialize NSE session:', error.message);
      return false;
    }
  }

  /**
   * Fetch data from NSE API
   */
  async fetchFromAPI(url) {
    // Ensure session is initialized
    if (!this.cookies) {
      await this.initSession();
    }

    try {
      const response = await axios.get(url, {
        headers: {
          ...this.headers,
          'Cookie': this.cookies || ''
        },
        timeout: this.timeout
      });

      return response.data;
    } catch (error) {
      // Retry with fresh session if unauthorized
      if (error.response?.status === 401 || error.response?.status === 403) {
        await this.initSession();
        const response = await axios.get(url, {
          headers: {
            ...this.headers,
            'Cookie': this.cookies || ''
          },
          timeout: this.timeout
        });
        return response.data;
      }
      throw error;
    }
  }

  /**
   * Fetch Nifty 50 data
   */
  async fetchNifty50() {
    try {
      const url = `${this.baseURL}/api/equity-stockIndices?index=NIFTY%2050`;
      const data = await this.fetchFromAPI(url);

      if (data && data.data && data.data.length > 0) {
        const niftyData = data.data.find(item => item.index === 'NIFTY 50');

        if (niftyData) {
          return {
            symbol: 'NIFTY50',
            price: parseFloat(niftyData.last),
            timestamp: new Date(),
            volume: parseInt(niftyData.totalTradedVolume) || 0,
            metadata: {
              open: parseFloat(niftyData.open),
              high: parseFloat(niftyData.high),
              low: parseFloat(niftyData.low),
              change: parseFloat(niftyData.change),
              changePercent: parseFloat(niftyData.pChange)
            },
            source: 'NSE'
          };
        }
      }

      throw new Error('Nifty 50 data not found in response');
    } catch (error) {
      console.error('Error fetching Nifty 50 data:', error.message);
      throw error;
    }
  }

  /**
   * Fetch Bank Nifty data
   */
  async fetchBankNifty() {
    try {
      const url = `${this.baseURL}/api/equity-stockIndices?index=NIFTY%20BANK`;
      const data = await this.fetchFromAPI(url);

      if (data && data.data && data.data.length > 0) {
        const bankNiftyData = data.data.find(item => item.index === 'NIFTY BANK');

        if (bankNiftyData) {
          return {
            symbol: 'BANKNIFTY',
            price: parseFloat(bankNiftyData.last),
            timestamp: new Date(),
            volume: parseInt(bankNiftyData.totalTradedVolume) || 0,
            metadata: {
              open: parseFloat(bankNiftyData.open),
              high: parseFloat(bankNiftyData.high),
              low: parseFloat(bankNiftyData.low),
              change: parseFloat(bankNiftyData.change),
              changePercent: parseFloat(bankNiftyData.pChange)
            },
            source: 'NSE'
          };
        }
      }

      throw new Error('Bank Nifty data not found in response');
    } catch (error) {
      console.error('Error fetching Bank Nifty data:', error.message);
      throw error;
    }
  }

  /**
   * Fetch both Nifty 50 and Bank Nifty data
   */
  async fetchAll() {
    try {
      const [nifty50, bankNifty] = await Promise.all([
        this.smartFetch('NIFTY50'),
        this.smartFetch('BANKNIFTY')
      ]);

      return {
        nifty50,
        bankNifty,
        fetchedAt: new Date()
      };
    } catch (error) {
      console.error('Error fetching NSE data:', error.message);
      throw error;
    }
  }

  /**
   * Fallback method using Yahoo Finance API
   * (More reliable but with slight delay)
   */
  async fetchFromYahooFinance(symbol) {
    try {
      const yahooSymbol = symbol === 'NIFTY50' ? '^NSEI' : '^NSEBANK';
      const url = `https://query1.finance.yahoo.com/v8/finance/chart/${yahooSymbol}?interval=1m&range=1d`;

      const response = await axios.get(url, {
        headers: {
          'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36'
        },
        timeout: 20000 // Longer timeout for Yahoo Finance
      });

      const result = response.data.chart.result[0];
      const meta = result.meta;
      const quote = result.indicators.quote[0];
      const timestamp = result.timestamp;

      // Get latest values (filter out null values)
      let lastIndex = quote.close.length - 1;
      while (lastIndex >= 0 && quote.close[lastIndex] === null) {
        lastIndex--;
      }

      if (lastIndex < 0) {
        throw new Error('No valid price data found');
      }

      const currentPrice = quote.close[lastIndex];

      return {
        symbol: symbol,
        price: currentPrice,
        timestamp: new Date(timestamp[lastIndex] * 1000),
        volume: quote.volume[lastIndex] || 0,
        metadata: {
          open: quote.open[lastIndex] || currentPrice,
          high: quote.high[lastIndex] || currentPrice,
          low: quote.low[lastIndex] || currentPrice,
          change: currentPrice - meta.previousClose,
          changePercent: ((currentPrice - meta.previousClose) / meta.previousClose) * 100
        },
        source: 'Yahoo Finance'
      };
    } catch (error) {
      console.error(`Error fetching ${symbol} from Yahoo Finance:`, error.message);
      throw error;
    }
  }

  /**
   * Smart fetch with fallback to Yahoo Finance
   */
  async smartFetch(symbol) {
    try {
      // Try NSE first
      if (symbol === 'NIFTY50') {
        return await this.fetchNifty50();
      } else if (symbol === 'BANKNIFTY') {
        return await this.fetchBankNifty();
      }
    } catch (error) {
      console.log(`NSE fetch failed for ${symbol}, trying Yahoo Finance...`);

      try {
        // Fallback to Yahoo Finance
        return await this.fetchFromYahooFinance(symbol);
      } catch (fallbackError) {
        console.error(`All fetch methods failed for ${symbol}`);
        throw fallbackError;
      }
    }
  }

  /**
   * Check if market is currently open
   */
  isMarketOpen() {
    const now = new Date();

    // Convert to IST (UTC+5:30)
    const istOffset = 5.5 * 60 * 60 * 1000;
    const istTime = new Date(now.getTime() + istOffset);

    const hour = istTime.getUTCHours();
    const minute = istTime.getUTCMinutes();
    const day = istTime.getUTCDay();

    // Check if weekend
    if (day === 0 || day === 6) {
      return false;
    }

    // Market hours: 9:15 AM to 3:30 PM IST
    const openTime = 9 * 60 + 15;  // 9:15 in minutes
    const closeTime = 15 * 60 + 30; // 15:30 in minutes
    const currentTime = hour * 60 + minute;

    return currentTime >= openTime && currentTime <= closeTime;
  }

  /**
   * Get current IST time
   */
  getISTTime() {
    const now = new Date();
    const istOffset = 5.5 * 60 * 60 * 1000;
    return new Date(now.getTime() + istOffset);
  }
}

module.exports = new NSEFetcher();
