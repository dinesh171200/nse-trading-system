require('dotenv').config();
const connectDB = require('../config/database');
const chartGenerator = require('../services/chart-generator');
const { calculateRSI, calculateMultiPeriodRSI } = require('../indicators/momentum/rsi');
const { calculateEMA, calculateMultipleEMAs, detectEMACrossover, calculateEMARibbon } = require('../indicators/trend/ema');

// Parse command line arguments
const args = process.argv.slice(2);
const indicator = args.find(arg => arg.startsWith('--indicator='))?.split('=')[1] || 'rsi';
const symbol = args.find(arg => arg.startsWith('--symbol='))?.split('=')[1] || 'NIFTY50';
const timeframe = args.find(arg => arg.startsWith('--timeframe='))?.split('=')[1] || '5m';
const period = parseInt(args.find(arg => arg.startsWith('--period='))?.split('=')[1]) || 14;

async function testIndicator() {
  try {
    // Connect to database
    await connectDB();

    console.log('═══════════════════════════════════════════════════════════');
    console.log(`  ${indicator.toUpperCase()} Indicator Test`);
    console.log('═══════════════════════════════════════════════════════════');
    console.log('');
    console.log(`Symbol:     ${symbol}`);
    console.log(`Timeframe:  ${timeframe}`);
    console.log(`Period:     ${period}`);
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

    if (indicator === 'rsi') {
      await testRSI(candles, period);
    } else if (indicator === 'ema') {
      await testEMA(candles, period);
    } else {
      console.log(`❌ Unknown indicator: ${indicator}`);
      console.log('Available indicators: rsi, ema');
    }

    console.log('');
    console.log('═══════════════════════════════════════════════════════════');
    console.log('✓ Test completed');
    console.log('═══════════════════════════════════════════════════════════');

    process.exit(0);

  } catch (error) {
    console.error('✗ Test failed:', error.message);
    console.error(error.stack);
    process.exit(1);
  }
}

async function testRSI(candles, period) {
  console.log('📈 Calculating RSI...');
  console.log('');

  try {
    // Calculate RSI
    const rsiResult = calculateRSI(candles, period);

    // Display results
    console.log('─────────────────────────────────────────');
    console.log('  RSI Results');
    console.log('─────────────────────────────────────────');
    console.log('');

    console.log(`RSI Value:        ${rsiResult.value.toFixed(2)}`);
    console.log(`Previous Value:   ${rsiResult.previousValue.toFixed(2)}`);
    console.log(`Change:           ${(rsiResult.value - rsiResult.previousValue).toFixed(2)}`);
    console.log(`Trend:            ${rsiResult.trend}`);
    console.log('');

    console.log(`Interpretation:   ${rsiResult.interpretation}`);
    console.log(`Signal Action:    ${rsiResult.signal.action}`);
    console.log(`Signal Score:     ${rsiResult.signal.score.toFixed(2)} (-100 to +100)`);
    console.log(`Signal Strength:  ${rsiResult.signal.strength}`);
    console.log(`Confidence:       ${rsiResult.signal.confidence}%`);
    console.log('');

    // Display levels
    console.log('Levels:');
    console.log(`  Overbought (70):  ${rsiResult.value >= 70 ? '✓ YES' : '  No'}`);
    console.log(`  Neutral (50):     ${rsiResult.value >= 40 && rsiResult.value <= 60 ? '✓ YES' : '  No'}`);
    console.log(`  Oversold (30):    ${rsiResult.value <= 30 ? '✓ YES' : '  No'}`);
    console.log('');

    // Display divergence
    if (rsiResult.divergence.detected) {
      console.log(`Divergence:       ✓ ${rsiResult.divergence.type} (${rsiResult.divergence.strength})`);
    } else {
      console.log(`Divergence:       None detected`);
    }
    console.log('');

    // Visual representation
    console.log('Visual Scale:');
    const scale = createRSIScale(rsiResult.value);
    console.log(scale);
    console.log('');

    // Trading recommendation
    console.log('─────────────────────────────────────────');
    console.log('  Trading Recommendation');
    console.log('─────────────────────────────────────────');
    console.log('');

    const recommendation = getRecommendation(rsiResult);
    console.log(recommendation);
    console.log('');

    // Test multi-period RSI
    console.log('─────────────────────────────────────────');
    console.log('  Multi-Period RSI');
    console.log('─────────────────────────────────────────');
    console.log('');

    const multiPeriod = calculateMultiPeriodRSI(candles);
    for (const [key, value] of Object.entries(multiPeriod)) {
      if (value.error) {
        console.log(`${key}: Error - ${value.error}`);
      } else {
        console.log(`${key}: ${value.value.toFixed(2)} (${value.interpretation})`);
      }
    }

  } catch (error) {
    console.error('✗ RSI calculation failed:', error.message);
  }
}

