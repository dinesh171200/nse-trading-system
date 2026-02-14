/**
 * PCR - Put-Call Ratio
 * Category: Options
 * Signals: Market sentiment from options data
 * Note: Requires options chain data from NSE
 */

/**
 * Calculate PCR from options data
 * @param {Object} optionsData - Options chain data
 * @returns {Object} PCR data with signal
 */
function calculatePCR(optionsData) {
  if (!optionsData || !optionsData.CE || !optionsData.PE) {
    throw new Error('Insufficient options data for PCR calculation');
  }

  const { CE, PE } = optionsData;

  // Calculate PCR based on Open Interest
  const putOI = PE.reduce((sum, opt) => sum + (opt.openInterest || 0), 0);
  const callOI = CE.reduce((sum, opt) => sum + (opt.openInterest || 0), 0);
  const pcrOI = callOI > 0 ? putOI / callOI : 0;

  // Calculate PCR based on Volume
  const putVolume = PE.reduce((sum, opt) => sum + (opt.volume || 0), 0);
  const callVolume = CE.reduce((sum, opt) => sum + (opt.volume || 0), 0);
  const pcrVolume = callVolume > 0 ? putVolume / callVolume : 0;

  // Interpret PCR
  let sentiment = 'NEUTRAL';
  if (pcrOI > 1.3) {
    sentiment = 'EXTREMELY_BULLISH'; // Too many puts = contrarian bullish
  } else if (pcrOI > 1.0) {
    sentiment = 'BULLISH';
  } else if (pcrOI < 0.7) {
    sentiment = 'EXTREMELY_BEARISH'; // Too many calls = contrarian bearish
  } else if (pcrOI < 0.9) {
    sentiment = 'BEARISH';
  }

  // Calculate signal score
  const signalScore = calculateSignalScore(pcrOI, pcrVolume, sentiment);

  return {
    name: 'PCR',
    category: 'options',
    pcrOI,
    pcrVolume,
    sentiment,
    interpretation: getInterpretation(pcrOI),
    putData: {
      totalOI: putOI,
      totalVolume: putVolume
    },
    callData: {
      totalOI: callOI,
      totalVolume: callVolume
    },
    signal: {
      score: signalScore,
      action: getAction(signalScore),
      strength: getStrength(Math.abs(signalScore)),
      confidence: getConfidence(pcrOI)
    }
  };
}

function calculateSignalScore(pcrOI, pcrVolume, sentiment) {
  let score = 0;

  // PCR interpretation (contrarian indicator)
  if (sentiment === 'EXTREMELY_BULLISH') {
    score += 50; // High PCR = bullish
  } else if (sentiment === 'BULLISH') {
    score += 25;
  } else if (sentiment === 'EXTREMELY_BEARISH') {
    score -= 50; // Low PCR = bearish
  } else if (sentiment === 'BEARISH') {
    score -= 25;
  }

  // Volume confirmation
  const volumePCRDiff = Math.abs(pcrOI - pcrVolume);
  if (volumePCRDiff < 0.2) {
    // OI and Volume PCR agree
    score *= 1.2;
  }

  // Optimal PCR range (1.0-1.2 is balanced bullish)
  if (pcrOI >= 1.0 && pcrOI <= 1.2) {
    score += 15; // Healthy bullish sentiment
  }

  return Math.max(-100, Math.min(100, score));
}

function getInterpretation(pcr) {
  if (pcr > 1.5) return 'Excessive put buying - Strong contrarian bullish signal';
  if (pcr > 1.3) return 'High put/call ratio - Bullish sentiment';
  if (pcr > 1.0) return 'Moderate bullish - More puts than calls';
  if (pcr > 0.9) return 'Neutral to slightly bullish';
  if (pcr > 0.7) return 'Bearish - More calls than puts';
  return 'Excessive call buying - Strong contrarian bearish signal';
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

function getConfidence(pcr) {
  if (pcr > 1.5 || pcr < 0.6) return 85; // Extreme values
  if (pcr > 1.3 || pcr < 0.7) return 75; // Strong signals
  return 60;
}

module.exports = {
  calculatePCR
};
