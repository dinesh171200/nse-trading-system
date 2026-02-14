require('dotenv').config();
const connectDB = require('../config/database');
const chartGenerator = require('../services/chart-generator');
const signalCombiner = require('../services/signal-combiner');

// Parse command line arguments
const args = process.argv.slice(2);
const symbol = args.find(arg => arg.startsWith('--symbol='))?.split('=')[1] || 'NIFTY50';
const timeframe = args.find(arg => arg.startsWith('--timeframe='))?.split('=')[1] || '5m';

async function testSignalCombiner() {
  try {
    // Connect to database
    await connectDB();

    console.log('═══════════════════════════════════════════════════════════');
    console.log('  Signal Combiner Test');
    console.log('═══════════════════════════════════════════════════════════');
    console.log('');
    console.log(`Symbol:     ${symbol}`);
    console.log(`Timeframe:  ${timeframe}`);
    console.log('');

    // Fetch chart data
    console.log('📊 Fetching chart data...');
    const candles = await chartGenerator.getLatestCandles(symbol, timeframe, 100);

    if (candles.length === 0) {
      console.log('⚠️  No chart data available.');
      console.log('');
      console.log('Please generate charts first:');
      console.log('  curl -X POST http://localhost:3001/api/charts/generate \\');
      console.log('    -H "Content-Type: application/json" \\');
      console.log('    -d \'{"lookbackHours": 72, "forceRegenerate": true}\'');
      console.log('');
      process.exit(1);
    }

    console.log(`✓ Found ${candles.length} candles`);
    console.log('');

    // Generate signal
    console.log('⚙️  Calculating indicators and generating signal...');
    console.log('');

    const startTime = Date.now();
    const signal = await signalCombiner.generateSignal(candles, {
      symbol,
      timeframe,
      minConfidence: 50
    });
    const processingTime = Date.now() - startTime;
    signal.metadata.processingTime = processingTime;

    // Display results
    displaySignal(signal);

    console.log('');
    console.log('═══════════════════════════════════════════════════════════');
    console.log('✓ Signal generation completed');
    console.log(`  Processing time: ${processingTime}ms`);
    console.log('═══════════════════════════════════════════════════════════');

    process.exit(0);

  } catch (error) {
    console.error('✗ Test failed:', error.message);
    console.error(error.stack);
    process.exit(1);
  }
}

function displaySignal(signal) {
  console.log('═══════════════════════════════════════════════════════════');
  console.log('  TRADING SIGNAL');
  console.log('═══════════════════════════════════════════════════════════');
  console.log('');

  // Signal overview
  const actionEmoji = getActionEmoji(signal.signal.action);
  console.log(`${actionEmoji} ${signal.signal.action}`);
  console.log(`   Strength:    ${signal.signal.strength}`);
  console.log(`   Confidence:  ${signal.signal.confidence.toFixed(1)}% (${signal.signal.confidenceLevel})`);
  console.log('');

  // Price and levels
  console.log('─────────────────────────────────────────');
  console.log('  Price & Levels');
  console.log('─────────────────────────────────────────');
  console.log('');
  console.log(`Current Price: ₹${signal.currentPrice.toFixed(2)}`);

  if (signal.signal.action !== 'HOLD') {
    console.log('');
    console.log(`Entry:         ₹${signal.levels.entry.toFixed(2)}`);
    console.log(`Stop Loss:     ₹${signal.levels.stopLoss.toFixed(2)}`);
    console.log(`Target 1:      ₹${signal.levels.target1.toFixed(2)}`);
    console.log(`Target 2:      ₹${signal.levels.target2.toFixed(2)}`);
    console.log(`Target 3:      ₹${signal.levels.target3.toFixed(2)}`);
    console.log(`Risk/Reward:   1:${signal.levels.riskRewardRatio.toFixed(2)}`);
  }

  console.log('');

  // Category scores
  console.log('─────────────────────────────────────────');
  console.log('  Category Scores (-100 to +100)');
  console.log('─────────────────────────────────────────');
  console.log('');
  displayScore('Trend', signal.scoring.trendScore, 30);
  displayScore('Momentum', signal.scoring.momentumScore, 25);
  displayScore('Volume', signal.scoring.volumeScore, 15);
  displayScore('Volatility', signal.scoring.volatilityScore, 10);
  displayScore('Patterns', signal.scoring.patternScore, 10);
  displayScore('S/R', signal.scoring.supportResistanceScore, 10);
  console.log('');
  console.log(`Total Score:   ${signal.scoring.totalScore.toFixed(2)}`);
  console.log('');

  // Individual indicators
  console.log('─────────────────────────────────────────');
  console.log('  Individual Indicators');
  console.log('─────────────────────────────────────────');
  console.log('');

  for (const [key, indicator] of Object.entries(signal.indicators)) {
    if (indicator.signal) {
      const name = indicator.name || key;
      const score = indicator.signal.score.toFixed(1);
      const scoreBar = createScoreBar(indicator.signal.score);
      console.log(`${name.padEnd(15)} ${scoreBar} ${score}`);
    }
  }

  console.log('');

  // Reasoning
  console.log('─────────────────────────────────────────');
  console.log('  Signal Reasoning');
  console.log('─────────────────────────────────────────');
  console.log('');

  signal.reasoning.forEach((reason, index) => {
    console.log(`  ${index + 1}. ${reason}`);
  });

  console.log('');

  // Alerts
  if (signal.alerts && signal.alerts.length > 0) {
    console.log('─────────────────────────────────────────');
    console.log('  Alerts');
    console.log('─────────────────────────────────────────');
    console.log('');

    signal.alerts.forEach(alert => {
      console.log(`  ⚠️  ${alert}`);
    });

    console.log('');
  }

  // Recommendation
  console.log('─────────────────────────────────────────');
  console.log('  Trading Recommendation');
  console.log('─────────────────────────────────────────');
  console.log('');

  const recommendation = generateRecommendation(signal);
  console.log(recommendation);
}