function createRSIScale(rsi) {
  const width = 50;
  const position = Math.round((rsi / 100) * width);

  let scale = '0 ';
  scale += '─'.repeat(15) + '30';
  scale += '─'.repeat(10) + '50';
  scale += '─'.repeat(10) + '70';
  scale += '─'.repeat(14) + ' 100\n';
  scale += '  ';
  scale += ' '.repeat(position) + '↑\n';
  scale += '  ';
  scale += ' '.repeat(position) + rsi.toFixed(1);

  return scale;
}

function getRecommendation(rsiResult) {
  const { value, signal, trend, divergence } = rsiResult;
  let recommendation = '';

  if (signal.action === 'STRONG_BUY' || signal.action === 'BUY') {
    recommendation += '✅ BUY SIGNAL\n';
    recommendation += `   Reason: RSI is ${value < 30 ? 'oversold' : 'below neutral'} at ${value.toFixed(2)}\n`;
    if (trend === 'RISING') {
      recommendation += '   + Trend is rising (bullish confirmation)\n';
    }
    if (divergence.detected && divergence.type === 'BULLISH') {
      recommendation += '   + Bullish divergence detected (strong confirmation)\n';
    }
    recommendation += `   Confidence: ${signal.confidence}%`;
  } else if (signal.action === 'STRONG_SELL' || signal.action === 'SELL') {
    recommendation += '🛑 SELL SIGNAL\n';
    recommendation += `   Reason: RSI is ${value > 70 ? 'overbought' : 'above neutral'} at ${value.toFixed(2)}\n`;
    if (trend === 'FALLING') {
      recommendation += '   + Trend is falling (bearish confirmation)\n';
    }
    if (divergence.detected && divergence.type === 'BEARISH') {
      recommendation += '   + Bearish divergence detected (strong confirmation)\n';
    }
    recommendation += `   Confidence: ${signal.confidence}%`;
  } else if (signal.action === 'WEAK_BUY') {
    recommendation += '⚠️  WEAK BUY SIGNAL\n';
    recommendation += `   RSI at ${value.toFixed(2)} (approaching oversold)\n`;
    recommendation += '   Consider waiting for stronger confirmation';
  } else if (signal.action === 'WEAK_SELL') {
    recommendation += '⚠️  WEAK SELL SIGNAL\n';
    recommendation += `   RSI at ${value.toFixed(2)} (approaching overbought)\n`;
    recommendation += '   Consider waiting for stronger confirmation';
  } else {
    recommendation += '⏸️  HOLD / NEUTRAL\n';
    recommendation += `   RSI at ${value.toFixed(2)} (neutral zone)\n`;
    recommendation += '   No clear signal - wait for better setup';
  }

  return recommendation;
}

// Run the test
testIndicator();

async function testEMA(candles, period) {
  console.log('📈 Calculating EMA...');
  console.log('');

  try {
    // Calculate EMA
    const emaResult = calculateEMA(candles, period);

    // Display results
    console.log('─────────────────────────────────────────');
    console.log('  EMA Results');
    console.log('─────────────────────────────────────────');
    console.log('');

    console.log(`EMA Value:        ₹${emaResult.value.toFixed(2)}`);
    console.log(`Previous Value:   ₹${emaResult.previousValue.toFixed(2)}`);
    console.log(`Current Price:    ₹${emaResult.currentPrice.toFixed(2)}`);
    console.log(`Change:           ${(emaResult.value - emaResult.previousValue).toFixed(2)}`);
    console.log('');

    console.log(`Position:         ${emaResult.position} EMA`);
    console.log(`Distance:         ${emaResult.distancePercent.toFixed(2)}%`);
    console.log(`Trend:            ${emaResult.slope.trend} (${emaResult.slope.percent.toFixed(3)}%)`);
    console.log('');

    console.log(`Signal Action:    ${emaResult.signal.action}`);
    console.log(`Signal Score:     ${emaResult.signal.score.toFixed(2)} (-100 to +100)`);
    console.log(`Signal Strength:  ${emaResult.signal.strength}`);
    console.log(`Confidence:       ${emaResult.signal.confidence}%`);
    console.log('');

    // Trading recommendation
    console.log('─────────────────────────────────────────');
    console.log('  Trading Recommendation');
    console.log('─────────────────────────────────────────');
    console.log('');

    const recommendation = getEMARecommendation(emaResult);
    console.log(recommendation);
    console.log('');

    // Test multiple EMAs
    console.log('─────────────────────────────────────────');
    console.log('  Multiple EMAs');
    console.log('─────────────────────────────────────────');
    console.log('');

    const multiEMAs = calculateMultipleEMAs(candles, [9, 12, 20, 26, 50]);
    for (const [key, value] of Object.entries(multiEMAs)) {
      if (value.error) {
        console.log(`${key}: ${value.error}`);
      } else {
        const priceVsEMA = value.currentPrice > value.value ? '↑ ABOVE' : '↓ BELOW';
        console.log(`${key}: ₹${value.value.toFixed(2)} (${priceVsEMA}, ${value.distancePercent.toFixed(2)}%)`);
      }
    }
    console.log('');

    // Test EMA crossover
    if (candles.length >= 26) {
      console.log('─────────────────────────────────────────');
      console.log('  EMA Crossover (12/26)');
      console.log('─────────────────────────────────────────');
      console.log('');

      const crossover = detectEMACrossover(candles, 12, 26);
      console.log(`Fast EMA (12):    ₹${crossover.fastEMA.toFixed(2)}`);
      console.log(`Slow EMA (26):    ₹${crossover.slowEMA.toFixed(2)}`);
      console.log(`Separation:       ${crossover.separationPercent.toFixed(2)}%`);
      console.log(`Trend:            ${crossover.trend}`);

      if (crossover.crossover) {
        console.log(`Crossover:        ✓ ${crossover.crossover} (${crossover.signal})`);
      } else {
        console.log(`Crossover:        None detected`);
      }
      console.log('');

      // EMA Ribbon
      console.log('─────────────────────────────────────────');
      console.log('  EMA Ribbon Analysis');
      console.log('─────────────────────────────────────────');
      console.log('');

      const ribbon = calculateEMARibbon(candles, [9, 12, 20, 26, 50]);
      console.log(`Alignment:        ${ribbon.alignment}`);
      console.log(`Trend:            ${ribbon.trend}`);
      console.log(`EMAs Count:       ${ribbon.count}`);
    }

  } catch (error) {
    console.error('✗ EMA calculation failed:', error.message);
  }
}

