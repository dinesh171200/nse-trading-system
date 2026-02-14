/**
 * Test Replay Signal Generation
 */

require('dotenv').config();
const connectDB = require('../config/database');
const replayManager = require('../services/replay-manager');

async function testSignals() {
  try {
    await connectDB();
    console.log('\n🧪 Testing Replay Signal Generation\n');

    // Load data
    await replayManager.loadReplayData('NIFTY50');

    // Add a test listener
    let updateCount = 0;
    replayManager.addListener((data) => {
      updateCount++;
      console.log(`\n📊 Update ${updateCount}:`);
      console.log(`   Time: ${data.marketTime}`);
      console.log(`   Price: ₹${data.currentTick.price.toFixed(2)}`);
      console.log(`   Progress: ${data.progress}%`);

      // Check charts
      if (data.charts && data.charts['5m']) {
        console.log(`   Candles: ${data.charts['5m'].length}`);
      } else {
        console.log(`   ⚠️  No charts generated!`);
      }

      // Check signal
      if (data.signal) {
        console.log(`   Signal: ${data.signal.signal.action} (${data.signal.signal.confidence.toFixed(1)}%)`);
        if (data.signal.reasoning) {
          console.log(`   Reason: ${data.signal.reasoning[0]}`);
        }
      } else {
        console.log(`   ⚠️  No signal generated!`);
      }

      // Stop after 10 updates
      if (updateCount >= 10) {
        console.log('\n✅ Test complete - stopping replay\n');
        replayManager.stop();
        process.exit(0);
      }
    });

    // Start replay
    console.log('▶️  Starting replay...\n');
    await replayManager.start({ speed: 10 }); // 10x speed for quick test

    // Keep script running
    setTimeout(() => {
      console.log('\n⏱️  Timeout - stopping test\n');
      replayManager.stop();
      process.exit(0);
    }, 15000);

  } catch (error) {
    console.error('\n❌ Error:', error);
    console.error(error.stack);
    process.exit(1);
  }
}

testSignals();
