/**
 * Open Interest Analysis
 * Category: Options
 * Signals: Support/Resistance from max OI strikes
 * Note: Requires options chain data from NSE
 */

/**
 * Analyze Open Interest from options data
 * @param {Object} optionsData - Options chain data
 * @param {Number} currentPrice - Current spot price
 * @returns {Object} OI Analysis with signal
 */
function analyzeOI(optionsData, currentPrice) {
  if (!optionsData || !optionsData.CE || !optionsData.PE) {
    throw new Error('Insufficient options data for OI analysis');
  }

  const { CE, PE } = optionsData;

  // Find max OI strikes
  const maxCallOI = CE.reduce((max, opt) =>
    (opt.openInterest || 0) > (max.openInterest || 0) ? opt : max, CE[0]);

  const maxPutOI = PE.reduce((max, opt) =>
    (opt.openInterest || 0) > (max.openInterest || 0) ? opt : max, PE[0]);

  // Calculate max pain (strike with highest total OI)
  const allStrikes = {};

  CE.forEach(opt => {
    const strike = opt.strikePrice;
    if (!allStrikes[strike]) allStrikes[strike] = { call: 0, put: 0 };
    allStrikes[strike].call = opt.openInterest || 0;
  });

  PE.forEach(opt => {
    const strike = opt.strikePrice;
    if (!allStrikes[strike]) allStrikes[strike] = { call: 0, put: 0 };
    allStrikes[strike].put = opt.openInterest || 0;
  });

  // Calculate pain for each strike
  const painPoints = Object.entries(allStrikes).map(([strike, oi]) => {
    const strikeNum = parseFloat(strike);
    let pain = 0;

    // Calculate total pain if expiry at this strike
    Object.entries(allStrikes).forEach(([s, o]) => {
      const sNum = parseFloat(s);
      if (sNum < strikeNum) {
        pain += o.put * (strikeNum - sNum); // Put pain
      } else if (sNum > strikeNum) {
        pain += o.call * (sNum - strikeNum); // Call pain
      }
    });

    return { strike: strikeNum, pain, totalOI: oi.call + oi.put };
  });

  const maxPainStrike = painPoints.reduce((min, p) => p.pain < min.pain ? p : min);

  // Resistance and Support from OI
  const resistance = maxCallOI.strikePrice;
  const support = maxPutOI.strikePrice;

  // Current position analysis
  const distanceToMaxPain = ((currentPrice - maxPainStrike.strike) / currentPrice) * 100;
  const distanceToResistance = ((resistance - currentPrice) / currentPrice) * 100;
  const distanceToSupport = ((currentPrice - support) / currentPrice) * 100;

  // Calculate signal score
  const signalScore = calculateSignalScore(
    currentPrice,
    maxPainStrike.strike,
    resistance,
    support,
    distanceToMaxPain
  );

  return {
    name: 'OI Analysis',
    category: 'options',
    currentPrice,
    maxPain: {
      strike: maxPainStrike.strike,
      distance: distanceToMaxPain,
      totalOI: maxPainStrike.totalOI
    },
    resistance: {
      strike: resistance,
      distance: distanceToResistance,
      oi: maxCallOI.openInterest
    },
    support: {
      strike: support,
      distance: distanceToSupport,
      oi: maxPutOI.openInterest
    },
    interpretation: getInterpretation(currentPrice, maxPainStrike.strike, resistance, support),
    signal: {
      score: signalScore,
      action: getAction(signalScore),
      strength: getStrength(Math.abs(signalScore)),
      confidence: getConfidence(Math.abs(distanceToMaxPain))
    }
  };
}

function calculateSignalScore(currentPrice, maxPain, resistance, support, distanceToMaxPain) {
  let score = 0;

  // Position relative to max pain
  if (currentPrice < maxPain) {
    score += 30; // Below max pain = gravitational pull up
  } else if (currentPrice > maxPain) {
    score -= 30; // Above max pain = gravitational pull down
  }

  // Distance to support/resistance
  const distToResistance = ((resistance - currentPrice) / currentPrice) * 100;
  const distToSupport = ((currentPrice - support) / currentPrice) * 100;

  // Near support = potential bounce
  if (distToSupport < 1) {
    score += 40;
  } else if (distToSupport < 2) {
    score += 20;
  }

  // Near resistance = potential rejection
  if (distToResistance < 1) {
    score -= 40;
  } else if (distToResistance < 2) {
    score -= 20;
  }

  // Max pain gravitational effect
  if (Math.abs(distanceToMaxPain) < 0.5) {
    score *= 0.5; // Weak signal at max pain (equilibrium)
  } else if (Math.abs(distanceToMaxPain) > 2) {
    score *= 1.3; // Strong pull effect when far from max pain
  }

  return Math.max(-100, Math.min(100, score));
}

function getInterpretation(currentPrice, maxPain, resistance, support) {
  if (currentPrice < support) {
    return `Price below key support ${support} - bearish breakdown`;
  } else if (currentPrice > resistance) {
    return `Price above key resistance ${resistance} - bullish breakout`;
  } else if (currentPrice < maxPain) {
    return `Price below max pain ${maxPain} - expect upward pull`;
  } else if (currentPrice > maxPain) {
    return `Price above max pain ${maxPain} - expect downward pull`;
  } else {
    return `Price near max pain ${maxPain} - sideways expected`;
  }
}

function getAction(score) {
  if (score >= 50) return 'STRONG_BUY';
  if (score >= 20) return 'BUY';
  if (score <= -50) return 'STRONG_SELL';
  if (score <= -20) return 'SELL';
  return 'HOLD';
}

function getStrength(absScore) {
  if (absScore >= 70) return 'VERY_STRONG';
  if (absScore >= 50) return 'STRONG';
  if (absScore >= 30) return 'MODERATE';
  return 'WEAK';
}

function getConfidence(absDistance) {
  if (absDistance > 3) return 85; // Far from max pain = strong signal
  if (absDistance > 1.5) return 75;
  return 60;
}

module.exports = {
  analyzeOI
};
