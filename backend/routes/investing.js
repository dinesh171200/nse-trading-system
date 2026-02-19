const express = require('express');
const router = express.Router();
const axios = require('axios');

/**
 * Fetch data from MoneyControl global market API
 */
async function fetchMoneyControlGlobal(symbol, symbolName) {
  const now = Math.floor(Date.now() / 1000);
  const fiveDaysAgo = now - (5 * 24 * 60 * 60);

  const url = 'https://priceapi.moneycontrol.com/globaltechCharts/globalMarket/index/history';

  const response = await axios.get(url, {
    params: {
      symbol: symbol,
      resolution: 5,
      from: fiveDaysAgo,
      to: now,
      countback: 300,
      currencyCode: 'USD'
    },
    headers: {
      'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
      'Accept': 'application/json',
      'Referer': 'https://www.moneycontrol.com/'
    },
    timeout: 10000
  });

  if (!response.data || response.data.s !== 'ok') {
    throw new Error(`No data available from MoneyControl for ${symbolName}`);
  }

  const { t, o, h, l, c } = response.data;

  if (!t || !Array.isArray(t) || t.length === 0) {
    throw new Error(`No timestamp data available for ${symbolName}`);
  }

  // Transform to [[timestamp, open, high, low, close, volume], ...]
  const transformedData = t.map((timestamp, index) => [
    timestamp * 1000,  // Convert to milliseconds
    o[index],
    h[index],
    l[index],
    c[index],
    0  // volume not available
  ]);

  console.log(`Fetched ${transformedData.length} candles for ${symbolName} from MoneyControl`);

  return transformedData;
}

/**
 * GET /api/investing/dow-jones
 * Fetch Dow Jones data from Yahoo Finance (shows last available trading data)
 */
router.get('/dow-jones', async (req, res) => {
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

    // Transform to [[timestamp, open, high, low, close, volume], ...]
    const transformedData = timestamps.map((timestamp, index) => [
      timestamp * 1000,
      quotes.open[index] || 0,
      quotes.high[index] || 0,
      quotes.low[index] || 0,
      quotes.close[index] || 0,
      quotes.volume[index] || 0
    ]);

    console.log(`Fetched ${transformedData.length} candles for Dow Jones from Yahoo Finance`);

    res.json({
      success: true,
      data: transformedData
    });

  } catch (error) {
    console.error('Error fetching Dow Jones data:', error.message);

    res.status(500).json({
      success: false,
      message: 'Failed to fetch Dow Jones data',
      error: error.message
    });
  }
});

/**
 * GET /api/investing/gift-nifty
 * Fetch Gift Nifty data from Investing.com TradingView API via backend proxy
 */
router.get('/gift-nifty', async (req, res) => {
  try {
    const now = Math.floor(Date.now() / 1000);
    const fiveDaysAgo = now - (5 * 24 * 60 * 60);

    // Investing.com TradingView Chart API for Gift Nifty (symbol ID: 1209756)
    const url = 'https://tvc4.investing.com/fcd66246e4106044ca26192f2770c089/1771268350/56/56/23/history';

    const response = await axios.get(url, {
      params: {
        symbol: '1209756',  // Gift Nifty symbol ID on Investing.com
        resolution: '5',     // 5-minute resolution
        from: fiveDaysAgo,
        to: now
      },
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
        'Accept': 'application/json, text/plain, */*',
        'Accept-Language': 'en-US,en;q=0.9',
        'Referer': 'https://www.investing.com/',
        'Origin': 'https://www.investing.com',
        'Sec-Fetch-Dest': 'empty',
        'Sec-Fetch-Mode': 'cors',
        'Sec-Fetch-Site': 'same-site'
      },
      timeout: 10000
    });

    // TradingView API returns {s: "ok", t: [timestamps], o: [open], h: [high], l: [low], c: [close], v: [volume]}
    if (!response.data || response.data.s !== 'ok') {
      throw new Error('No data available from Investing.com for Gift Nifty');
    }

    const { t, o, h, l, c, v } = response.data;

    if (!t || !Array.isArray(t) || t.length === 0) {
      throw new Error('No timestamp data available for Gift Nifty');
    }

    // Transform to [[timestamp, open, high, low, close, volume], ...]
    const transformedData = t.map((timestamp, index) => [
      timestamp * 1000,  // Convert to milliseconds
      o[index],
      h[index],
      l[index],
      c[index],
      v ? v[index] : 0
    ]);

    console.log(`Fetched ${transformedData.length} candles for Gift Nifty from Investing.com`);

    res.json({
      success: true,
      data: transformedData
    });

  } catch (error) {
    console.error('Error fetching Gift Nifty data:', error.message);

    // Fallback to MoneyControl if Investing.com fails
    try {
      console.log('Falling back to MoneyControl for Gift Nifty...');
      const data = await fetchMoneyControlGlobal('in;gsx', 'Gift Nifty');
      res.json({
        success: true,
        data: data
      });
    } catch (fallbackError) {
      res.status(500).json({
        success: false,
        message: 'Failed to fetch Gift Nifty data from both sources',
        error: error.message
      });
    }
  }
});

module.exports = router;
