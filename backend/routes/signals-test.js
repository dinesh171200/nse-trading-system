const express = require('express');
const router = express.Router();
const TradingSignal = require('../models/TradingSignal');

/**
 * GET /api/signals-test/all
 * Get all signals from database (for testing)
 */
router.get('/all', async (req, res) => {
  try {
    const { limit = 10 } = req.query;

    const signals = await TradingSignal.find()
      .sort({ timestamp: -1 })
      .limit(parseInt(limit));

    res.json({
      success: true,
      signals,
      count: signals.length,
      total: await TradingSignal.countDocuments()
    });

  } catch (error) {
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

/**
 * GET /api/signals-test/recent
 * Get signals from last 30 minutes
 */
router.get('/recent', async (req, res) => {
  try {
    const { minConfidence = 50 } = req.query;

    const thirtyMinutesAgo = new Date(Date.now() - 30 * 60 * 1000);

    const signals = await TradingSignal.find({
      'signal.confidence': { $gte: parseFloat(minConfidence) },
      timestamp: { $gte: thirtyMinutesAgo }
    })
    .sort({ timestamp: -1 })
    .limit(10);

    res.json({
      success: true,
      signals,
      count: signals.length,
      query: {
        minConfidence: parseFloat(minConfidence),
        since: thirtyMinutesAgo
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
