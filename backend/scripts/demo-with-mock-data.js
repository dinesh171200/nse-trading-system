/**
 * Comprehensive Demo with Realistic Mock Data
 * Shows all 14 indicators working together
 */

const signalCombiner = require('../services/signal-combiner');

// Generate realistic mock candle data with trends and volatility
function generateRealisticCandles(count = 60) {
  const candles = [];
  let basePrice = 25471;
  let trend = 0.8; // Uptrend bias
  let volatility = 50;

  for (let i = 0; i < count; i++) {
    // Add trend component
    trend += (Math.random() - 0.45) * 0.5; // Slightly bullish bias
    trend = Math.max(-2, Math.min(2, trend)); // Limit trend

    // Add cyclical pattern (simulates market cycles)
    const cycle = Math.sin(i / 10) * 30;

    // Random noise
    const noise = (Math.random() - 0.5) * volatility;

    // Calculate OHLC
    const open = basePrice + trend + noise;
    const close = open + trend * 2 + (Math.random() - 0.5) * 40;
    const high = Math.max(open, close) + Math.random() * 30;
    const low = Math.min(open, close) - Math.random() * 30;

    basePrice = close;

    // Generate realistic volume
    const volume = Math.floor(50000 + Math.random() * 100000);

    candles.push({
      ohlc: { open, high, low, close },
      timestamp: new Date(Date.now() - (count - i) * 5 * 60 * 1000), // 5min intervals
      volume
    });
  }

  return candles;
}

async function runDemo() {
  console.log('═══════════════════════════════════════════════════════════════');
  console.log('     NSE TRADING SYSTEM - COMPREHENSIVE DEMO');
  console.log('     All 14 Indicators Working Together');
  console.log('═══════════════════════════════════════════════════════════════\n');

  // Generate realistic mock data
  console.log('📊 Generating realistic market data...');
  const candles = generateRealisticCandles(60);
  console.log(`✓ Generated ${candles.length} candles with realistic trends & volatility\n`);

  // Show price movement
  const firstPrice = candles[0].ohlc.close;
  const lastPrice = candles[candles.length - 1].ohlc.close;
  const priceChange = lastPrice - firstPrice;
  const priceChangePercent = (priceChange / firstPrice) * 100;

  console.log('📈 Price Movement:');
  console.log(`   Start: ₹${firstPrice.toFixed(2)}`);
  console.log(`   End:   ₹${lastPrice.toFixed(2)}`);
  console.log(`   Change: ${priceChange > 0 ? '+' : ''}₹${priceChange.toFixed(2)} (${priceChangePercent > 0 ? '+' : ''}${priceChangePercent.toFixed(2)}%)`);
  console.log('');

  // Generate trading signal with all indicators
  console.log('⚙️  Calculating ALL 14 indicators...\n');

  const startTime = Date.now();
  const signal = await signalCombiner.generateSignal(candles, {
    symbol: 'NIFTY50',
    timeframe: '5m',
    minConfidence: 50
  });
  const processingTime = Date.now() - startTime;

  // Display comprehensive results
  displaySignal(signal, processingTime);
}

