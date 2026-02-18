const cron = require('node-cron');
const TickData = require('../models/TickData');
const nseFetcher = require('../services/nse-fetcher');
const dowJonesFetcher = require('../services/dow-jones-fetcher');

class DataAgent {
  constructor() {
    this.cronJob = null;
    this.isRunning = false;
    this.fetchInterval = process.env.DATA_AGENT_INTERVAL || 60000; // 1 minute
  }

  start() {
    console.log('Starting Data Agent...');

    // Run every 1 minute: '* * * * *'
    this.cronJob = cron.schedule('* * * * *', async () => {
      await this.fetchAndStore();
    });

    this.isRunning = true;
    console.log('✓ Data Agent started - fetching every 1 minute');
  }

  stop() {
    if (this.cronJob) {
      this.cronJob.stop();
      this.isRunning = false;
      console.log('✓ Data Agent stopped');
    }
  }

  async fetchAndStore() {
    try {
      // Check if market is open (optional - can fetch even when closed)
      const marketOpen = nseFetcher.isMarketOpen();
      const istTime = nseFetcher.getISTTime();

      console.log(`[${istTime.toLocaleString()}] Fetching NSE data... (Market: ${marketOpen ? 'OPEN' : 'CLOSED'})`);

      // Fetch data using smart fetch (tries NSE, falls back to Yahoo Finance)
      const allData = await nseFetcher.fetchAll();

      // Store Nifty 50 data
      const nifty50Doc = await TickData.create(allData.nifty50);
      console.log(`  ✓ Nifty 50:   ₹${allData.nifty50.price.toFixed(2)} (${allData.nifty50.metadata.changePercent >= 0 ? '+' : ''}${allData.nifty50.metadata.changePercent.toFixed(2)}%)`);

      // Store Bank Nifty data
      const bankNiftyDoc = await TickData.create(allData.bankNifty);
      console.log(`  ✓ Bank Nifty: ₹${allData.bankNifty.price.toFixed(2)} (${allData.bankNifty.metadata.changePercent >= 0 ? '+' : ''}${allData.bankNifty.metadata.changePercent.toFixed(2)}%)`);

      // Fetch and store Dow Jones data
      let dowJonesDoc = null;
      try {
        const dowJonesData = await dowJonesFetcher.fetch();
        dowJonesDoc = await TickData.create(dowJonesData);
        console.log(`  ✓ Dow Jones:  $${dowJonesData.price.toFixed(2)} (${dowJonesData.metadata.changePercent >= 0 ? '+' : ''}${dowJonesData.metadata.changePercent.toFixed(2)}%)`);
      } catch (error) {
        console.log(`  ⚠ Dow Jones:  Failed to fetch (${error.message})`);
      }

      console.log('  ✓ Data stored in database');

      // TODO: Emit event to trigger chart agent
      // eventEmitter.emit('tick-data-saved', { nifty50Doc, bankNiftyDoc, dowJonesDoc });

      return { nifty50Doc, bankNiftyDoc, dowJonesDoc };

    } catch (error) {
      console.error('  ✗ Error fetching data:', error.message);
      throw error;
    }
  }

  isMarketOpen() {
    const now = new Date();
    const hour = now.getHours();
    const minute = now.getMinutes();
    const day = now.getDay();

    // Check if weekend
    if (day === 0 || day === 6) return false;

    // Check market hours (9:15 AM to 3:30 PM IST)
    const openTime = 9 * 60 + 15; // 9:15 in minutes
    const closeTime = 15 * 60 + 30; // 15:30 in minutes
    const currentTime = hour * 60 + minute;

    return currentTime >= openTime && currentTime <= closeTime;
  }
}

module.exports = DataAgent;
