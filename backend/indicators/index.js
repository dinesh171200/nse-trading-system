/**
 * Main indicator exports
 * All technical indicators organized by category
 */

// Momentum indicators
const rsi = require('./momentum/rsi');
const stochastic = require('./momentum/stochastic');
const cci = require('./momentum/cci');
const williamsR = require('./momentum/williams-r');

// Trend indicators
const ema = require('./trend/ema');
const sma = require('./trend/sma');
const macd = require('./trend/macd');
const adx = require('./trend/adx');

// Volatility indicators
const bollingerBands = require('./volatility/bollinger-bands');
const atr = require('./volatility/atr');

// Volume indicators
const obv = require('./volume/obv');
const mfi = require('./volume/mfi');
const vwap = require('./volume/vwap');

// Support/Resistance indicators
const pivotPoints = require('./support-resistance/pivot-points');

// Options indicators
const pcr = require('./options/pcr');
const oiAnalysis = require('./options/oi-analysis');

module.exports = {
  momentum: {
    rsi,
    stochastic,
    cci,
    williamsR
  },
  trend: {
    ema,
    sma,
    macd,
    adx
  },
  volatility: {
    bollingerBands,
    atr
  },
  volume: {
    obv,
    mfi,
    vwap
  },
  supportResistance: {
    pivotPoints
  },
  options: {
    pcr,
    oiAnalysis
  }
};