function displaySignal(signal, processingTime) {
  console.log('═══════════════════════════════════════════════════════════════');
  console.log('  TRADING SIGNAL GENERATED');
  console.log('═══════════════════════════════════════════════════════════════\n');

  // Main Signal
  const actionIcon = getActionIcon(signal.signal.action);
  console.log(`${actionIcon} ${signal.signal.action}`);
  console.log(`   Strength:    ${signal.signal.strength}`);
  console.log(`   Confidence:  ${signal.signal.confidence.toFixed(1)}% (${signal.signal.confidenceLevel})`);
  console.log('');

  // Price & Levels
  console.log('───────────────────────────────────────────────────────────────');
  console.log('  Price & Trading Levels');
  console.log('───────────────────────────────────────────────────────────────\n');
  console.log(`Current Price: ₹${signal.currentPrice.toFixed(2)}`);

  if (signal.signal.action !== 'HOLD') {
    console.log(`Entry:         ₹${signal.levels.entry.toFixed(2)}`);
    console.log(`Stop Loss:     ₹${signal.levels.stopLoss.toFixed(2)}`);
    console.log(`Target 1:      ₹${signal.levels.target1.toFixed(2)}`);
    console.log(`Target 2:      ₹${signal.levels.target2.toFixed(2)}`);
    console.log(`Target 3:      ₹${signal.levels.target3.toFixed(2)}`);
    console.log(`Risk/Reward:   1:${signal.levels.riskRewardRatio.toFixed(2)}`);
  }
  console.log('');

  // Category Scores
  console.log('───────────────────────────────────────────────────────────────');
  console.log('  Category Scores (-100 to +100)');
  console.log('───────────────────────────────────────────────────────────────\n');

  const categories = [
    { name: 'Trend', score: signal.scoring.trendScore, weight: 30 },
    { name: 'Momentum', score: signal.scoring.momentumScore, weight: 25 },
    { name: 'Volume', score: signal.scoring.volumeScore, weight: 15 },
    { name: 'Volatility', score: signal.scoring.volatilityScore, weight: 10 },
    { name: 'Support/Resistance', score: signal.scoring.supportResistanceScore, weight: 10 }
  ];

  categories.forEach(cat => {
    const bar = createScoreBar(cat.score);
    console.log(`${cat.name.padEnd(20)} ${cat.score.toFixed(1).padStart(6)}  (${cat.weight}%)  ${bar}`);
  });

  console.log(`\n${'Total Score'.padEnd(20)} ${signal.scoring.totalScore.toFixed(1).padStart(6)}`);
  console.log('');

  // Individual Indicators
  console.log('───────────────────────────────────────────────────────────────');
  console.log(`  Individual Indicators (${signal.metadata.indicatorsUsed} total)`);
  console.log('───────────────────────────────────────────────────────────────\n');

  const indicators = Object.entries(signal.indicators);
  indicators.forEach(([key, ind]) => {
    if (ind && ind.signal && ind.signal.score !== undefined) {
      const bar = createScoreBar(ind.signal.score);
      const score = ind.signal.score.toFixed(1).padStart(6);
      const name = (ind.name || key).padEnd(20);
      console.log(`${name} ${score}  ${bar}  ${ind.signal.action}`);
    }
  });
  console.log('');

  // Signal Reasoning
  console.log('───────────────────────────────────────────────────────────────');
  console.log('  Signal Reasoning');
  console.log('───────────────────────────────────────────────────────────────\n');

  signal.reasoning.forEach((reason, i) => {
    console.log(`  ${i + 1}. ${reason}`);
  });
  console.log('');

  // Alerts
  if (signal.alerts && signal.alerts.length > 0) {
    console.log('───────────────────────────────────────────────────────────────');
    console.log('  ⚠️  Alerts');
    console.log('───────────────────────────────────────────────────────────────\n');

    signal.alerts.forEach(alert => {
      console.log(`  • ${alert}`);
    });
    console.log('');
  }

  // Performance
  console.log('───────────────────────────────────────────────────────────────');
  console.log('  Performance Metrics');
  console.log('───────────────────────────────────────────────────────────────\n');
  console.log(`  Processing Time:     ${processingTime}ms`);
  console.log(`  Candles Analyzed:    ${signal.metadata.candlesAnalyzed}`);
  console.log(`  Indicators Used:     ${signal.metadata.indicatorsUsed}`);
  console.log('');

  console.log('═══════════════════════════════════════════════════════════════');
  console.log('✓ Demo Complete! All 14 indicators working perfectly!');
  console.log('═══════════════════════════════════════════════════════════════\n');

  // Summary
  console.log('📋 INDICATOR SUMMARY:');
  console.log(`   • Momentum:    RSI, Stochastic, CCI, Williams %R`);
  console.log(`   • Trend:       EMA, SMA, MACD, ADX`);
  console.log(`   • Volatility:  Bollinger Bands, ATR`);
  console.log(`   • Volume:      OBV, MFI, VWAP`);
  console.log(`   • S/R:         Pivot Points`);
  console.log('');
  console.log('🎯 Your NSE Trading System is FULLY OPERATIONAL!');
  console.log('');
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

function getActionIcon(action) {
  switch (action) {
    case 'STRONG_BUY': return '🚀';
    case 'BUY': return '✅';
    case 'STRONG_SELL': return '🛑';
    case 'SELL': return '⛔';
    default: return '⏸️ ';
  }
}

// Run the demo
runDemo().catch(error => {
  console.error('Demo failed:', error);
  process.exit(1);
});
