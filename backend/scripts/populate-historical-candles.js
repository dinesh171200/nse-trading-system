/**
 * Populate database with historical candles from MoneyControl API
 * This allows SMC indicators to work immediately
 */

const mongoose = require('mongoose');
const axios = require('axios');
require('dotenv').config();

const MONGODB_URI = process.env.MONGODB_URI || 'mongodb://localhost:27017/nse_trading';

// Use the same schema as ChartData model
const ChartDataSchema = new mongoose.Schema({
  symbol: {
    type: String,
    required: true,
    enum: ['NIFTY50', 'BANKNIFTY']
  },
  timeframe: {
    type: String,
    required: true,
    enum: ['1m', '5m', '15m', '30m', '1h', '1d']
  },
  timestamp: {
    type: Date,
    required: true
  },
  ohlc: {
    open: { type: Number, required: true },
    high: { type: Number, required: true },
    low: { type: Number, required: true },
    close: { type: Number, required: true }
  },
  volume: {
    type: Number,
    default: 0
  }
});

const ChartData = mongoose.model('ChartData', ChartDataSchema);

async function fetchMoneyControlData(symbol, mcSymbol) {
  try {
    const now = Math.floor(Date.now() / 1000);
    const fiveDaysAgo = now - (5 * 24 * 60 * 60);
    const resolution = 5; // 5-minute candles
    const countback = 1440;

    const url = `https://priceapi.moneycontrol.com/techCharts/indianMarket/index/history?symbol=${encodeURIComponent(mcSymbol)}&resolution=${resolution}&from=${fiveDaysAgo}&to=${now}&countback=${countback}&currencyCode=INR`;

    console.log(`\nFetching data for ${symbol} from MoneyControl...`);
    const response = await axios.get(url, { timeout: 15000 });

    if (response.data.s !== 'ok') {
      throw new Error('No data available');
    }

    const data = response.data;
    const candles = [];

    for (let i = 0; i < data.t.length; i++) {
      candles.push({
        symbol,
        timeframe: '5m',
        timestamp: new Date(data.t[i] * 1000),
        ohlc: {
          open: data.o[i],
          high: data.h[i],
          low: data.l[i],
          close: data.c[i]
        },
        volume: data.v ? data.v[i] : 0
      });
    }

    console.log(`✓ Fetched ${candles.length} candles for ${symbol}`);
    return candles;
  } catch (error) {
    console.error(`✗ Failed to fetch ${symbol}:`, error.message);
    return [];
  }
}

async function populateCandles() {
  try {
    console.log('Connecting to MongoDB...');
    await mongoose.connect(MONGODB_URI);
    console.log('✓ Connected to MongoDB\n');

    // Fetch and store candles for each symbol
    const symbols = [
      { name: 'NIFTY50', mcSymbol: 'in;NSX' },
      { name: 'BANKNIFTY', mcSymbol: 'in;nbx' }
    ];

    for (const { name, mcSymbol } of symbols) {
      const candles = await fetchMoneyControlData(name, mcSymbol);

      if (candles.length > 0) {
        console.log(`Saving ${candles.length} candles for ${name}...`);

        // Delete old candles
        await ChartData.deleteMany({ symbol: name, timeframe: '5m' });

        // Insert new candles
        await ChartData.insertMany(candles);

        console.log(`✓ Saved ${candles.length} candles for ${name}\n`);
      }
    }

    console.log('═══════════════════════════════════');
    console.log('✅ Historical data populated!');
    console.log('═══════════════════════════════════');
    console.log('\nSMC indicators will now appear in signals.');
    console.log('Refresh your browser to see the overlays.\n');

    process.exit(0);
  } catch (error) {
    console.error('Error:', error);
    process.exit(1);
  }
}

populateCandles();
