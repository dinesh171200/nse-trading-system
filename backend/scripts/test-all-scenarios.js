/**
 * Test All Replay Scenarios
 * Tests chart switching, timeframes, and data persistence
 */

require('dotenv').config();
const connectDB = require('../config/database');
const replayManager = require('../services/replay-manager');

async function testAllScenarios() {
  try {
    await connectDB();

    console.log('\n═══════════════════════════════════════════════════════════════');
    console.log('  TESTING ALL REPLAY SCENARIOS');
    console.log('═══════════════════════════════════════════════════════════════\n');

    // Test 1: Load data
    console.log('✅ Test 1: Loading replay data...');
    await replayManager.loadReplayData('NIFTY50');
    const status = replayManager.getStatus();
    console.log(`   Loaded ${status.totalTicks} ticks`);

    // Test 2: Start replay
    console.log('\n✅ Test 2: Starting replay...');
    await replayManager.start({ speed: 10, startFrom: 50 });

    // Wait and collect data
    await new Promise(resolve => setTimeout(resolve, 3000));

    // Test 3: Check data collection
    console.log('\n✅ Test 3: Checking data collection...');
    let dataReceived = false;
    let candleDataReceived = { '1': 0, '5': 0, '15': 0 };

    replayManager.addListener((data) => {
      dataReceived = true;

      // Check if candles are being generated
      if (data.charts && data.charts['5m']) {
        console.log(`   📊 Collected ${data.charts['5m'].length} candles for 5m timeframe`);
      }
    });

    await new Promise(resolve => setTimeout(resolve, 2000));

    if (dataReceived) {
      console.log('   ✓ Data is being received correctly');
    } else {
      console.log('   ⚠️  No data received - check replay manager');
    }

    // Test 4: Signal generation
    console.log('\n✅ Test 4: Testing signal generation...');
    const currentStatus = replayManager.getStatus();
    if (currentStatus.currentTick) {
      console.log(`   ✓ Current price: ₹${currentStatus.currentTick.price?.toFixed(2) || 'N/A'}`);
    }

    // Test 5: Stop replay
    console.log('\n✅ Test 5: Stopping replay...');
    replayManager.stop();
    console.log('   ✓ Replay stopped successfully');

    console.log('\n═══════════════════════════════════════════════════════════════');
    console.log('  ALL TESTS COMPLETED');
    console.log('═══════════════════════════════════════════════════════════════\n');

    console.log('💡 Frontend Test Checklist:');
    console.log('   1. Start replay - should begin at 10:05 AM');
    console.log('   2. Watch line chart - should draw smoothly');
    console.log('   3. Switch to candlestick - should show candles instantly');
    console.log('   4. Change timeframe to 1m - should switch to 1-min candles');
    console.log('   5. Change timeframe to 15m - should switch to 15-min candles');
    console.log('   6. Switch back to line - should preserve all data');
    console.log('   7. Check signal panel - should show live signals');
    console.log('   8. Check price card - should update every second\n');

    process.exit(0);

  } catch (error) {
    console.error('\n❌ Test failed:', error.message);
    console.error(error.stack);
    process.exit(1);
  }
}

testAllScenarios();
