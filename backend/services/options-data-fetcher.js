/**
 * Options Data Fetcher
 * Fetches Options Chain data from NSE for PCR and OI analysis
 *
 * IMPORTANT: NSE Options API requires proper headers and cookies
 * Direct scraping may violate NSE Terms of Service
 *
 * For production, use:
 * - Official broker APIs (Zerodha Kite, Upstox, etc.)
 * - Professional data providers
 * - Licensed data feeds
 */

const axios = require('axios');

class OptionsDataFetcher {
  constructor() {
    this.nseBaseURL = 'https://www.nseindia.com';
    this.session = null;
    this.cookies = '';
  }

  /**
   * Initialize NSE session (required for options data)
   */
  async initializeSession() {
    try {
      const response = await axios.get(this.nseBaseURL, {
        headers: {
          'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36',
          'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/webp,*/*;q=0.8',
          'Accept-Language': 'en-US,en;q=0.5',
          'Accept-Encoding': 'gzip, deflate, br',
          'Connection': 'keep-alive',
          'Upgrade-Insecure-Requests': '1'
        },
        timeout: 10000
      });

      // Extract cookies
      if (response.headers['set-cookie']) {
        this.cookies = response.headers['set-cookie']
          .map(cookie => cookie.split(';')[0])
          .join('; ');
      }

      this.session = true;
      return true;
    } catch (error) {
      throw new Error(`Failed to initialize NSE session: ${error.message}`);
    }
  }

  /**
   * Fetch Options Chain for a symbol
   * @param {String} symbol - NIFTY or BANKNIFTY
   * @returns {Object} Options chain data
   */
  async fetchOptionsChain(symbol = 'NIFTY') {
    if (!this.session) {
      await this.initializeSession();
    }

    try {
      const url = `${this.nseBaseURL}/api/option-chain-indices?symbol=${symbol}`;

      const response = await axios.get(url, {
        headers: {
          'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
          'Accept': 'application/json',
          'Accept-Language': 'en-US,en;q=0.9',
          'Accept-Encoding': 'gzip, deflate, br',
          'Connection': 'keep-alive',
          'Cookie': this.cookies,
          'Referer': `${this.nseBaseURL}/option-chain`
        },
        timeout: 15000
      });

      if (response.data && response.data.records) {
        return this.parseOptionsChain(response.data);
      }

      throw new Error('Invalid options chain data received');
    } catch (error) {
      throw new Error(`Failed to fetch options chain: ${error.message}`);
    }
  }

  /**
   * Parse options chain data
   */
  parseOptionsChain(data) {
    const records = data.records;
    const spotPrice = records.underlyingValue;

    const CE = [];
    const PE = [];

    records.data.forEach(strike => {
      if (strike.CE) {
        CE.push({
          strikePrice: strike.strikePrice,
          openInterest: strike.CE.openInterest || 0,
          changeinOpenInterest: strike.CE.changeinOpenInterest || 0,
          volume: strike.CE.totalTradedVolume || 0,
          impliedVolatility: strike.CE.impliedVolatility || 0,
          lastPrice: strike.CE.lastPrice || 0,
          change: strike.CE.change || 0,
          pchangeinOpenInterest: strike.CE.pchangeinOpenInterest || 0
        });
      }

      if (strike.PE) {
        PE.push({
          strikePrice: strike.strikePrice,
          openInterest: strike.PE.openInterest || 0,
          changeinOpenInterest: strike.PE.changeinOpenInterest || 0,
          volume: strike.PE.totalTradedVolume || 0,
          impliedVolatility: strike.PE.impliedVolatility || 0,
          lastPrice: strike.PE.lastPrice || 0,
          change: strike.PE.change || 0,
          pchangeinOpenInterest: strike.PE.pchangeinOpenInterest || 0
        });
      }
    });

    return {
      symbol: data.records.data[0]?.expiryDate ? 'NIFTY' : 'BANKNIFTY',
      spotPrice,
      expiryDate: records.expiryDates[0],
      CE,
      PE,
      timestamp: new Date()
    };
  }

  /**
   * Fetch NIFTY options
   */
  async fetchNiftyOptions() {
    return await this.fetchOptionsChain('NIFTY');
  }

  /**
   * Fetch BANKNIFTY options
   */
  async fetchBankNiftyOptions() {
    return await this.fetchOptionsChain('BANKNIFTY');
  }

  /**
   * Get PCR data
   */
  async getPCRData(symbol = 'NIFTY') {
    const optionsData = await this.fetchOptionsChain(symbol);

    const putOI = optionsData.PE.reduce((sum, opt) => sum + opt.openInterest, 0);
    const callOI = optionsData.CE.reduce((sum, opt) => sum + opt.openInterest, 0);
    const pcr = callOI > 0 ? putOI / callOI : 0;

    const putVolume = optionsData.PE.reduce((sum, opt) => sum + opt.volume, 0);
    const callVolume = optionsData.CE.reduce((sum, opt) => sum + opt.volume, 0);
    const pcrVolume = callVolume > 0 ? putVolume / callVolume : 0;

    return {
      symbol,
      pcr,
      pcrVolume,
      putOI,
      callOI,
      putVolume,
      callVolume,
      spotPrice: optionsData.spotPrice,
      timestamp: new Date()
    };
  }

  /**
   * Get max pain level
   */
  async getMaxPain(symbol = 'NIFTY') {
    const optionsData = await this.fetchOptionsChain(symbol);

    // Calculate pain for each strike
    const strikes = {};

    optionsData.CE.forEach(opt => {
      if (!strikes[opt.strikePrice]) {
        strikes[opt.strikePrice] = { call: 0, put: 0 };
      }
      strikes[opt.strikePrice].call = opt.openInterest;
    });

    optionsData.PE.forEach(opt => {
      if (!strikes[opt.strikePrice]) {
        strikes[opt.strikePrice] = { call: 0, put: 0 };
      }
      strikes[opt.strikePrice].put = opt.openInterest;
    });

    // Calculate pain for each potential expiry price
    const painPoints = Object.entries(strikes).map(([strike, oi]) => {
      const strikeNum = parseFloat(strike);
      let pain = 0;

      Object.entries(strikes).forEach(([s, o]) => {
        const sNum = parseFloat(s);
        if (sNum < strikeNum) {
          pain += o.put * (strikeNum - sNum);
        } else if (sNum > strikeNum) {
          pain += o.call * (sNum - strikeNum);
        }
      });

      return {
        strike: strikeNum,
        pain,
        totalOI: oi.call + oi.put
      };
    });

    const maxPain = painPoints.reduce((min, p) => p.pain < min.pain ? p : min);

    return {
      symbol,
      maxPainStrike: maxPain.strike,
      currentPrice: optionsData.spotPrice,
      distance: ((optionsData.spotPrice - maxPain.strike) / optionsData.spotPrice) * 100,
      totalOI: maxPain.totalOI,
      timestamp: new Date()
    };
  }
}

module.exports = new OptionsDataFetcher();
