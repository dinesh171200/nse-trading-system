/**
 * Signal Combiner Service
 *
 * Combines signals from multiple technical indicators to generate
 * a comprehensive trading signal with confidence level.
 *
 * Weighting System:
 * - Trend: 30%
 * - Momentum: 25%
 * - Volume: 15%
 * - Volatility: 10%
 * - Patterns: 10%
 * - Support/Resistance: 10%
 */

const indicators = require('../indicators');
const { INDICATOR_WEIGHTS } = require('../config/constants');
const levelCalculator = require('./level-calculator');

class SignalCombiner {
  constructor() {
    this.weights = INDICATOR_WEIGHTS;
  }

  /**
   * Generate comprehensive trading signal
   * @param {Array} candles - OHLC candles
   * @param {Object} options - Configuration options
   * @returns {Object} Combined signal with all indicator data
   */
  async generateSignal(candles, options = {}) {
    try {
      const {
        symbol = 'UNKNOWN',
        timeframe = '5m',
        minConfidence = 50
      } = options;

      if (!candles || candles.length === 0) {
        throw new Error('No candle data provided');
      }

      const currentPrice = candles[candles.length - 1].ohlc.close;

      // Calculate all indicators
      const indicatorResults = await this.calculateAllIndicators(candles);

      // Calculate category scores
      const categoryScores = this.calculateCategoryScores(indicatorResults);

      // Calculate weighted total score
      const totalScore = this.calculateTotalScore(categoryScores);

      // Normalize to confidence (0-100)
      const confidence = this.normalizeToConfidence(totalScore, categoryScores);

      // Determine signal action
      const action = this.determineAction(totalScore, confidence);

      // Determine signal strength
      const strength = this.determineStrength(confidence);

      // Calculate entry and exit levels using proper support/resistance
      const levels = await levelCalculator.calculateTradingLevels(
        candles,
        action,
        currentPrice,
        indicatorResults
      );

      // Generate reasoning with entry basis
      const reasoning = this.generateReasoning(
        indicatorResults,
        categoryScores,
        action,
        confidence,
        levels
      );

      // Generate alerts
      const alerts = this.generateAlerts(
        indicatorResults,
        categoryScores,
        confidence
      );

      // Build complete signal
      const signal = {
        symbol,
        timeframe,
        timestamp: new Date(),
        currentPrice,

        signal: {
          action,
          strength,
          confidence,
          confidenceLevel: this.getConfidenceLevel(confidence)
        },

        levels,

        indicators: indicatorResults,

        scoring: {
          trendScore: categoryScores.trend,
          momentumScore: categoryScores.momentum,
          volumeScore: categoryScores.volume || 0,
          volatilityScore: categoryScores.volatility || 0,
          patternScore: categoryScores.pattern || 0,
          supportResistanceScore: categoryScores.supportResistance || 0,
          totalScore,
          normalizedScore: confidence
        },

        reasoning,
        alerts,

        metadata: {
          timeframe,
          indicatorsUsed: Object.keys(indicatorResults).length,
          candlesAnalyzed: candles.length,
          processingTime: 0 // Will be set externally
        }
      };

      return signal;

    } catch (error) {
      throw new Error(`Signal generation failed: ${error.message}`);
    }
  }

