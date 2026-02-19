const axios = require('axios');

/**
 * Simple data fetcher using the SAME APIs as frontend
 * No MongoDB storage, just fetch and return
 */
class SimpleDataFetcher {
  
  /**
   * Fetch Nifty 50 or Bank Nifty from MoneyControl
   */
  async fetchIndianIndex(symbol) {
    try {
      const symbolMap = {
        'NIFTY50': 'in;NSX',
        'BANKNIFTY': 'in;nbx'
      };

      const mcSymbol = symbolMap[symbol];
      if (!mcSymbol) throw new Error(`Unknown symbol: ${symbol}`);

      const now = Math.floor(Date.now() / 1000);
      const thirtyDaysAgo = now - (30 * 24 * 60 * 60);
      const resolution = 5; // 5-minute candles

      const url = `https://priceapi.moneycontrol.com/techCharts/indianMarket/index/history?symbol=${encodeURIComponent(mcSymbol)}&resolution=${resolution}&from=${thirtyDaysAgo}&to=${now}&countback=8640&currencyCode=INR`;

      const response = await axios.get(url, { timeout: 10000 });
      const data = response.data;

      if (data.s !== 'ok') throw new Error('No data available');

      // Transform to OHLC candles (match chart-generator format)
      const candles = data.t.map((timestamp, index) => ({
        symbol,
        timeframe: '5m',
        timestamp: new Date(timestamp * 1000),
        ohlc: {
          open: data.o[index],
          high: data.h[index],
          low: data.l[index],
          close: data.c[index]
        },
        volume: data.v ? data.v[index] : 0  // Volume as separate field, not inside ohlc
      }));

      console.log(`  ✓ ${symbol}: Fetched ${candles.length} candles from MoneyControl`);
      return candles;

    } catch (error) {
      console.error(`  ✗ ${symbol}: ${error.message}`);
      throw error;
    }
  }

  /**
   * Fetch Dow Jones from Yahoo Finance (same as backend proxy)
   */
  async fetchDowJones() {
    try {
      const symbol = '^DJI'; // Dow Jones Industrial Average
      const now = Math.floor(Date.now() / 1000);
      const fiveDaysAgo = now - (5 * 24 * 60 * 60);

      const url = `https://query1.finance.yahoo.com/v8/finance/chart/${symbol}`;

      const response = await axios.get(url, {
        params: {
          period1: fiveDaysAgo,
          period2: now,
          interval: '5m',
          includePrePost: true,
          events: 'div|split|earn',
          lang: 'en-US',
          region: 'US'
        },
        headers: {
          'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
          'Accept': 'application/json'
        },
        timeout: 10000
      });

      const chart = response.data?.chart?.result?.[0];

      if (!chart || !chart.timestamp || chart.timestamp.length === 0) {
        throw new Error('No data available from Yahoo Finance');
      }

      const timestamps = chart.timestamp;
      const quotes = chart.indicators?.quote?.[0];

      if (!quotes) {
        throw new Error('No quote data available');
      }

      // Transform to OHLC candles (match chart-generator format)
      const candles = timestamps.map((timestamp, index) => ({
        symbol: 'DOWJONES',
        timeframe: '5m',
        timestamp: new Date(timestamp * 1000),
        ohlc: {
          open: quotes.open[index] || 0,
          high: quotes.high[index] || 0,
          low: quotes.low[index] || 0,
          close: quotes.close[index] || 0
        },
        volume: quotes.volume[index] || 0
      }));

      console.log(`  ✓ DOWJONES: Fetched ${candles.length} candles from Yahoo Finance`);
      return candles;

    } catch (error) {
      console.error(`  ✗ DOWJONES: ${error.message}`);
      throw error;
    }
  }

  /**
   * Fetch data for any symbol
   */
  async fetch(symbol) {
    if (symbol === 'DOWJONES') {
      return this.fetchDowJones();
    } else {
      return this.fetchIndianIndex(symbol);
    }
  }
}

module.exports = new SimpleDataFetcher();
