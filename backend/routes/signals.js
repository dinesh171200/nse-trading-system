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
    const { symbol, minConfidence = 55 } = req.query;  // Lowered from 65 to 55

    // Build query
    const query = {
      'signal.confidence': { $gte: parseFloat(minConfidence) }
    };

    if (symbol) {
      query.symbol = symbol;
    }

    // Get latest signals (within last 2 minutes - signals refresh every 1 minute)
    const twoMinutesAgo = new Date(Date.now() - 2 * 60 * 1000);
    query.timestamp = { $gte: twoMinutesAgo };

    const signals = await TradingSignal.find(query)
      .sort({ timestamp: -1 })
      .limit(10);

    // Update currentPrice to latest for each signal (reduces delay)
    if (signals.length > 0) {
      const dataFetcher = require('../services/simple-data-fetcher');
      for (let i = 0; i < signals.length; i++) {
        try {
          const latestCandles = await dataFetcher.fetch(signals[i].symbol);
          if (latestCandles && latestCandles.length > 0) {
            const latestCandle = latestCandles[latestCandles.length - 1];
            if (latestCandle && latestCandle.ohlc && latestCandle.ohlc.close) {
              // Update price in the document
              signals[i].currentPrice = latestCandle.ohlc.close;

              // Ensure metadata exists and update timestamp
              if (!signals[i].metadata) {
                signals[i].metadata = {};
              }
              signals[i].metadata.priceUpdatedAt = new Date().toISOString();
              signals[i].metadata.priceSource = 'real-time-fetch';
            }
          }
        } catch (error) {
          // If price update fails, just use stored price
          console.log(`Could not update price for ${signals[i].symbol}:`, error.message);
        }
      }
    }

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
 * Get signal performance statistics (backtesting results)
 */
router.get('/statistics', async (req, res) => {
  try {
    const { symbol, days = 30 } = req.query;

    const startDate = new Date();
    startDate.setDate(startDate.getDate() - parseInt(days));

    // Build query
    const query = {
      marketTime: { $gte: startDate },
      'signal.action': { $in: ['BUY', 'STRONG_BUY', 'SELL', 'STRONG_SELL'] }
    };

    if (symbol && symbol !== 'ALL') {
      query.symbol = symbol;
    }

    const signals = await SignalHistory.find(query).sort({ marketTime: -1 });

    // Separate by outcome
    const completed = signals.filter(s => s.performance?.outcome && s.performance.outcome !== 'PENDING');
    const wins = completed.filter(s => s.performance.outcome === 'WIN');
    const losses = completed.filter(s => s.performance.outcome === 'LOSS');
    const pending = signals.filter(s => !s.performance?.outcome || s.performance.outcome === 'PENDING');

    // Calculate P/L
    const totalPL = completed.reduce((sum, s) => sum + (s.performance?.profitLoss || 0), 0);
    const totalPLPercent = completed.reduce((sum, s) => sum + (s.performance?.profitLossPercent || 0), 0);
    const avgPL = completed.length > 0 ? totalPL / completed.length : 0;
    const avgPLPercent = completed.length > 0 ? totalPLPercent / completed.length : 0;

    // Target breakdown
    const target1Hits = wins.filter(s => s.performance?.targetHit === 'TARGET1').length;
    const target2Hits = wins.filter(s => s.performance?.targetHit === 'TARGET2').length;
    const target3Hits = wins.filter(s => s.performance?.targetHit === 'TARGET3').length;

    const stats = {
      totalSignals: signals.length,
      completed: completed.length,
      pending: pending.length,
      wins: wins.length,
      losses: losses.length,
      winRate: completed.length > 0 ? ((wins.length / completed.length) * 100).toFixed(2) : 0,
      lossRate: completed.length > 0 ? ((losses.length / completed.length) * 100).toFixed(2) : 0,
      totalPL: totalPL.toFixed(2),
      totalPLPercent: totalPLPercent.toFixed(2),
      avgPL: avgPL.toFixed(2),
      avgPLPercent: avgPLPercent.toFixed(2),
      avgWin: wins.length > 0 ? (wins.reduce((sum, s) => sum + (s.performance?.profitLossPercent || 0), 0) / wins.length).toFixed(2) : 0,
      avgLoss: losses.length > 0 ? (losses.reduce((sum, s) => sum + (s.performance?.profitLossPercent || 0), 0) / losses.length).toFixed(2) : 0,
      targetBreakdown: {
        target1: target1Hits,
        target2: target2Hits,
        target3: target3Hits,
        stopLoss: losses.length
      },
      byAction: {
        buy: signals.filter(s => s.signal?.action?.includes('BUY')).length,
        sell: signals.filter(s => s.signal?.action?.includes('SELL')).length
      },
      bySymbol: symbol === 'ALL' || !symbol ? {
        NIFTY50: signals.filter(s => s.symbol === 'NIFTY50').length,
        BANKNIFTY: signals.filter(s => s.symbol === 'BANKNIFTY').length,
        DOWJONES: signals.filter(s => s.symbol === 'DOWJONES').length
      } : null,
      period: {
        days: parseInt(days),
        from: startDate,
        to: new Date()
      },
      recentSignals: signals.slice(0, 10).map(s => ({
        symbol: s.symbol,
        action: s.signal.action,
        confidence: s.signal.confidence,
        price: s.price,
        time: s.marketTime,
        outcome: s.performance?.outcome || 'PENDING',
        profitLossPercent: s.performance?.profitLossPercent?.toFixed(2) || 'N/A'
      }))
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

/**
 * DELETE /api/signals/clear-all
 * Clear all signal history from database
 */
router.delete('/clear-all', async (req, res) => {
  try {
    const { confirm } = req.query;

    if (confirm !== 'true') {
      return res.status(400).json({
        success: false,
        error: 'Confirmation required. Add ?confirm=true to delete all signals.'
      });
    }

    // Delete all signals from both collections
    const tradingSignalsResult = await TradingSignal.deleteMany({});
    const signalHistoryResult = await SignalHistory.deleteMany({});

    console.log(`🗑️  Cleared all signal history:`);
    console.log(`   - Deleted ${tradingSignalsResult.deletedCount} trading signals`);
    console.log(`   - Deleted ${signalHistoryResult.deletedCount} signal history records`);

    res.json({
      success: true,
      message: 'All signal history cleared successfully',
      deleted: {
        tradingSignals: tradingSignalsResult.deletedCount,
        signalHistory: signalHistoryResult.deletedCount,
        total: tradingSignalsResult.deletedCount + signalHistoryResult.deletedCount
      }
    });

  } catch (error) {
    console.error('Error clearing signal history:', error);
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

module.exports = router;