  /**
   * Calculate all available indicators
   */
  async calculateAllIndicators(candles) {
    const results = {};

    // Momentum indicators
    try {
      if (candles.length >= 15) {
        results.rsi_14 = indicators.momentum.rsi.calculateRSI(candles, 14);
      }
      if (candles.length >= 22) {
        results.rsi_21 = indicators.momentum.rsi.calculateRSI(candles, 21);
      }
    } catch (error) {
      console.log('RSI calculation skipped:', error.message);
    }

    try {
      if (candles.length >= 17) {
        results.stochastic = indicators.momentum.stochastic.calculateStochastic(candles, 14, 3);
      }
    } catch (error) {
      console.log('Stochastic calculation skipped:', error.message);
    }

    // Trend indicators
    try {
      if (candles.length >= 9) {
        results.ema_9 = indicators.trend.ema.calculateEMA(candles, 9);
      }
      if (candles.length >= 20) {
        results.ema_20 = indicators.trend.ema.calculateEMA(candles, 20);
      }
      if (candles.length >= 50) {
        results.ema_50 = indicators.trend.ema.calculateEMA(candles, 50);
      }
    } catch (error) {
      console.log('EMA calculation skipped:', error.message);
    }

    // EMA crossover
    try {
      if (candles.length >= 26) {
        results.ema_crossover = indicators.trend.ema.detectEMACrossover(candles, 12, 26);
      }
    } catch (error) {
      console.log('EMA crossover skipped:', error.message);
    }

    // MACD
    try {
      if (candles.length >= 35) {
        results.macd = indicators.trend.macd.calculateMACD(candles, 12, 26, 9);
      }
    } catch (error) {
      console.log('MACD calculation skipped:', error.message);
    }

    // Volatility indicators
    try {
      if (candles.length >= 20) {
        results.bollinger = indicators.volatility.bollingerBands.calculateBollingerBands(candles, 20, 2);
      }
    } catch (error) {
      console.log('Bollinger Bands calculation skipped:', error.message);
    }

    try {
      if (candles.length >= 15) {
        results.atr = indicators.volatility.atr.calculateATR(candles, 14);
      }
    } catch (error) {
      console.log('ATR calculation skipped:', error.message);
    }

    // Volume indicators
    try {
      if (candles.length >= 10) {
        results.obv = indicators.volume.obv.calculateOBV(candles);
      }
    } catch (error) {
      console.log('OBV calculation skipped:', error.message);
    }

    // Support/Resistance
    try {
      if (candles.length >= 2) {
        results.pivots = indicators.supportResistance.pivotPoints.calculatePivotPoints(candles);
      }
    } catch (error) {
      console.log('Pivot Points calculation skipped:', error.message);
    }

    // Additional Momentum indicators
    try {
      if (candles.length >= 20) {
        results.cci = indicators.momentum.cci.calculateCCI(candles, 20);
      }
    } catch (error) {
      console.log('CCI calculation skipped:', error.message);
    }

    try {
      if (candles.length >= 14) {
        results.williamsR = indicators.momentum.williamsR.calculateWilliamsR(candles, 14);
      }
    } catch (error) {
      console.log('Williams %R calculation skipped:', error.message);
    }

    // Additional Trend indicators
    try {
      if (candles.length >= 20) {
        results.sma_20 = indicators.trend.sma.calculateSMA(candles, 20);
      }
      if (candles.length >= 50) {
        results.sma_50 = indicators.trend.sma.calculateSMA(candles, 50);
      }
    } catch (error) {
      console.log('SMA calculation skipped:', error.message);
    }

    try {
      if (candles.length >= 28) {
        results.adx = indicators.trend.adx.calculateADX(candles, 14);
      }
    } catch (error) {
      console.log('ADX calculation skipped:', error.message);
    }

    // Additional Volume indicators
    try {
      if (candles.length >= 15) {
        results.mfi = indicators.volume.mfi.calculateMFI(candles, 14);
      }
    } catch (error) {
      console.log('MFI calculation skipped:', error.message);
    }

    try {
      if (candles.length >= 2) {
        results.vwap = indicators.volume.vwap.calculateVWAP(candles);
      }
    } catch (error) {
      console.log('VWAP calculation skipped:', error.message);
    }

    // Note: Options indicators (PCR, OI Analysis) require separate options chain data
    // They cannot be calculated from price candles alone

    return results;
  }

  /**
   * Calculate scores for each category
   */
  calculateCategoryScores(indicatorResults) {
    const scores = {
      trend: 0,
      momentum: 0,
      volume: 0,
      volatility: 0,
      pattern: 0,
      supportResistance: 0
    };

    const counts = {
      trend: 0,
      momentum: 0,
      volume: 0,
      volatility: 0,
      pattern: 0,
      supportResistance: 0
    };

    // Aggregate scores by category
    for (const [key, indicator] of Object.entries(indicatorResults)) {
      if (indicator && indicator.signal && indicator.category) {
        const category = indicator.category;
        scores[category] += indicator.signal.score;
        counts[category]++;
      }
    }

    // Average scores for each category
    for (const category in scores) {
      if (counts[category] > 0) {
        scores[category] = scores[category] / counts[category];
      }
    }

    // Handle EMA crossover separately (bonus to trend)
    if (indicatorResults.ema_crossover) {
      const crossover = indicatorResults.ema_crossover;
      if (crossover.crossover === 'GOLDEN_CROSS') {
        scores.trend += 20; // Boost for golden cross
      } else if (crossover.crossover === 'DEATH_CROSS') {
        scores.trend -= 20; // Penalty for death cross
      }
    }

    return scores;
  }

  /**
   * Calculate weighted total score
   */
  calculateTotalScore(categoryScores) {
    let totalScore = 0;

    totalScore += categoryScores.trend * this.weights.TREND;
    totalScore += categoryScores.momentum * this.weights.MOMENTUM;
    totalScore += categoryScores.volume * this.weights.VOLUME;
    totalScore += categoryScores.volatility * this.weights.VOLATILITY;
    totalScore += categoryScores.pattern * this.weights.PATTERNS;
    totalScore += categoryScores.supportResistance * this.weights.SUPPORT_RESISTANCE;

    return totalScore;
  }