function displayScore(name, score, weight) {
  const scoreStr = score.toFixed(1).padStart(6);
  const weightStr = `(${weight}%)`.padStart(6);
  const bar = createScoreBar(score);
  console.log(`${name.padEnd(12)} ${scoreStr} ${weightStr}  ${bar}`);
}

function createScoreBar(score) {
  const width = 20;
  const normalized = (score + 100) / 200; // 0 to 1
  const filled = Math.round(normalized * width);

  let bar = '';
  if (score > 0) {
    bar = ' '.repeat(width / 2) + '|' + '█'.repeat(Math.min(filled - width / 2, width / 2));
  } else {
    bar = '█'.repeat(Math.max(0, filled)) + '|' + ' '.repeat(width / 2);
  }

  return bar;
}

function getActionEmoji(action) {
  switch (action) {
    case 'STRONG_BUY': return '🚀';
    case 'BUY': return '✅';
    case 'STRONG_SELL': return '🛑';
    case 'SELL': return '⛔';
    default: return '⏸️ ';
  }
}

function generateRecommendation(signal) {
  const { action, confidence } = signal.signal;
  const { currentPrice, levels } = signal;

  let rec = '';

  if (action === 'STRONG_BUY') {
    rec += '🚀 STRONG BUY RECOMMENDATION\n\n';
    rec += `   Action:      Enter LONG position\n`;
    rec += `   Entry:       ₹${levels.entry.toFixed(2)}\n`;
    rec += `   Stop Loss:   ₹${levels.stopLoss.toFixed(2)} (Risk: ${((levels.entry - levels.stopLoss) / levels.entry * 100).toFixed(2)}%)\n`;
    rec += `   Target 1:    ₹${levels.target1.toFixed(2)} (Reward: ${((levels.target1 - levels.entry) / levels.entry * 100).toFixed(2)}%)\n`;
    rec += `   Target 2:    ₹${levels.target2.toFixed(2)}\n`;
    rec += `   Target 3:    ₹${levels.target3.toFixed(2)}\n\n`;
    rec += `   Confidence:  ${confidence.toFixed(0)}%\n`;
    rec += `   Risk/Reward: 1:${levels.riskRewardRatio.toFixed(2)}`;
  } else if (action === 'BUY') {
    rec += '✅ BUY RECOMMENDATION\n\n';
    rec += `   Action:      Enter LONG position (moderate size)\n`;
    rec += `   Entry:       ₹${levels.entry.toFixed(2)}\n`;
    rec += `   Stop Loss:   ₹${levels.stopLoss.toFixed(2)}\n`;
    rec += `   Target:      ₹${levels.target1.toFixed(2)}\n`;
    rec += `   Confidence:  ${confidence.toFixed(0)}%`;
  } else if (action === 'STRONG_SELL') {
    rec += '🛑 STRONG SELL RECOMMENDATION\n\n';
    rec += `   Action:      Exit LONG / Enter SHORT\n`;
    rec += `   Entry:       ₹${levels.entry.toFixed(2)}\n`;
    rec += `   Stop Loss:   ₹${levels.stopLoss.toFixed(2)}\n`;
    rec += `   Target 1:    ₹${levels.target1.toFixed(2)}\n`;
    rec += `   Confidence:  ${confidence.toFixed(0)}%`;
  } else if (action === 'SELL') {
    rec += '⛔ SELL RECOMMENDATION\n\n';
    rec += `   Action:      Exit LONG positions\n`;
    rec += `   Current:     ₹${currentPrice.toFixed(2)}\n`;
    rec += `   Confidence:  ${confidence.toFixed(0)}%`;
  } else {
    rec += '⏸️  HOLD - NO CLEAR SIGNAL\n\n';
    rec += `   Market in neutral zone\n`;
    rec += `   Wait for clearer trend development\n`;
    rec += `   Confidence:  ${confidence.toFixed(0)}%`;
  }

  return rec;
}

// Run the test
testSignalCombiner();
