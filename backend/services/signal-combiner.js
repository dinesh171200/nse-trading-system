/**
 * Signal Combiner Service (Enhanced with Dynamic Weighting)
 *
 * Combines signals from 70+ technical indicators to generate
 * a comprehensive trading signal with confidence level.
 *
 * NEW FEATURES:
 * - Market regime detection (STRONG_TRENDING, WEAK_TRENDING, RANGING)
 * - Dynamic indicator weighting based on market conditions
 * - Power-based scoring (high-confidence indicators weighted more)
 * - Enhanced confidence calculation with regime alignment
 * - 22 new/enhanced technical indicators
 *
 * Baseline Weighting System:
 * - Trend: 28%
 * - Momentum: 25%
 * - Volume: 15%
 * - Volatility: 10%
 * - Support/Resistance: 15%
 * - Patterns: 7%
 */

const indicators = require('../indicators');
const { INDICATOR_WEIGHTS, INDICATOR_IMPORTANCE } = require('../config/constants');
const levelCalculator = require('./level-calculator');
const marketRegimeDetector = require('./market-regime-detector');

class SignalCombiner {
  constructor() {
    this.baselineWeights = INDICATOR_WEIGHTS;
    this.indicatorImportance = INDICATOR_IMPORTANCE;
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

      // ENHANCED: Detect market regime for dynamic weighting
      const marketRegime = marketRegimeDetector.detectMarketRegime(candles);

      // Use dynamic weights if regime detected, otherwise use baseline
      const effectiveWeights = marketRegime.regime !== 'UNKNOWN'
        ? marketRegime.weightAdjustments
        : this.baselineWeights;

      // Calculate all indicators (now includes 22 new indicators)
      const indicatorResults = await this.calculateAllIndicators(candles);

      // ENHANCED: Calculate category scores with power-based weighting
      const categoryScores = this.calculateCategoryScores(indicatorResults, marketRegime);

      // ENHANCED: Calculate weighted total score with dynamic weights
      const totalScore = this.calculateTotalScore(categoryScores, effectiveWeights);

      // ENHANCED: Normalize to confidence with regime bonuses
      const confidence = this.normalizeToConfidence(
        totalScore,
        categoryScores,
        marketRegime,
        indicatorResults
      );

      // Calculate bullish and bearish percentages from total score
      // totalScore ranges from -100 (fully bearish) to +100 (fully bullish)
      const bullishPercentage = ((totalScore + 100) / 200) * 100; // 0-100%
      const bearishPercentage = 100 - bullishPercentage; // 0-100%
      const percentageDifference = Math.abs(bullishPercentage - bearishPercentage);

      // Determine signal action (now stricter - requires clear dominance)
      const action = this.determineAction(totalScore, confidence, percentageDifference);

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
        levels,
        marketRegime
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
          confidenceLevel: this.getConfidenceLevel(confidence),
          bullishPercentage: Math.round(bullishPercentage),
          bearishPercentage: Math.round(bearishPercentage),
          percentageDifference: Math.round(percentageDifference)
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

        // NEW: Market regime information
        marketRegime: {
          regime: marketRegime.regime,
          volatility: marketRegime.volatility,
          confidence: marketRegime.confidence,
          interpretation: marketRegime.details?.interpretation
        },

        // NEW: Dynamic weights used
        dynamicWeights: effectiveWeights,

        reasoning,
        alerts,

        metadata: {
          timeframe,
          indicatorsUsed: Object.keys(indicatorResults).length,
          candlesAnalyzed: candles.length,
          processingTime: 0, // Will be set externally
          enhancedScoring: true
        }
      };