  /**
   * Normalize total score to confidence (0-100)
   */
  normalizeToConfidence(totalScore, categoryScores) {
    // Total score ranges from -100 to +100
    // Normalize to 0-100 scale

    // Base confidence from total score
    let confidence = ((totalScore + 100) / 200) * 100;

    // Boost confidence when multiple indicators agree
    const agreementBonus = this.calculateAgreementBonus(categoryScores);
    confidence += agreementBonus;

    // Penalty if too few indicators
    const indicatorCount = Object.values(categoryScores).filter(score => score !== 0).length;
    if (indicatorCount < 2) {
      confidence *= 0.7; // 30% penalty for insufficient indicators
    }

    return Math.max(0, Math.min(100, confidence));
  }

  /**
   * Calculate bonus for indicator agreement
   */
  calculateAgreementBonus(categoryScores) {
    const activeScores = Object.values(categoryScores).filter(score => score !== 0);

    if (activeScores.length < 2) return 0;

    // Check if all scores have same sign (all bullish or all bearish)
    const allBullish = activeScores.every(score => score > 0);
    const allBearish = activeScores.every(score => score < 0);

    if (allBullish || allBearish) {
      return 15; // Strong agreement bonus
    }

    // Check if majority agree
    const bullishCount = activeScores.filter(score => score > 0).length;
    const bearishCount = activeScores.filter(score => score < 0).length;

    if (bullishCount > bearishCount * 2 || bearishCount > bullishCount * 2) {
      return 10; // Moderate agreement bonus
    }

    return 0;
  }

  /**
   * Determine signal action
   */
  determineAction(totalScore, confidence) {
    if (confidence < 50) {
      return 'HOLD'; // Low confidence, no clear signal
    }

    if (totalScore >= 50) {
      return 'STRONG_BUY';
    } else if (totalScore >= 20) {
      return 'BUY';
    } else if (totalScore <= -50) {
      return 'STRONG_SELL';
    } else if (totalScore <= -20) {
      return 'SELL';
    } else {
      return 'HOLD';
    }
  }

  /**
   * Determine signal strength
   */
  determineStrength(confidence) {
    if (confidence >= 80) return 'VERY_STRONG';
    if (confidence >= 70) return 'STRONG';
    if (confidence >= 60) return 'MODERATE';
    if (confidence >= 50) return 'WEAK';
    return 'VERY_WEAK';
  }

  /**
   * Get confidence level category
   */
  getConfidenceLevel(confidence) {
    if (confidence >= 75) return 'HIGH';
    if (confidence >= 50) return 'MEDIUM';
    return 'LOW';
  }

  /**
   * Calculate entry and exit levels
   */
  async calculateLevels(candles, action, currentPrice, indicatorResults) {
    // Calculate ATR for stop loss and targets
    const atr = this.calculateATR(candles, 14);

    let levels = {
      entry: currentPrice,
      stopLoss: 0,
      target1: 0,
      target2: 0,
      target3: 0,
      riskRewardRatio: 0
    };

    if (action === 'BUY' || action === 'STRONG_BUY') {
      // Long position levels
      levels.stopLoss = currentPrice - (atr * 2);
      levels.target1 = currentPrice + (atr * 1.5);
      levels.target2 = currentPrice + (atr * 3);
      levels.target3 = currentPrice + (atr * 5);
    } else if (action === 'SELL' || action === 'STRONG_SELL') {
      // Short position levels
      levels.stopLoss = currentPrice + (atr * 2);
      levels.target1 = currentPrice - (atr * 1.5);
      levels.target2 = currentPrice - (atr * 3);
      levels.target3 = currentPrice - (atr * 5);
    }

    // Calculate risk/reward ratio
    if (action !== 'HOLD') {
      const risk = Math.abs(currentPrice - levels.stopLoss);
      const reward = Math.abs(levels.target1 - currentPrice);
      levels.riskRewardRatio = reward / risk;
    }

    return levels;
  }

  /**
   * Simple ATR calculation
   */
  calculateATR(candles, period = 14) {
    if (candles.length < period + 1) {
      // Fallback to simple range
      const lastCandle = candles[candles.length - 1];
      return lastCandle.ohlc.high - lastCandle.ohlc.low;
    }

    const trueRanges = [];
    for (let i = 1; i < candles.length; i++) {
      const high = candles[i].ohlc.high;
      const low = candles[i].ohlc.low;
      const prevClose = candles[i - 1].ohlc.close;

      const tr = Math.max(
        high - low,
        Math.abs(high - prevClose),
        Math.abs(low - prevClose)
      );
      trueRanges.push(tr);
    }

    // Simple average of last 'period' true ranges
    const recentTR = trueRanges.slice(-period);
    return recentTR.reduce((sum, tr) => sum + tr, 0) / recentTR.length;
  }

