/**
 * Replay API Routes
 * Controls the live replay of Feb 13, 2024 data
 */

const express = require('express');
const router = express.Router();
const replayManager = require('../services/replay-manager');

/**
 * GET /api/replay/status
 * Get current replay status
 */
router.get('/status', (req, res) => {
  try {
    const status = replayManager.getStatus();
    res.json({
      success: true,
      data: status
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Failed to get status',
      error: error.message
    });
  }
});

/**
 * POST /api/replay/start
 * Start the replay
 */
router.post('/start', async (req, res) => {
  try {
    const { speed = 1, startFrom = 0 } = req.body;

    const result = await replayManager.start({ speed, startFrom });

    res.json({
      success: result.success,
      message: result.message,
      data: result
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Failed to start replay',
      error: error.message
    });
  }
});

/**
 * POST /api/replay/pause
 * Pause the replay
 */
router.post('/pause', (req, res) => {
  try {
    const result = replayManager.pause();
    res.json({
      success: result.success,
      message: result.message,
      data: result
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Failed to pause replay',
      error: error.message
    });
  }
});

/**
 * POST /api/replay/resume
 * Resume the replay
 */
router.post('/resume', async (req, res) => {
  try {
    const result = await replayManager.resume();
    res.json({
      success: result.success,
      message: result.message,
      data: result
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Failed to resume replay',
      error: error.message
    });
  }
});

/**
 * POST /api/replay/stop
 * Stop the replay
 */
router.post('/stop', (req, res) => {
  try {
    const result = replayManager.stop();
    res.json({
      success: result.success,
      message: result.message
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Failed to stop replay',
      error: error.message
    });
  }
});

/**
 * POST /api/replay/seek
 * Seek to specific index
 */
router.post('/seek', (req, res) => {
  try {
    const { index } = req.body;

    if (typeof index !== 'number') {
      return res.status(400).json({
        success: false,
        message: 'Index must be a number'
      });
    }

    const result = replayManager.seek(index);
    res.json({
      success: result.success,
      message: result.message,
      data: result
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Failed to seek',
      error: error.message
    });
  }
});

/**
 * POST /api/replay/load
 * Load replay data for a symbol
 */
router.post('/load', async (req, res) => {
  try {
    const { symbol = 'NIFTY50' } = req.body;

    const result = await replayManager.loadReplayData(symbol);

    res.json({
      success: result.success,
      data: result
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Failed to load replay data',
      error: error.message
    });
  }
});

/**
 * POST /api/replay/change-symbol
 * Change the replay symbol
 */
router.post('/change-symbol', async (req, res) => {
  try {
    const { symbol } = req.body;

    if (!symbol) {
      return res.status(400).json({
        success: false,
        message: 'Symbol is required'
      });
    }

    const result = await replayManager.changeSymbol(symbol);

    res.json({
      success: result.success,
      data: result
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Failed to change symbol',
      error: error.message
    });
  }
});

/**
 * GET /api/replay/history
 * Get signal history for current session
 */
router.get('/history', async (req, res) => {
  try {
    const limit = parseInt(req.query.limit) || 50;
    const history = await replayManager.getSignalHistory(limit);

    res.json({
      success: true,
      count: history.length,
      data: history
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Failed to get signal history',
      error: error.message
    });
  }
});

/**
 * DELETE /api/replay/history
 * Clear signal history for current session
 */
router.delete('/history', async (req, res) => {
  try {
    await replayManager.clearSignalHistory();

    res.json({
      success: true,
      message: 'Signal history cleared'
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Failed to clear signal history',
      error: error.message
    });
  }
});

module.exports = router;