function getEMARecommendation(emaResult) {
  const { position, signal, slope, distancePercent } = emaResult;
  let recommendation = '';

  if (signal.action === 'STRONG_BUY') {
    recommendation += '✅ STRONG BUY SIGNAL\n';
    recommendation += `   Price: ₹${emaResult.currentPrice.toFixed(2)}\n`;
    recommendation += `   EMA: ₹${emaResult.value.toFixed(2)}\n`;
    recommendation += `   Price is ${distancePercent.toFixed(2)}% above EMA\n`;
    recommendation += `   EMA is ${slope.trend.toLowerCase()}\n`;
    recommendation += `   Confidence: ${signal.confidence}%`;
  } else if (signal.action === 'BUY') {
    recommendation += '✅ BUY SIGNAL\n';
    recommendation += `   Price just crossed above EMA\n`;
    recommendation += `   Current: ₹${emaResult.currentPrice.toFixed(2)}\n`;
    recommendation += `   EMA: ₹${emaResult.value.toFixed(2)}\n`;
    recommendation += `   Confidence: ${signal.confidence}%`;
  } else if (signal.action === 'STRONG_SELL') {
    recommendation += '🛑 STRONG SELL SIGNAL\n';
    recommendation += `   Price: ₹${emaResult.currentPrice.toFixed(2)}\n`;
    recommendation += `   EMA: ₹${emaResult.value.toFixed(2)}\n`;
    recommendation += `   Price is ${Math.abs(distancePercent).toFixed(2)}% below EMA\n`;
    recommendation += `   EMA is ${slope.trend.toLowerCase()}\n`;
    recommendation += `   Confidence: ${signal.confidence}%`;
  } else if (signal.action === 'SELL') {
    recommendation += '🛑 SELL SIGNAL\n';
    recommendation += `   Price just crossed below EMA\n`;
    recommendation += `   Current: ₹${emaResult.currentPrice.toFixed(2)}\n`;
    recommendation += `   EMA: ₹${emaResult.value.toFixed(2)}\n`;
    recommendation += `   Confidence: ${signal.confidence}%`;
  } else if (signal.action === 'WEAK_BUY') {
    recommendation += '⚠️  WEAK BUY SIGNAL\n';
    recommendation += `   Price above EMA, uptrend forming\n`;
    recommendation += `   Consider waiting for stronger confirmation`;
  } else if (signal.action === 'WEAK_SELL') {
    recommendation += '⚠️  WEAK SELL SIGNAL\n';
    recommendation += `   Price below EMA, downtrend forming\n`;
    recommendation += `   Consider waiting for stronger confirmation`;
  } else {
    recommendation += '⏸️  HOLD / NEUTRAL\n';
    recommendation += `   Price near EMA (${position})\n`;
    recommendation += `   Distance: ${distancePercent.toFixed(2)}%\n`;
    recommendation += '   Wait for clearer trend';
  }

  return recommendation;
}