  /**
   * Generate reasoning for the signal
   */
  generateReasoning(indicatorResults, categoryScores, action, confidence, levels) {
    const reasoning = [];

    // Add level reasoning first if available
    if (levels && levels.reasoning && levels.reasoning.length > 0) {
      reasoning.push('📍 Trade Levels (Support/Resistance Based):');
      levels.reasoning.forEach(r => reasoning.push('  ' + r));
      reasoning.push('');
    }

    // Overall signal
    if (action === 'STRONG_BUY') {
      reasoning.push(`Strong buy signal detected with ${confidence.toFixed(0)}% confidence`);
    } else if (action === 'BUY') {
      reasoning.push(`Buy signal detected with ${confidence.toFixed(0)}% confidence`);
    } else if (action === 'STRONG_SELL') {
      reasoning.push(`Strong sell signal detected with ${confidence.toFixed(0)}% confidence`);
    } else if (action === 'SELL') {
      reasoning.push(`Sell signal detected with ${confidence.toFixed(0)}% confidence`);
    } else {
      reasoning.push(`No clear signal - market in neutral zone (${confidence.toFixed(0)}% confidence)`);
    }

    // Trend analysis
    if (categoryScores.trend > 30) {
      reasoning.push('Strong uptrend confirmed by trend indicators');
    } else if (categoryScores.trend > 10) {
      reasoning.push('Moderate uptrend detected');
    } else if (categoryScores.trend < -30) {
      reasoning.push('Strong downtrend confirmed by trend indicators');
    } else if (categoryScores.trend < -10) {
      reasoning.push('Moderate downtrend detected');
    }

    // Momentum analysis
    if (indicatorResults.rsi_14) {
      const rsi = indicatorResults.rsi_14;
      if (rsi.value < 30) {
        reasoning.push(`RSI at ${rsi.value.toFixed(0)} indicates oversold conditions (bullish)`);
      } else if (rsi.value > 70) {
        reasoning.push(`RSI at ${rsi.value.toFixed(0)} indicates overbought conditions (bearish)`);
      }
    }

    // EMA analysis
    if (indicatorResults.ema_20) {
      const ema = indicatorResults.ema_20;
      if (ema.position === 'ABOVE') {
        reasoning.push(`Price trading ${ema.distancePercent.toFixed(1)}% above EMA-20 (bullish)`);
      } else if (ema.position === 'BELOW') {
        reasoning.push(`Price trading ${Math.abs(ema.distancePercent).toFixed(1)}% below EMA-20 (bearish)`);
      }
    }

    // Crossover
    if (indicatorResults.ema_crossover && indicatorResults.ema_crossover.crossover) {
      const crossover = indicatorResults.ema_crossover;
      if (crossover.crossover === 'GOLDEN_CROSS') {
        reasoning.push('Golden cross detected - bullish reversal signal');
      } else if (crossover.crossover === 'DEATH_CROSS') {
        reasoning.push('Death cross detected - bearish reversal signal');
      }
    }

    return reasoning;
  }

  /**
   * Generate alerts
   */
  generateAlerts(indicatorResults, categoryScores, confidence) {
    const alerts = [];

    // High confidence alerts
    if (confidence >= 80) {
      alerts.push('High confidence signal - strong conviction');
    }

    // Extreme RSI alerts
    if (indicatorResults.rsi_14) {
      const rsi = indicatorResults.rsi_14;
      if (rsi.value < 20) {
        alerts.push('Extremely oversold conditions - potential reversal');
      } else if (rsi.value > 80) {
        alerts.push('Extremely overbought conditions - potential reversal');
      }
    }

    // Divergence alerts
    if (indicatorResults.rsi_14 && indicatorResults.rsi_14.divergence.detected) {
      const div = indicatorResults.rsi_14.divergence;
      alerts.push(`${div.type} divergence detected - potential trend reversal`);
    }

    // Conflicting signals
    const trendScore = categoryScores.trend;
    const momentumScore = categoryScores.momentum;
    if ((trendScore > 20 && momentumScore < -20) || (trendScore < -20 && momentumScore > 20)) {
      alerts.push('Conflicting signals between trend and momentum - exercise caution');
    }

    return alerts;
  }
}

module.exports = new SignalCombiner();
