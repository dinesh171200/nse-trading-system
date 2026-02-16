/**
 * Signal History Routes
 * Endpoints for viewing signal history and performance
 */

const express = require('express');
const router = express.Router();
const TradingSignal = require('../models/TradingSignal');
const signalTracker = require('../services/signal-tracker');

/**
 * GET /api/history/all
 * Get all signals with pagination
 */
router.get('/all', async (req, res) => {
  try {
    const {
      page = 1,
      limit = 20,
      symbol,
      status,
      outcome
    } = req.query;

    const query = {};

    if (symbol) query.symbol = symbol;
    if (status) query.status = status;
    if (outcome) query['performance.outcome'] = outcome;

    const total = await TradingSignal.countDocuments(query);
    const signals = await TradingSignal.find(query)
      .sort({ timestamp: -1 })
      .limit(parseInt(limit))
      .skip((parseInt(page) - 1) * parseInt(limit));

    res.json({
      success: true,
      data: {
        signals,
        pagination: {
          total,
          page: parseInt(page),
          limit: parseInt(limit),
          pages: Math.ceil(total / parseInt(limit))
        }
      }
    });

  } catch (error) {
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

/**
 * GET /api/history/completed
 * Get only completed signals (HIT_TARGET or HIT_SL)
 */
router.get('/completed', async (req, res) => {
  try {
    const { symbol, limit = 50 } = req.query;

    const query = {
      status: { $in: ['HIT_TARGET', 'HIT_SL'] }
    };

    if (symbol) query.symbol = symbol;

    const signals = await TradingSignal.find(query)
      .sort({ timestamp: -1 })
      .limit(parseInt(limit));

    // Calculate stats
    const wins = signals.filter(s => s.performance?.outcome === 'WIN');
    const losses = signals.filter(s => s.performance?.outcome === 'LOSS');

    const totalPL = signals.reduce((sum, s) => sum + (s.performance?.profitLoss || 0), 0);
    const totalPLPct = signals.reduce((sum, s) => sum + (s.performance?.profitLossPercent || 0), 0);

    res.json({
      success: true,
      data: {
        signals,
        stats: {
          total: signals.length,
          wins: wins.length,
          losses: losses.length,
          winRate: signals.length > 0 ? ((wins.length / signals.length) * 100).toFixed(1) : 0,
          totalPL: totalPL.toFixed(2),
          avgPL: signals.length > 0 ? (totalPL / signals.length).toFixed(2) : 0,
          totalPLPercent: totalPLPct.toFixed(2),
          avgPLPercent: signals.length > 0 ? (totalPLPct / signals.length).toFixed(2) : 0
        }
      }
    });

  } catch (error) {
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

/**
 * GET /api/history/performance
 * Get performance statistics
 */
router.get('/performance', async (req, res) => {
  try {
    const { symbol, days = 7 } = req.query;

    const startDate = new Date();
    startDate.setDate(startDate.getDate() - parseInt(days));

    const query = {
      timestamp: { $gte: startDate },
      status: { $in: ['HIT_TARGET', 'HIT_SL'] }
    };

    if (symbol) query.symbol = symbol;

    const signals = await TradingSignal.find(query);

    const wins = signals.filter(s => s.performance?.outcome === 'WIN');
    const losses = signals.filter(s => s.performance?.outcome === 'LOSS');

    const totalPL = signals.reduce((sum, s) => sum + (s.performance?.profitLoss || 0), 0);
    const winPL = wins.reduce((sum, s) => sum + (s.performance?.profitLoss || 0), 0);
    const lossPL = losses.reduce((sum, s) => sum + (s.performance?.profitLoss || 0), 0);

    const target1Hits = wins.filter(s => s.performance?.hitLevel === 'TARGET_1').length;
    const target2Hits = wins.filter(s => s.performance?.hitLevel === 'TARGET_2').length;
    const target3Hits = wins.filter(s => s.performance?.hitLevel === 'TARGET_3').length;

    res.json({
      success: true,
      data: {
        period: {
          days: parseInt(days),
          from: startDate,
          to: new Date()
        },
        totalSignals: signals.length,
        wins: wins.length,
        losses: losses.length,
        winRate: signals.length > 0 ? ((wins.length / signals.length) * 100).toFixed(1) + '%' : '0%',
        profitLoss: {
          total: totalPL.toFixed(2),
          average: signals.length > 0 ? (totalPL / signals.length).toFixed(2) : '0',
          wins: winPL.toFixed(2),
          losses: lossPL.toFixed(2),
          avgWin: wins.length > 0 ? (winPL / wins.length).toFixed(2) : '0',
          avgLoss: losses.length > 0 ? (lossPL / losses.length).toFixed(2) : '0'
        },
        targetHits: {
          target1: target1Hits,
          target2: target2Hits,
          target3: target3Hits
        },
        riskReward: {
          avgWin: wins.length > 0 ? (winPL / wins.length).toFixed(2) : 0,
          avgLoss: losses.length > 0 ? Math.abs(lossPL / losses.length).toFixed(2) : 0,
          ratio: (wins.length > 0 && losses.length > 0)
            ? ((winPL / wins.length) / Math.abs(lossPL / losses.length)).toFixed(2)
            : 'N/A'
        }
      }
    });

  } catch (error) {
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

/**
 * GET /api/history/:id
 * Get single signal by ID
 */
router.get('/:id', async (req, res) => {
  try {
    const signal = await TradingSignal.findById(req.params.id);

    if (!signal) {
      return res.status(404).json({
        success: false,
        message: 'Signal not found'
      });
    }

    res.json({
      success: true,
      data: signal
    });

  } catch (error) {
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

/**
 * GET /api/history/stats/summary
 * Get summary statistics
 */
router.get('/stats/summary', async (req, res) => {
  try {
    const { symbol } = req.query;
    const query = symbol ? { symbol } : {};

    const [
      total,
      active,
      hitTarget,
      hitSL,
      expired,
      niftyStats,
      bankniftyStats
    ] = await Promise.all([
      TradingSignal.countDocuments(query),
      TradingSignal.countDocuments({ ...query, status: 'ACTIVE' }),
      TradingSignal.countDocuments({ ...query, status: 'HIT_TARGET' }),
      TradingSignal.countDocuments({ ...query, status: 'HIT_SL' }),
      TradingSignal.countDocuments({ ...query, status: 'EXPIRED' }),
      signalTracker.getPerformanceStats('NIFTY50', 7),
      signalTracker.getPerformanceStats('BANKNIFTY', 7)
    ]);

    res.json({
      success: true,
      data: {
        overall: {
          total,
          active,
          hitTarget,
          hitSL,
          expired
        },
        nifty50: niftyStats,
        banknifty: bankniftyStats
      }
    });

  } catch (error) {
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

module.exports = router;
