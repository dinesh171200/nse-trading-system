/**
 * Signals Routes
 * Endpoints for fetching current and historical trading signals
 */

const express = require('express');
const router = express.Router();
const SignalHistory = require('../models/SignalHistory');
const TradingSignal = require('../models/TradingSignal');
const signalCombiner = require('../services/signal-combiner');
const ChartData = require('../models/ChartData');

/**
 * GET /api/signals/live
 * Get current live trading signals (from auto-generated signals)
 */
router.get('/live', async (req, res) => {
  try {
    const { symbol, minConfidence = 50 } = req.query;

    // Build query
    const query = {
      'signal.confidence': { $gte: parseFloat(minConfidence) }
    };

    if (symbol) {
      query.symbol = symbol;
    }

    // Get latest signals (within last 30 minutes)
    const thirtyMinutesAgo = new Date(Date.now() - 30 * 60 * 1000);
    query.timestamp = { $gte: thirtyMinutesAgo };

    const signals = await TradingSignal.find(query)
      .sort({ timestamp: -1 })
      .limit(10);

    if (signals.length === 0) {
      // Fallback: Try to generate signal on-the-fly
      const fallbackSymbol = symbol || 'NIFTY50';
      const charts = await ChartData.find({
        symbol: fallbackSymbol,
        timeframe: '5m'
      })
      .sort({ timestamp: -1 })
      .limit(100);

      if (charts.length < 10) {
        return res.json({
          success: false,
          message: 'Not enough data to generate signal',
          candlesAvailable: charts.length,
          candlesNeeded: 10,
          note: 'Signal generator is warming up. Signals will appear shortly.'
        });
      }

      const chartData = charts.reverse();
      const signal = await signalCombiner.generateSignal(chartData, {
        symbol: fallbackSymbol,
        timeframe: '5m',
        minConfidence: 0
      });

      return res.json({
        success: true,
        signals: [signal],
        count: 1,
        source: 'on-demand',
        timestamp: new Date()
      });
    }

    res.json({
      success: true,
      signals,
      count: signals.length,
      source: 'auto-generated',
      timestamp: new Date()
    });

  } catch (error) {
    console.error('Error fetching live signal:', error);
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

/**
 * GET /api/signals/detail/:id
 * Get a single signal by ID
 */
router.get('/detail/:id', async (req, res) => {
  try {
    const { id } = req.params;

    const signal = await SignalHistory.findById(id);

    if (!signal) {
      return res.status(404).json({
        success: false,
        message: 'Signal not found'
      });
    }

    res.json({
      success: true,
      signal
    });

  } catch (error) {
    console.error('Error fetching signal detail:', error);
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

/**
 * GET /api/signals/history
 * Get historical signals for a symbol
 */
router.get('/history', async (req, res) => {
  try {
    const {
      symbol = 'NIFTY50',
      timeframe = '5m',
      limit = 50,
      minConfidence = 0
    } = req.query;

    // Fetch signal history
    const query = {
      symbol,
      'signal.confidence': { $gte: parseFloat(minConfidence) }
    };

    if (timeframe !== 'all') {
      query.timeframe = timeframe;
    }

    const signals = await SignalHistory.find(query)
      .sort({ marketTime: -1 })
      .limit(parseInt(limit));

    // Calculate statistics
    const stats = {
      total: signals.length,
      buy: signals.filter(s => s.signal?.action?.includes('BUY')).length,
      sell: signals.filter(s => s.signal?.action?.includes('SELL')).length,
      hold: signals.filter(s => s.signal?.action === 'HOLD').length,
      avgConfidence: signals.length > 0
        ? (signals.reduce((sum, s) => sum + (s.signal?.confidence || 0), 0) / signals.length).toFixed(1)
        : 0
    };

    res.json({
      success: true,
      signals,
      stats,
      query: { symbol, timeframe, limit }
    });

  } catch (error) {
    console.error('Error fetching signal history:', error);
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

/**
 * DELETE /api/signals/history
 * Clear signal history for a symbol
 */
router.delete('/history', async (req, res) => {
  try {
    const { symbol = 'NIFTY50', sessionId } = req.query;

    const query = { symbol };
    if (sessionId) {
      query['metadata.replaySession'] = sessionId;
    }

    const result = await SignalHistory.deleteMany(query);

    res.json({
      success: true,
      message: 'Signal history cleared',
      deletedCount: result.deletedCount
    });

  } catch (error) {
    console.error('Error clearing signal history:', error);
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

/**
 * GET /api/signals/statistics
 * Get signal performance statistics
 */
router.get('/statistics', async (req, res) => {
  try {
    const { symbol = 'NIFTY50', days = 7 } = req.query;

    const startDate = new Date();
    startDate.setDate(startDate.getDate() - parseInt(days));

    const signals = await SignalHistory.find({
      symbol,
      marketTime: { $gte: startDate },
      'signal.confidence': { $gte: 50 }
    });

    // Calculate statistics
    const stats = {
      totalSignals: signals.length,
      buySignals: signals.filter(s => s.signal?.action?.includes('BUY')).length,
      sellSignals: signals.filter(s => s.signal?.action?.includes('SELL')).length,
      avgConfidence: signals.length > 0
        ? (signals.reduce((sum, s) => sum + (s.signal?.confidence || 0), 0) / signals.length).toFixed(1)
        : 0,
      highConfidence: signals.filter(s => (s.signal?.confidence || 0) >= 70).length,
      mediumConfidence: signals.filter(s => {
        const conf = s.signal?.confidence || 0;
        return conf >= 50 && conf < 70;
      }).length,
      avgRiskReward: signals.length > 0
        ? (signals.reduce((sum, s) => sum + (s.levels?.riskRewardRatio || 0), 0) / signals.length).toFixed(2)
        : 0,
      period: {
        days: parseInt(days),
        from: startDate,
        to: new Date()
      }
    };

    res.json({
      success: true,
      stats
    });

  } catch (error) {
    console.error('Error fetching signal statistics:', error);
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

module.exports = router;
