const express = require('express');
const router = express.Router();
const chartGenerator = require('../services/chart-generator');
const ChartData = require('../models/ChartData');

/**
 * GET /api/charts/:symbol/:timeframe
 * Get chart data for specific symbol and timeframe
 */
router.get('/:symbol/:timeframe', async (req, res) => {
  try {
    const { symbol, timeframe } = req.params;
    const limit = parseInt(req.query.limit) || 100;
    const from = req.query.from;
    const to = req.query.to;

    // Validate symbol
    if (!['NIFTY50', 'BANKNIFTY'].includes(symbol)) {
      return res.status(400).json({
        success: false,
        message: 'Invalid symbol. Use NIFTY50 or BANKNIFTY'
      });
    }

    // Validate timeframe
    if (!['1m', '5m', '15m', '30m', '1h', '1d'].includes(timeframe)) {
      return res.status(400).json({
        success: false,
        message: 'Invalid timeframe. Use 1m, 5m, 15m, 30m, 1h, or 1d'
      });
    }

    let candles;

    if (from && to) {
      // Get candles in date range
      candles = await chartGenerator.getCandlesInRange(symbol, timeframe, from, to);
    } else {
      // Get latest candles
      candles = await chartGenerator.getLatestCandles(symbol, timeframe, limit);
    }

    res.json({
      success: true,
      data: {
        symbol,
        timeframe,
        count: candles.length,
        candles
      }
    });

  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Failed to fetch chart data',
      error: error.message
    });
  }
});

/**
 * GET /api/charts/:symbol/all-timeframes
 * Get chart data for all timeframes
 */
router.get('/:symbol/all-timeframes', async (req, res) => {
  try {
    const { symbol } = req.params;
    const limit = parseInt(req.query.limit) || 50;

    if (!['NIFTY50', 'BANKNIFTY'].includes(symbol)) {
      return res.status(400).json({
        success: false,
        message: 'Invalid symbol'
      });
    }

    const timeframes = ['1m', '5m', '15m', '30m', '1h', '1d'];
    const data = {};

    for (const timeframe of timeframes) {
      data[timeframe] = await chartGenerator.getLatestCandles(symbol, timeframe, limit);
    }

    res.json({
      success: true,
      data
    });

  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Failed to fetch chart data',
      error: error.message
    });
  }
});

/**
 * POST /api/charts/generate
 * Manually trigger chart generation
 */
router.post('/generate', async (req, res) => {
  try {
    const { symbol, timeframe, lookbackHours, forceRegenerate } = req.body;

    let results;

    if (symbol && timeframe) {
      // Generate for specific symbol and timeframe
      results = await chartGenerator.generateChart(symbol, timeframe, {
        lookbackHours: lookbackHours || 24,
        forceRegenerate: forceRegenerate || false
      });
    } else if (symbol) {
      // Generate all timeframes for symbol
      results = await chartGenerator.generateAllTimeframes(symbol, {
        lookbackHours: lookbackHours || 24,
        forceRegenerate: forceRegenerate || false
      });
    } else {
      // Generate for all symbols and timeframes
      results = await chartGenerator.generateAll({
        lookbackHours: lookbackHours || 24,
        forceRegenerate: forceRegenerate || false
      });
    }

    res.json({
      success: true,
      message: 'Chart generation completed',
      data: results
    });

  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Chart generation failed',
      error: error.message
    });
  }
});

/**
 * GET /api/charts/stats
 * Get chart statistics
 */
router.get('/stats', async (req, res) => {
  try {
    const stats = await ChartData.aggregate([
      {
        $group: {
          _id: {
            symbol: '$symbol',
            timeframe: '$timeframe'
          },
          count: { $sum: 1 },
          latestTimestamp: { $max: '$timestamp' }
        }
      },
      {
        $sort: { '_id.symbol': 1, '_id.timeframe': 1 }
      }
    ]);

    const totalCandles = await ChartData.countDocuments();

    res.json({
      success: true,
      data: {
        totalCandles,
        bySymbolAndTimeframe: stats
      }
    });

  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Failed to fetch chart stats',
      error: error.message
    });
  }
});

module.exports = router;
