const axios = require('axios');

class DowJonesFetcher {
  /**
   * Fetch Dow Jones data from Yahoo Finance
   */
  async fetch() {
    try {
      // Dow Jones Industrial Average symbol on Yahoo Finance
      const symbol = '^DJI';
      const url = `https://query1.finance.yahoo.com/v8/finance/chart/${symbol}?interval=1m&range=1d`;

      const response = await axios.get(url, {
        headers: {
          'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36'
        },
        timeout: 10000
      });

      const result = response.data.chart.result[0];
      const quote = result.indicators.quote[0];
      const meta = result.meta;

      // Get latest values
      const timestamps = result.timestamp;
      const closes = quote.close;
      const highs = quote.high;
      const lows = quote.low;
      const opens = quote.open;
      const volumes = quote.volume;

      // Find latest non-null values
      let latestIndex = closes.length - 1;
      while (latestIndex >= 0 && closes[latestIndex] === null) {
        latestIndex--;
      }

      if (latestIndex < 0) {
        throw new Error('No valid price data available');
      }

      const currentPrice = closes[latestIndex];
      const previousClose = meta.previousClose || meta.chartPreviousClose;
      const change = currentPrice - previousClose;
      const changePercent = (change / previousClose) * 100;

      // Get high/low for today
      const validHighs = highs.filter(h => h !== null);
      const validLows = lows.filter(l => l !== null);
      const high = Math.max(...validHighs);
      const low = Math.min(...validLows);

      return {
        symbol: 'DOWJONES',
        price: currentPrice,
        timestamp: new Date(timestamps[latestIndex] * 1000),
        metadata: {
          open: opens[latestIndex] || opens.find(o => o !== null),
          high,
          low,
          previousClose,
          change,
          changePercent,
          volume: volumes[latestIndex] || 0,
          source: 'yahoo_finance'
        }
      };

    } catch (error) {
      console.error('Error fetching Dow Jones from Yahoo Finance:', error.message);
      throw error;
    }
  }
}

module.exports = new DowJonesFetcher();
