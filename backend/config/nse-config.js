require('dotenv').config();

module.exports = {
  baseURL: process.env.NSE_BASE_URL || 'https://www.nseindia.com',
  timeout: parseInt(process.env.NSE_TIMEOUT) || 15000,
  retryCount: parseInt(process.env.NSE_RETRY_COUNT) || 3,

  // Headers to mimic browser request
  headers: {
    'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
    'Accept': 'application/json, text/plain, */*',
    'Accept-Language': 'en-US,en;q=0.9',
    'Accept-Encoding': 'gzip, deflate, br',
    'Referer': 'https://www.nseindia.com/',
    'Connection': 'keep-alive'
  },

  // Market hours (IST)
  marketHours: {
    openHour: parseInt(process.env.MARKET_OPEN_HOUR) || 9,
    openMinute: parseInt(process.env.MARKET_OPEN_MINUTE) || 15,
    closeHour: parseInt(process.env.MARKET_CLOSE_HOUR) || 15,
    closeMinute: parseInt(process.env.MARKET_CLOSE_MINUTE) || 30
  }
};
