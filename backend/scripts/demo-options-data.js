/**
 * Options Data Demo
 * Demonstrates PCR and OI Analysis
 *
 * NOTE: This requires live NSE options chain data
 * May fail if NSE blocks the request
 */

const optionsDataFetcher = require('../services/options-data-fetcher');
const { calculatePCR } = require('../indicators/options/pcr');
const { analyzeOI } = require('../indicators/options/oi-analysis');

async function runOptionsDemo() {
  console.log('═══════════════════════════════════════════════════════════════');
  console.log('     NSE OPTIONS DATA DEMO');
  console.log('     PCR & OI Analysis');
  console.log('═══════════════════════════════════════════════════════════════\n');

  const symbol = 'NIFTY';

  try {
    console.log(`📊 Fetching options chain data for ${symbol}...\n`);

    // Fetch options data
    const optionsData = await optionsDataFetcher.fetchOptionsChain(symbol);

    console.log('✓ Options chain data fetched successfully\n');
    console.log(`Spot Price: ₹${optionsData.spotPrice.toFixed(2)}`);
    console.log(`Expiry: ${optionsData.expiryDate}`);
    console.log(`Call Options: ${optionsData.CE.length} strikes`);
    console.log(`Put Options: ${optionsData.PE.length} strikes\n`);

    // Calculate PCR
    console.log('───────────────────────────────────────────────────────────────');
    console.log('  PUT-CALL RATIO (PCR)');
    console.log('───────────────────────────────────────────────────────────────\n');

    const pcrSignal = calculatePCR(optionsData);
    console.log(`PCR (OI):     ${pcrSignal.pcrOI.toFixed(3)}`);
    console.log(`PCR (Volume): ${pcrSignal.pcrVolume.toFixed(3)}`);
    console.log(`Sentiment:    ${pcrSignal.sentiment}`);
    console.log(`\nInterpretation: ${pcrSignal.interpretation}`);
    console.log(`\nSignal:       ${pcrSignal.signal.action}`);
    console.log(`Score:        ${pcrSignal.signal.score.toFixed(1)}`);
    console.log(`Confidence:   ${pcrSignal.signal.confidence}%\n`);

    // Analyze OI
    console.log('───────────────────────────────────────────────────────────────');
    console.log('  OPEN INTEREST ANALYSIS');
    console.log('───────────────────────────────────────────────────────────────\n');

    const oiAnalysis = analyzeOI(optionsData, optionsData.spotPrice);
    console.log(`Max Pain:     ₹${oiAnalysis.maxPain.strike.toFixed(2)}`);
    console.log(`Distance:     ${oiAnalysis.maxPain.distance > 0 ? '+' : ''}${oiAnalysis.maxPain.distance.toFixed(2)}%`);
    console.log(`\nResistance:   ₹${oiAnalysis.resistance.strike.toFixed(2)} (${oiAnalysis.resistance.distance.toFixed(2)}% away)`);
    console.log(`Support:      ₹${oiAnalysis.support.strike.toFixed(2)} (${oiAnalysis.support.distance.toFixed(2)}% away)`);
    console.log(`\nInterpretation: ${oiAnalysis.interpretation}`);
    console.log(`\nSignal:       ${oiAnalysis.signal.action}`);
    console.log(`Score:        ${oiAnalysis.signal.score.toFixed(1)}`);
    console.log(`Confidence:   ${oiAnalysis.signal.confidence}%\n`);

    // Max Pain details
    console.log('───────────────────────────────────────────────────────────────');
    console.log('  MAX PAIN EFFECT');
    console.log('───────────────────────────────────────────────────────────────\n');

    const maxPainData = await optionsDataFetcher.getMaxPain(symbol);
    console.log(`Current Price:  ₹${maxPainData.currentPrice.toFixed(2)}`);
    console.log(`Max Pain:       ₹${maxPainData.maxPainStrike.toFixed(2)}`);
    console.log(`Distance:       ${maxPainData.distance > 0 ? '+' : ''}${maxPainData.distance.toFixed(2)}%`);

    if (maxPainData.distance > 0) {
      console.log(`\n⬇️  Price above max pain - expect downward gravitational pull`);
    } else if (maxPainData.distance < 0) {
      console.log(`\n⬆️  Price below max pain - expect upward gravitational pull`);
    } else {
      console.log(`\n↔️  Price at max pain - sideways movement expected`);
    }
    console.log('');

    console.log('═══════════════════════════════════════════════════════════════');
    console.log('✓ Options Analysis Complete!');
    console.log('═══════════════════════════════════════════════════════════════\n');

  } catch (error) {
    console.error('❌ Options demo failed:', error.message);
    console.error('');
    console.error('POSSIBLE REASONS:');
    console.error('  • NSE is blocking the request (403 Forbidden)');
    console.error('  • Market is closed (no options data available)');
    console.error('  • Network timeout');
    console.error('  • Session cookies expired');
    console.error('');
    console.error('SOLUTIONS:');
    console.error('  • Use official broker APIs (Zerodha Kite, Upstox)');
    console.error('  • Use professional data providers');
    console.error('  • Try during market hours (9:15 AM - 3:30 PM IST)');
    console.error('');
    process.exit(1);
  }
}

// Run the demo
runOptionsDemo();
