/**
 * Demo API Routes
 * Special routes for testing with historical data
 */

const express = require('express');
const router = express.Router();
const historicalLoader = require('../services/historical-data-loader');
const chartGenerator = require('../services/chart-generator');
const signalCombiner = require('../services/signal-combiner');
const TickData = require('../models/TickData');

/**
 * POST /api/demo/load-feb13
 * Load historical data for Feb 13, 2024
 */
router.post('/load-feb13', async (req, res) => {
  try {
    const result = await historicalLoader.loadAllData();

    // Generate charts
    await chartGenerator.generateAllTimeframes('NIFTY50', 72);
    await chartGenerator.generateAllTimeframes('BANKNIFTY', 72);

    res.json({
      success: true,
      message: 'Historical data loaded successfully',
      data: result
    });

  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Failed to load historical data',
      error: error.message
    });
  }
});

/**
 * GET /api/demo/replay/:symbol
 * Get minute-by-minute replay data
 */
router.get('/replay/:symbol', async (req, res) => {
  try {
    const { symbol } = req.params;
    const limit = parseInt(req.query.limit) || 100;

    const ticks = await TickData.find({ symbol })
      .sort({ timestamp: 1 })
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
      message: 'Failed to get replay data',
      error: error.message
    });
  }
});

/**
 * GET /api/demo/signal-at-time
 * Generate signal for a specific time point
 */
router.get('/signal-at-time', async (req, res) => {
  try {
    const { symbol = 'NIFTY50', timeframe = '5m', timestamp } = req.query;

    if (!timestamp) {
      return res.status(400).json({
        success: false,
        message: 'Timestamp is required'
      });
    }

    const targetTime = new Date(timestamp);

    // Get candles up to this time
    const candles = await chartGenerator.getLatestCandles(symbol, timeframe, 100, targetTime);

    if (candles.length === 0) {
      return res.status(404).json({
        success: false,
        message: 'No data available for this timestamp'
      });
    }

    // Generate signal
    const signal = await signalCombiner.generateSignal(candles, {
      symbol,
      timeframe,
      minConfidence: 50
    });

    res.json({
      success: true,
      data: {
        timestamp: targetTime,
        signal
      }
    });

  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Failed to generate signal',
      error: error.message
    });
  }
});

/**
 * GET /api/demo/day-summary/:symbol
 * Get full day summary with signals at key points
 */
router.get('/day-summary/:symbol', async (req, res) => {
  try {
    const { symbol } = req.params;
    const timeframe = req.query.timeframe || '5m';

    // Get all ticks for the day
    const ticks = await TickData.find({ symbol })
      .sort({ timestamp: 1 });

    if (ticks.length === 0) {
      return res.status(404).json({
        success: false,
        message: 'No data available'
      });
    }

    // Get candles
    const candles = await chartGenerator.getLatestCandles(symbol, timeframe, 1000);

    // Generate signal at different points (open, mid-day, close)
    const signals = [];

    // Opening signal (9:30 AM)
    if (candles.length > 10) {
      const openingCandles = candles.slice(0, 20);
      const openingSignal = await signalCombiner.generateSignal(openingCandles, {
        symbol,
        timeframe,
        minConfidence: 50
      });
      signals.push({
        time: 'OPENING (9:30 AM)',
        signal: openingSignal.signal,
        price: openingSignal.currentPrice
      });
    }

    // Mid-day signal (12:30 PM)
    if (candles.length > 40) {
      const midDayIndex = Math.floor(candles.length / 2);
      const midDayCandles = candles.slice(0, midDayIndex);
      const midDaySignal = await signalCombiner.generateSignal(midDayCandles, {
        symbol,
        timeframe,
        minConfidence: 50
      });
      signals.push({
        time: 'MID-DAY (12:30 PM)',
        signal: midDaySignal.signal,
        price: midDaySignal.currentPrice
      });
    }

    // Closing signal (3:30 PM)
    const closingSignal = await signalCombiner.generateSignal(candles, {
      symbol,
      timeframe,
      minConfidence: 50
    });
    signals.push({
      time: 'CLOSING (3:30 PM)',
      signal: closingSignal.signal,
      price: closingSignal.currentPrice
    });

    // Day statistics
    const prices = ticks.map(t => t.price);
    const dayStats = {
      open: ticks[0].price,
      high: Math.max(...prices),
      low: Math.min(...prices),
      close: ticks[ticks.length - 1].price,
      change: ticks[ticks.length - 1].price - ticks[0].price,
      changePercent: ((ticks[ticks.length - 1].price - ticks[0].price) / ticks[0].price) * 100,
      totalTicks: ticks.length
    };

    res.json({
      success: true,
      data: {
        symbol,
        date: 'Feb 13, 2024',
        dayStats,
        signals,
        fullSignal: closingSignal
      }
    });

  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Failed to generate day summary',
      error: error.message
    });
  }
});

module.exports = router;
