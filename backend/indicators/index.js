/**
 * Main indicator exports
 * All technical indicators organized by category
 * Updated with 22 new/enhanced indicators
 */

// Momentum indicators - EXISTING
const rsi = require('./momentum/rsi');
const stochastic = require('./momentum/stochastic');
const cci = require('./momentum/cci');
const williamsR = require('./momentum/williams-r');
const roc = require('./momentum/roc');
const ultimateOscillator = require('./momentum/ultimate-oscillator');

// Momentum indicators - NEW & FIXED
const ppo = require('./momentum/ppo');
const elderRay = require('./momentum/elder-ray');
const kst = require('./momentum/kst');
const rvi = require('./momentum/rvi');
const coppockCurve = require('./momentum/coppock-curve');
const schaffTrend = require('./momentum/schaff-trend');
const wavetrend = require('./momentum/wavetrend');
const trix = require('./momentum/trix');  // FIXED
const tsi = require('./momentum/tsi');    // FIXED

// Trend indicators - EXISTING
const ema = require('./trend/ema');
const sma = require('./trend/sma');
const macd = require('./trend/macd');
const adx = require('./trend/adx');
const supertrend = require('./trend/supertrend');
const parabolicSAR = require('./trend/parabolic-sar');
const aroon = require('./trend/aroon');

// Trend indicators - NEW & FIXED
const dema = require('./trend/dema');
const tema = require('./trend/tema');
const hma = require('./trend/hma');
const massIndex = require('./trend/mass-index');  // FIXED

// Volatility indicators - EXISTING
const bollingerBands = require('./volatility/bollinger-bands');
const atr = require('./volatility/atr');
const keltnerChannel = require('./volatility/keltner-channel');
const donchianChannel = require('./volatility/donchian-channel');

// Volatility indicators - NEW
const ulcerIndex = require('./volatility/ulcer-index');
const natr = require('./volatility/natr');
const bollingerBandwidth = require('./volatility/bollinger-bandwidth');
const bollingerPercentB = require('./volatility/bollinger-percent-b');

// Volume indicators - EXISTING
const obv = require('./volume/obv');
const mfi = require('./volume/mfi');
const vwap = require('./volume/vwap');
const accumulationDistribution = require('./volume/accumulation-distribution');
const chaikinMoneyFlow = require('./volume/chaikin-money-flow');

// Volume indicators - NEW
const klingerOscillator = require('./volume/klinger-oscillator');
const pvt = require('./volume/pvt');
const nvi = require('./volume/nvi');
const pvi = require('./volume/pvi');

// Support/Resistance indicators - EXISTING
const pivotPoints = require('./support-resistance/pivot-points');
const enhancedSRZones = require('./support-resistance/enhanced-sr-zones');
const demandSupplyZones = require('./support-resistance/demand-supply-zones');
const fairValueGap = require('./support-resistance/fair-value-gap');
const changeOfCharacter = require('./support-resistance/change-of-character');
const breakOfStructure = require('./support-resistance/break-of-structure');

// Options indicators - EXISTING
const pcr = require('./options/pcr');
const oiAnalysis = require('./options/oi-analysis');

// Composite indicators - NEW
const qstick = require('./composite/qstick');

module.exports = {
  momentum: {
    // Existing
    rsi,
    stochastic,
    cci,
    williamsR,
    roc,
    ultimateOscillator,
    // New & Fixed
    ppo,
    elderRay,
    kst,
    rvi,
    coppockCurve,
    schaffTrend,
    wavetrend,
    trix,   // FIXED
    tsi     // FIXED
  },
  trend: {
    // Existing
    ema,
    sma,
    macd,
    adx,
    supertrend,
    parabolicSAR,
    aroon,
    // New & Fixed
    dema,
    tema,
    hma,
    massIndex  // FIXED
  },
  volatility: {
    // Existing
    bollingerBands,
    atr,
    keltnerChannel,
    donchianChannel,
    // New
    ulcerIndex,
    natr,
    bollingerBandwidth,
    bollingerPercentB
  },
  volume: {
    // Existing
    obv,
    mfi,
    vwap,
    accumulationDistribution,
    chaikinMoneyFlow,
    // New
    klingerOscillator,
    pvt,
    nvi,
    pvi
  },
  supportResistance: {
    pivotPoints,
    enhancedSRZones,
    demandSupplyZones,
    fairValueGap,
    changeOfCharacter,
    breakOfStructure
  },
  options: {
    pcr,
    oiAnalysis
  },
  composite: {
    qstick
  }
};