      return signal;

    } catch (error) {
      throw new Error(`Signal generation failed: ${error.message}`);
    }
  }

  /**
   * Calculate all available indicators (ENHANCED with 22 new indicators)
   */
  async calculateAllIndicators(candles) {
    const results = {};

    // ============================================================
    // MOMENTUM INDICATORS (Existing + 9 New)
    // ============================================================

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

    try {
      if (candles.length >= 13) {
        results.roc_12 = indicators.momentum.roc.calculateROC(candles, 12);
      }
    } catch (error) {
      console.log('ROC calculation skipped:', error.message);
    }

    try {
      if (candles.length >= 29) {
        results.ultimate_oscillator = indicators.momentum.ultimateOscillator.calculateUltimateOscillator(candles, 7, 14, 28);
      }
    } catch (error) {
      console.log('Ultimate Oscillator calculation skipped:', error.message);
    }

    // NEW MOMENTUM INDICATORS
    try {
      if (candles.length >= 26) {
        results.ppo = indicators.momentum.ppo.calculatePPO(candles, 12, 26, 9);
      }
    } catch (error) {
      console.log('PPO calculation skipped:', error.message);
    }

    try {
      if (candles.length >= 20) {
        results.elder_ray = indicators.momentum.elderRay.calculateElderRay(candles, 13);
      }
    } catch (error) {
      console.log('Elder Ray calculation skipped:', error.message);
    }

    try {
      if (candles.length >= 70) {
        results.kst = indicators.momentum.kst.calculateKST(candles);
      }
    } catch (error) {
      console.log('KST calculation skipped:', error.message);
    }

    try {
      if (candles.length >= 13) {
        results.rvi = indicators.momentum.rvi.calculateRVI(candles, 10);
      }
    } catch (error) {
      console.log('RVI calculation skipped:', error.message);
    }

    try {
      if (candles.length >= 36) {
        results.coppock_curve = indicators.momentum.coppockCurve.calculateCoppockCurve(candles);
      }
    } catch (error) {
      console.log('Coppock Curve calculation skipped:', error.message);
    }

    try {
      if (candles.length >= 88) {
        results.schaff_trend = indicators.momentum.schaffTrend.calculateSchaffTrend(candles);
      }
    } catch (error) {
      console.log('Schaff Trend calculation skipped:', error.message);
    }

    try {
      if (candles.length >= 45) {
        results.wavetrend = indicators.momentum.wavetrend.calculateWaveTrend(candles);
      }
    } catch (error) {
      console.log('WaveTrend calculation skipped:', error.message);
    }

    try {
      if (candles.length >= 45) {
        results.trix = indicators.momentum.trix.calculateTRIX(candles, 15);
      }
    } catch (error) {
      console.log('TRIX calculation skipped:', error.message);
    }

    try {
      if (candles.length >= 45) {
        results.tsi = indicators.momentum.tsi.calculateTSI(candles, 25, 13, 7);
      }
    } catch (error) {
      console.log('TSI calculation skipped:', error.message);
    }

    // ============================================================
    // TREND INDICATORS (Existing + 4 New)
    // ============================================================

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

    try {
      if (candles.length >= 26) {
        results.ema_crossover = indicators.trend.ema.detectEMACrossover(candles, 12, 26);
      }
    } catch (error) {
      console.log('EMA crossover skipped:', error.message);
    }

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
      if (candles.length >= 35) {
        results.macd = indicators.trend.macd.calculateMACD(candles, 12, 26, 9);
      }
    } catch (error) {
      console.log('MACD calculation skipped:', error.message);
    }

    try {
      if (candles.length >= 28) {
        results.adx = indicators.trend.adx.calculateADX(candles, 14);
      }
    } catch (error) {
      console.log('ADX calculation skipped:', error.message);
    }

    try {
      if (candles.length >= 12) {
        results.supertrend = indicators.trend.supertrend.calculateSupertrend(candles, 10, 3);
      }
    } catch (error) {
      console.log('Supertrend calculation skipped:', error.message);
    }

    try {
      if (candles.length >= 5) {
        results.parabolic_sar = indicators.trend.parabolicSAR.calculateParabolicSAR(candles, 0.02, 0.2);
      }
    } catch (error) {
      console.log('Parabolic SAR calculation skipped:', error.message);
    }

    try {
      if (candles.length >= 26) {
        results.aroon = indicators.trend.aroon.calculateAroon(candles, 25);
      }
    } catch (error) {
      console.log('Aroon calculation skipped:', error.message);
    }

    // NEW TREND INDICATORS
    try {
      if (candles.length >= 50) {
        results.dema = indicators.trend.dema.calculateDEMA(candles, [9, 20, 50]);
      }
    } catch (error) {
      console.log('DEMA calculation skipped:', error.message);
    }

    try {
      if (candles.length >= 20) {
        results.tema = indicators.trend.tema.calculateTEMA(candles, [9, 20]);
      }
    } catch (error) {
      console.log('TEMA calculation skipped:', error.message);
    }

    try {
      if (candles.length >= 50) {
        results.hma = indicators.trend.hma.calculateHMA(candles, [9, 20, 50]);
      }
    } catch (error) {
      console.log('HMA calculation skipped:', error.message);
    }

    try {
      if (candles.length >= 43) {
        results.mass_index = indicators.trend.massIndex.calculateMassIndex(candles, 9, 25);
      }
    } catch (error) {
      console.log('Mass Index calculation skipped:', error.message);
    }

    // ============================================================
    // VOLATILITY INDICATORS (Existing + 4 New)
    // ============================================================

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

    try {
      if (candles.length >= 20) {
        results.keltner_channel = indicators.volatility.keltnerChannel.calculateKeltnerChannel(candles, 20, 2);
      }
    } catch (error) {
      console.log('Keltner Channel calculation skipped:', error.message);
    }

    try {
      if (candles.length >= 20) {
        results.donchian_channel = indicators.volatility.donchianChannel.calculateDonchianChannel(candles, 20);
      }
    } catch (error) {
      console.log('Donchian Channel calculation skipped:', error.message);
    }

    // NEW VOLATILITY INDICATORS
    try {
      if (candles.length >= 14) {
        results.ulcer_index = indicators.volatility.ulcerIndex.calculateUlcerIndex(candles, 14);
      }
    } catch (error) {
      console.log('Ulcer Index calculation skipped:', error.message);
    }

    try {
      if (candles.length >= 14) {
        results.natr = indicators.volatility.natr.calculateNATR(candles, 14);
      }
    } catch (error) {
      console.log('NATR calculation skipped:', error.message);
    }

    try {
      if (candles.length >= 20) {
        results.bollinger_bandwidth = indicators.volatility.bollingerBandwidth.calculateBollingerBandwidth(candles, 20, 2);
      }
    } catch (error) {
      console.log('Bollinger Bandwidth calculation skipped:', error.message);
    }

    try {
      if (candles.length >= 20) {
        results.bollinger_percent_b = indicators.volatility.bollingerPercentB.calculateBollingerPercentB(candles, 20, 2);
      }
    } catch (error) {
      console.log('Bollinger %B calculation skipped:', error.message);
    }

    // ============================================================
    // VOLUME INDICATORS (Existing + 4 New)
    // ============================================================

    try {
      if (candles.length >= 10) {
        results.obv = indicators.volume.obv.calculateOBV(candles);
      }
    } catch (error) {
      console.log('OBV calculation skipped:', error.message);
    }

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

    try {
      if (candles.length >= 2) {
        results.accumulation_distribution = indicators.volume.accumulationDistribution.calculateAccumulationDistribution(candles);
      }
    } catch (error) {
      console.log('Accumulation/Distribution calculation skipped:', error.message);
    }

    try {
      if (candles.length >= 20) {
        results.chaikin_money_flow = indicators.volume.chaikinMoneyFlow.calculateChaikinMoneyFlow(candles, 20);
      }
    } catch (error) {
      console.log('Chaikin Money Flow calculation skipped:', error.message);
    }

    // NEW VOLUME INDICATORS
    try {
      if (candles.length >= 68) {
        results.klinger = indicators.volume.klingerOscillator.calculateKlingerOscillator(candles);
      }
    } catch (error) {
      console.log('Klinger Oscillator calculation skipped:', error.message);
    }

    try {
      if (candles.length >= 2) {
        results.pvt = indicators.volume.pvt.calculatePVT(candles);
      }
    } catch (error) {
      console.log('PVT calculation skipped:', error.message);
    }

    try {
      if (candles.length >= 2) {
        results.nvi = indicators.volume.nvi.calculateNVI(candles);
      }
    } catch (error) {
      console.log('NVI calculation skipped:', error.message);
    }

    try {
      if (candles.length >= 2) {
        results.pvi = indicators.volume.pvi.calculatePVI(candles);
      }
    } catch (error) {
      console.log('PVI calculation skipped:', error.message);
    }

    // ============================================================
    // SUPPORT/RESISTANCE INDICATORS (SMC)
    // ============================================================

    try {
      if (candles.length >= 2) {
        results.pivots = indicators.supportResistance.pivotPoints.calculatePivotPoints(candles);
      }
    } catch (error) {
      console.log('Pivot Points calculation skipped:', error.message);
    }

    try {
      if (candles.length >= 50) {
        results.enhanced_sr = indicators.supportResistance.enhancedSRZones.calculateEnhancedSR(candles, 50);
      }
    } catch (error) {
      console.log('Enhanced S/R Zones calculation skipped:', error.message);
    }

    try {
      if (candles.length >= 20) {
        results.demand_supply = indicators.supportResistance.demandSupplyZones.calculateDemandSupply(candles);
      }
    } catch (error) {
      console.log('Demand/Supply Zones calculation skipped:', error.message);
    }

    try {
      if (candles.length >= 5) {
        results.fair_value_gap = indicators.supportResistance.fairValueGap.calculateFVG(candles);
      }
    } catch (error) {
      console.log('Fair Value Gap calculation skipped:', error.message);
    }

    try {
      if (candles.length >= 30) {
        results.change_of_character = indicators.supportResistance.changeOfCharacter.calculateChOC(candles);
      }
    } catch (error) {
      console.log('Change of Character calculation skipped:', error.message);
    }

    try {
      if (candles.length >= 30) {
        results.break_of_structure = indicators.supportResistance.breakOfStructure.calculateBOS(candles);
      }
    } catch (error) {
      console.log('Break of Structure calculation skipped:', error.message);
    }

    // ============================================================
    // COMPOSITE INDICATORS (New)
    // ============================================================

    try {
      if (candles.length >= 14) {
        results.qstick = indicators.composite.qstick.calculateQStick(candles, 14);
      }
    } catch (error) {
      console.log('QStick calculation skipped:', error.message);
    }

    // Note: Options indicators (PCR, OI Analysis) require separate options chain data
    // They cannot be calculated from price candles alone

    return results;
  }

  /**
   * Calculate scores for each category (ENHANCED with power-based weighting)
   */
  calculateCategoryScores(indicatorResults, marketRegime) {
    const scores = {
      trend: 0,
      momentum: 0,
      volume: 0,
      volatility: 0,
      pattern: 0,
      supportResistance: 0
    };

    const weights = {
      trend: 0,
      momentum: 0,
      volume: 0,
      volatility: 0,
      pattern: 0,
      supportResistance: 0
    };

    // ENHANCED: Aggregate scores by category with power-based weighting
    for (const [key, indicator] of Object.entries(indicatorResults)) {
      if (indicator && indicator.signal && indicator.category) {
        const category = indicator.category;

        // Calculate indicator power (0.5 to 1.0)
        const power = this.calculateIndicatorPower(indicator);

        // Get indicator importance from constants
        const importance = this.indicatorImportance[indicator.name] ||
                          this.indicatorImportance.default;

        // Combined weight = power × importance
        const weight = power * importance;

        scores[category] += indicator.signal.score * weight;
        weights[category] += weight;
      }
    }

    // Calculate weighted average for each category
    for (const category in scores) {
      if (weights[category] > 0) {
        scores[category] = scores[category] / weights[category];
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
   * Calculate indicator power (ENHANCED - NEW METHOD)
   * Power determines how much weight an indicator gets (0.5 to 1.0)
   */
  calculateIndicatorPower(indicator) {
    let power = 0.5; // Base power

    // 1. Confidence boost
    if (indicator.signal.confidence >= 80) {
      power += 0.3;
    } else if (indicator.signal.confidence >= 60) {
      power += 0.2;
    } else if (indicator.signal.confidence >= 50) {
      power += 0.1;
    }

    // 2. Strength boost
    if (indicator.signal.strength === 'VERY_STRONG') {
      power += 0.2;
    } else if (indicator.signal.strength === 'STRONG') {
      power += 0.1;
    }

    // 3. Signal clarity (strong directional bias)
    if (Math.abs(indicator.signal.score) >= 60) {
      power += 0.1;
    }

    return Math.min(1.0, power); // Cap at 1.0
  }

  /**
   * Calculate weighted total score (ENHANCED with dynamic weights)
   */
  calculateTotalScore(categoryScores, effectiveWeights) {
    let totalScore = 0;

    totalScore += categoryScores.trend * effectiveWeights.TREND;
    totalScore += categoryScores.momentum * effectiveWeights.MOMENTUM;
    totalScore += categoryScores.volume * effectiveWeights.VOLUME;
    totalScore += categoryScores.volatility * effectiveWeights.VOLATILITY;
    totalScore += categoryScores.pattern * effectiveWeights.PATTERNS;
    totalScore += categoryScores.supportResistance * effectiveWeights.SUPPORT_RESISTANCE;

    return totalScore;
  }

  /**
   * Normalize total score to confidence (ENHANCED with regime bonuses)
   */
  normalizeToConfidence(totalScore, categoryScores, marketRegime, indicatorResults) {
    // Base confidence from total score (-100 to +100 → 0 to 100)
    let confidence = ((totalScore + 100) / 200) * 100;

    // ENHANCED: Adaptive agreement bonus (0-20 based on strength)
    const agreementBonus = this.calculateAdaptiveAgreementBonus(categoryScores);
    confidence += agreementBonus;

    // NEW: Market regime alignment bonus (0-10)
    if (marketRegime.regime !== 'UNKNOWN') {
      const regimeBonus = this.calculateRegimeAlignmentBonus(categoryScores, marketRegime);
      confidence += regimeBonus;
    }

    // Penalty if too few indicators
    const activeIndicators = Object.keys(indicatorResults).length;
    if (activeIndicators < 10) {
      confidence *= 0.7; // 30% penalty for insufficient indicators
    } else if (activeIndicators < 20) {
      confidence *= 0.85; // 15% penalty
    }

    // Power adjustment: Boost if high-power indicators dominate
    const avgPower = this.calculateAveragePower(indicatorResults);
    confidence *= (0.8 + avgPower * 0.4); // 0.8x to 1.2x multiplier

    return Math.max(0, Math.min(100, confidence));
  }

  /**
   * Calculate adaptive agreement bonus (ENHANCED - NEW METHOD)
   */
  calculateAdaptiveAgreementBonus(categoryScores) {
    const scores = Object.values(categoryScores).filter(s => s !== 0);

    if (scores.length < 2) return 0;

    // Calculate agreement strength using variance
    const avgScore = scores.reduce((sum, s) => sum + s, 0) / scores.length;
    const variance = scores.reduce((sum, s) => sum + Math.pow(s - avgScore, 2), 0) / scores.length;
    const stdDev = Math.sqrt(variance);

    // Low variance = high agreement
    const agreementStrength = Math.max(0, 1 - (stdDev / 100));

    // Calculate directional strength
    const bullishCount = scores.filter(s => s > 20).length;
    const bearishCount = scores.filter(s => s < -20).length;
    const directionality = Math.abs(bullishCount - bearishCount) / scores.length;

    // Combine for bonus (0-20)
    const bonus = 20 * agreementStrength * directionality;

    return Math.round(bonus);
  }

  /**
   * Calculate regime alignment bonus (NEW METHOD)
   */
  calculateRegimeAlignmentBonus(categoryScores, marketRegime) {
    let bonus = 0;

    if (marketRegime.regime === 'STRONG_TRENDING') {
      // Check if trend indicators agree strongly
      const trendStrength = categoryScores.trend;
      if (Math.abs(trendStrength) > 60) {
        bonus += 10;
      } else if (Math.abs(trendStrength) > 40) {
        bonus += 5;
      }
    } else if (marketRegime.regime === 'RANGING') {
      // Check if S/R indicators are strong
      const srStrength = categoryScores.supportResistance;
      if (Math.abs(srStrength) > 50) {
        bonus += 10;
      } else if (Math.abs(srStrength) > 30) {
        bonus += 5;
      }
    }

    return bonus;
  }

  /**
   * Calculate average power of all indicators (NEW METHOD)
   */
  calculateAveragePower(indicatorResults) {
    let totalPower = 0;
    let count = 0;

    for (const [key, indicator] of Object.entries(indicatorResults)) {
      if (indicator && indicator.signal) {
        totalPower += this.calculateIndicatorPower(indicator);
        count++;
      }
    }

    return count > 0 ? totalPower / count : 0.5;
  }

  /**
   * Calculate bonus for indicator agreement (DEPRECATED - kept for compatibility)
   */
  calculateAgreementBonus(categoryScores) {
    // This method is now replaced by calculateAdaptiveAgreementBonus
    // but kept for backward compatibility
    return this.calculateAdaptiveAgreementBonus(categoryScores);
  }

  /**
   * Determine signal action
   */
  determineAction(totalScore, confidence, percentageDifference) {
    // STRICTER CONFIRMATION LOGIC:
    // Only give BUY/SELL signals when:
    // 1. Confidence is high (>= 65%)
    // 2. There's a clear winner (difference >= 30%)
    // Otherwise, show NEUTRAL even if slightly bullish/bearish

    if (confidence < 65) {
      return 'HOLD'; // Confidence too low for any signal
    }

    if (percentageDifference < 30) {
      return 'HOLD'; // Too close to call, stay neutral
    }

    // Now check for buy/sell signals with strict thresholds
    if (totalScore >= 50) {
      return 'STRONG_BUY'; // Very bullish + high confidence + clear winner
    } else if (totalScore >= 25) {
      return 'BUY'; // Bullish + high confidence + clear winner
    } else if (totalScore <= -50) {
      return 'STRONG_SELL'; // Very bearish + high confidence + clear winner
    } else if (totalScore <= -25) {
      return 'SELL'; // Bearish + high confidence + clear winner
    } else {
      return 'HOLD'; // Score between -25 and +25 is neutral zone
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
   * Generate reasoning for the signal (ENHANCED with regime info)
   */
  generateReasoning(indicatorResults, categoryScores, action, confidence, levels, marketRegime) {
    const reasoning = [];

    // NEW: Add market regime context
    if (marketRegime && marketRegime.regime !== 'UNKNOWN') {
      reasoning.push(`📊 Market Regime: ${marketRegime.details?.interpretation || marketRegime.regime}`);
      reasoning.push('');
    }

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
    if (indicatorResults.rsi_14 && indicatorResults.rsi_14.divergence && indicatorResults.rsi_14.divergence.detected) {
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
