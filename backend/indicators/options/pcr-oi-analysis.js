/**
 * PCR and OI Analysis Indicator
 * Uses Options Chain data for confirmation signals
 * - PCR (Put-Call Ratio): Bullish > 1.2, Bearish < 0.8
 * - OI Changes: Call OI up = bearish, Put OI up = bullish
 * - Max Pain: Price gravitates toward max pain level
 */

const optionsDataFetcher = require('../../services/options-data-fetcher');

/**
 * Calculate PCR and OI based signal
 */
async function calculatePCRSignal(symbol) {
  try {
    // Map symbol format
    const nseSymbol = symbol === 'NIFTY50' ? 'NIFTY' : 
                      symbol === 'BANKNIFTY' ? 'BANKNIFTY' : 'NIFTY';

    // Fetch PCR data
    const pcrData = await optionsDataFetcher.getPCRData(nseSymbol);
    
    if (!pcrData) {
      return getUnavailableSignal();
    }

    // Calculate scores
    const pcrScore = scorePCR(pcrData.pcr);
    const maxPainData = await optionsDataFetcher.getMaxPain(nseSymbol);
    const maxPainScore = maxPainData ? scoreMaxPain(pcrData.spotPrice, maxPainData.maxPainStrike) : 0;

    // Combined score (PCR 70%, Max Pain 30%)
    const totalScore = (pcrScore * 0.7) + (maxPainScore * 0.3);

    // Determine signal
    let action = 'NEUTRAL';
    let strength = 'WEAK';
    let confidence = 50;

    if (totalScore >= 50) {
      action = 'BUY';
      strength = totalScore >= 70 ? 'STRONG' : 'MODERATE';
      confidence = Math.min(90, 60 + (totalScore * 0.4));
    } else if (totalScore <= -50) {
      action = 'SELL';
      strength = totalScore <= -70 ? 'STRONG' : 'MODERATE';
      confidence = Math.min(90, 60 + (Math.abs(totalScore) * 0.4));
    }

    return {
      name: 'PCR & OI Analysis',
      category: 'options',
      value: {
        pcr: pcrData.pcr.toFixed(2),
        pcrVolume: pcrData.pcrVolume.toFixed(2),
        putOI: pcrData.putOI,
        callOI: pcrData.callOI,
        maxPain: maxPainData?.maxPainStrike || 0
      },
      signal: {
        action,
        score: Math.round(totalScore),
        strength,
        confidence: Math.round(confidence)
      },
      interpretation: generateInterpretation(pcrData, maxPainData, totalScore),
      available: true
    };
  } catch (error) {
    console.error('PCR Signal calculation error:', error.message);
    return getUnavailableSignal();
  }
}

/**
 * Score PCR (Put-Call Ratio)
 */
function scorePCR(pcr) {
  // High PCR (> 1.2) = Bullish (Put writers confident, or put buyers protecting longs)
  // Low PCR (< 0.8) = Bearish (Call writers confident, or call buyers aggressive)
  
  if (pcr > 1.5) return 80;       // Very bullish
  if (pcr > 1.3) return 65;       // Strong bullish
  if (pcr > 1.2) return 50;       // Bullish
  if (pcr > 1.1) return 25;       // Slightly bullish
  if (pcr > 0.9) return 0;        // Neutral
  if (pcr > 0.8) return -25;      // Slightly bearish
  if (pcr > 0.7) return -50;      // Bearish
  if (pcr > 0.6) return -65;      // Strong bearish
  return -80;                      // Very bearish
}

/**
 * Score Max Pain distance
 */
function scoreMaxPain(spotPrice, maxPain) {
  if (!maxPain) return 0;

  const diff = maxPain - spotPrice;
  const diffPercent = (diff / spotPrice) * 100;

  // Price tends to gravitate toward max pain
  if (diffPercent > 1.5) return 60;      // Max pain well above - strong bullish pull
  if (diffPercent > 0.8) return 40;      // Max pain above - bullish pull
  if (diffPercent > 0.3) return 20;      // Slight bullish pull
  if (diffPercent > -0.3) return 0;      // At max pain - neutral
  if (diffPercent > -0.8) return -20;    // Slight bearish pull
  if (diffPercent > -1.5) return -40;    // Max pain below - bearish pull
  return -60;                             // Max pain well below - strong bearish pull
}

/**
 * Generate interpretation text
 */
function generateInterpretation(pcrData, maxPainData, score) {
  const interpretations = [];

  // PCR interpretation
  if (pcrData.pcr > 1.2) {
    interpretations.push(`PCR ${pcrData.pcr.toFixed(2)} indicates bullish sentiment (high put writing)`);
  } else if (pcrData.pcr < 0.8) {
    interpretations.push(`PCR ${pcrData.pcr.toFixed(2)} indicates bearish sentiment (high call writing)`);
  } else {
    interpretations.push(`PCR ${pcrData.pcr.toFixed(2)} shows neutral options activity`);
  }

  // Max Pain interpretation
  if (maxPainData) {
    const diff = maxPainData.maxPainStrike - pcrData.spotPrice;
    const diffPercent = ((diff / pcrData.spotPrice) * 100).toFixed(2);
    
    if (Math.abs(diff) < pcrData.spotPrice * 0.003) {
      interpretations.push(`Price at Max Pain ${maxPainData.maxPainStrike} - consolidation expected`);
    } else if (diff > 0) {
      interpretations.push(`Max Pain ${maxPainData.maxPainStrike} (+${diffPercent}%) suggests upward pull`);
    } else {
      interpretations.push(`Max Pain ${maxPainData.maxPainStrike} (${diffPercent}%) suggests downward pull`);
    }
  }

  // Overall interpretation
  if (score >= 50) {
    interpretations.push('Options data supports bullish outlook');
  } else if (score <= -50) {
    interpretations.push('Options data supports bearish outlook');
  } else {
    interpretations.push('Options data shows mixed signals');
  }

  return interpretations.join('. ');
}

/**
 * Return unavailable signal when data can't be fetched
 */
function getUnavailableSignal() {
  return {
    name: 'PCR & OI Analysis',
    category: 'options',
    value: null,
    signal: {
      action: 'NEUTRAL',
      score: 0,
      strength: 'WEAK',
      confidence: 0
    },
    interpretation: 'Options data temporarily unavailable (NSE API)',
    available: false
  };
}

module.exports = {
  calculatePCRSignal
};
