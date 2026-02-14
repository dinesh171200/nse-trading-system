const express = require('express');
const router = express.Router();
const optionsDataFetcher = require('../services/options-data-fetcher');
const { calculatePCR } = require('../indicators/options/pcr');
const { analyzeOI } = require('../indicators/options/oi-analysis');

/**
 * GET /api/options/pcr/:symbol
 * Get PCR (Put-Call Ratio) data
 */
router.get('/pcr/:symbol', async (req, res) => {
  try {
    const { symbol } = req.params;

    if (!['NIFTY', 'BANKNIFTY'].includes(symbol)) {
      return res.status(400).json({
        success: false,
        message: 'Invalid symbol. Use NIFTY or BANKNIFTY'
      });
    }

    const pcrData = await optionsDataFetcher.getPCRData(symbol);

    res.json({
      success: true,
      data: pcrData
    });

  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Failed to fetch PCR data',
      error: error.message
    });
  }
});

/**
 * GET /api/options/max-pain/:symbol
 * Get Max Pain level
 */
router.get('/max-pain/:symbol', async (req, res) => {
  try {
    const { symbol } = req.params;

    if (!['NIFTY', 'BANKNIFTY'].includes(symbol)) {
      return res.status(400).json({
        success: false,
        message: 'Invalid symbol. Use NIFTY or BANKNIFTY'
      });
    }

    const maxPainData = await optionsDataFetcher.getMaxPain(symbol);

    res.json({
      success: true,
      data: maxPainData
    });

  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Failed to fetch max pain data',
      error: error.message
    });
  }
});

/**
 * GET /api/options/chain/:symbol
 * Get full options chain
 */
router.get('/chain/:symbol', async (req, res) => {
  try {
    const { symbol } = req.params;

    if (!['NIFTY', 'BANKNIFTY'].includes(symbol)) {
      return res.status(400).json({
        success: false,
        message: 'Invalid symbol. Use NIFTY or BANKNIFTY'
      });
    }

    const optionsChain = await optionsDataFetcher.fetchOptionsChain(symbol);

    res.json({
      success: true,
      data: optionsChain
    });

  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Failed to fetch options chain',
      error: error.message
    });
  }
});

/**
 * GET /api/options/analysis/:symbol
 * Get comprehensive options analysis (PCR + OI + Max Pain)
 */
router.get('/analysis/:symbol', async (req, res) => {
  try {
    const { symbol } = req.params;

    if (!['NIFTY', 'BANKNIFTY'].includes(symbol)) {
      return res.status(400).json({
        success: false,
        message: 'Invalid symbol. Use NIFTY or BANKNIFTY'
      });
    }

    // Fetch options data
    const optionsChain = await optionsDataFetcher.fetchOptionsChain(symbol);
    const pcrData = await optionsDataFetcher.getPCRData(symbol);
    const maxPainData = await optionsDataFetcher.getMaxPain(symbol);

    // Calculate PCR signal
    const pcrSignal = calculatePCR(optionsChain);

    // Analyze OI
    const oiAnalysis = analyzeOI(optionsChain, optionsChain.spotPrice);

    res.json({
      success: true,
      data: {
        symbol,
        spotPrice: optionsChain.spotPrice,
        pcr: pcrData,
        maxPain: maxPainData,
        pcrSignal,
        oiAnalysis,
        timestamp: new Date()
      }
    });

  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Failed to perform options analysis',
      error: error.message
    });
  }
});

module.exports = router;
