const express = require('express');
const router = express.Router();
const nseFetcher = require('../services/nse-fetcher');
const DataAgent = require('../agents/data-agent');
const TickData = require('../models/TickData');
const chartGenerator = require('../services/chart-generator');
const indicators = require('../indicators');
const signalCombiner = require('../services/signal-combiner');

/**
 * GET /api/test/fetch-nse
 * Manually trigger NSE data fetch
 */
router.get('/fetch-nse', async (req, res) => {
  try {
    const allData = await nseFetcher.fetchAll();

    res.json({
      success: true,
      data: allData,
      message: 'NSE data fetched successfully'
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Failed to fetch NSE data',
      error: error.message
    });
  }
});

/**
 * GET /api/test/data-agent
 * Test data agent (fetch and store)
 */
router.get('/data-agent', async (req, res) => {
  try {
    const dataAgent = new DataAgent();
    const result = await dataAgent.fetchAndStore();

    res.json({
      success: true,
      data: result,
      message: 'Data agent executed successfully'
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Data agent failed',
      error: error.message
    });
  }
});

/**
 * GET /api/test/market-status
 * Check if market is open
 */
router.get('/market-status', (req, res) => {
  const isOpen = nseFetcher.isMarketOpen();
  const istTime = nseFetcher.getISTTime();

  res.json({
    success: true,
    data: {
      isMarketOpen: isOpen,
      istTime: istTime.toLocaleString('en-IN', { timeZone: 'Asia/Kolkata' }),
      marketHours: '9:15 AM - 3:30 PM IST',
      status: isOpen ? 'OPEN' : 'CLOSED'
    }
  });
});

/**
 * GET /api/test/latest-data
 * Get latest tick data from database
 */
router.get('/latest-data', async (req, res) => {
  try {
    const nifty50 = await TickData.findOne({ symbol: 'NIFTY50' })
      .sort({ timestamp: -1 })
      .limit(1);

    const bankNifty = await TickData.findOne({ symbol: 'BANKNIFTY' })
      .sort({ timestamp: -1 })
      .limit(1);

    res.json({
      success: true,
      data: {
        nifty50,
        bankNifty
      }
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Failed to fetch latest data',
      error: error.message
    });
  }
});

/**
 * GET /api/test/tick-history/:symbol
 * Get tick history for a symbol
 */
router.get('/tick-history/:symbol', async (req, res) => {
  try {
    const { symbol } = req.params;
    const limit = parseInt(req.query.limit) || 100;

    if (!['NIFTY50', 'BANKNIFTY'].includes(symbol)) {
      return res.status(400).json({
        success: false,
        message: 'Invalid symbol. Use NIFTY50 or BANKNIFTY'
      });
    }

    const ticks = await TickData.find({ symbol })
      .sort({ timestamp: -1 })
      .limit(limit);

    res.json({
      success: true,
      data: {
        symbol,
        count: ticks.length,
        ticks
      }
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Failed to fetch tick history',
      error: error.message
    });
  }
});

/**
 * DELETE /api/test/clear-data
 * Clear all tick data (for testing)
 */
router.delete('/clear-data', async (req, res) => {
  try {
    const result = await TickData.deleteMany({});

    res.json({
      success: true,
      message: `Deleted ${result.deletedCount} records`,
      data: result
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Failed to clear data',
      error: error.message
    });
  }
});

/**
 * GET /api/test/signal
 * Generate combined signal from all indicators
 */
router.get('/signal', async (req, res) => {
  try {
    const symbol = req.query.symbol || 'NIFTY50';
    const timeframe = req.query.timeframe || '5m';
    const minConfidence = parseInt(req.query.minConfidence) || 50;

    // Get chart data
    const candles = await chartGenerator.getLatestCandles(symbol, timeframe, 100);

    if (candles.length === 0) {
      return res.status(404).json({
        success: false,
        message: 'No chart data available. Please generate charts first.'
      });
    }

    // Generate combined signal
    const startTime = Date.now();
    const signal = await signalCombiner.generateSignal(candles, {
      symbol,
      timeframe,
      minConfidence
    });
    signal.metadata.processingTime = Date.now() - startTime;

    res.json({
      success: true,
      data: signal
    });

  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Signal generation failed',
      error: error.message
    });
  }
});

/**
 * GET /api/test/indicator/:name
 * Test a specific indicator
 */
router.get('/indicator/:name', async (req, res) => {
  try {
    const { name } = req.params;
    const symbol = req.query.symbol || 'NIFTY50';
    const timeframe = req.query.timeframe || '5m';
    const period = parseInt(req.query.period) || 14;

    // Get chart data
    const candles = await chartGenerator.getLatestCandles(symbol, timeframe, 100);

    if (candles.length === 0) {
      return res.status(404).json({
        success: false,
        message: 'No chart data available. Please generate charts first.'
      });
    }

    let result;

    // Calculate indicator
    switch (name.toLowerCase()) {
      case 'rsi':
        result = indicators.momentum.rsi.calculateRSI(candles, period);
        break;
      case 'ema':
        result = indicators.trend.ema.calculateEMA(candles, period);
        break;
      default:
        return res.status(400).json({
          success: false,
          message: `Unknown indicator: ${name}. Available: rsi, ema`
        });
    }

    res.json({
      success: true,
      data: {
        symbol,
        timeframe,
        candlesUsed: candles.length,
        indicator: result
      }
    });

  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Indicator calculation failed',
      error: error.message
    });
  }
});

module.exports = router;
