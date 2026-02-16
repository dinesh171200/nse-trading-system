require('dotenv').config();
const mongoose = require('mongoose');
const TradingSignal = require('./models/TradingSignal');

(async () => {
  try {
    await mongoose.connect(process.env.MONGODB_URI);

    const thirtyMinutesAgo = new Date(Date.now() - 30 * 60 * 1000);
    const query = {
      'signal.confidence': { $gte: 50 },
      timestamp: { $gte: thirtyMinutesAgo }
    };

    console.log('Query:', JSON.stringify(query, null, 2));
    console.log('30 minutes ago:', thirtyMinutesAgo);
    console.log('Now:', new Date());
    console.log('');

    const signals = await TradingSignal.find(query).sort({ timestamp: -1 }).limit(10);
    console.log('Signals found:', signals.length);

    if (signals.length > 0) {
      console.log('\nLatest Signals:');
      signals.forEach(s => {
        console.log(`- ${s.symbol}: ${s.signal.action} (${s.signal.confidence.toFixed(1)}%)`);
        console.log(`  Timestamp: ${s.timestamp}`);
        console.log(`  Entry: ₹${s.levels.entry.toFixed(2)} | SL: ₹${s.levels.stopLoss.toFixed(2)}`);
        console.log(`  Targets: ₹${s.levels.target1.toFixed(2)}, ₹${s.levels.target2.toFixed(2)}, ₹${s.levels.target3.toFixed(2)}`);
        console.log('');
      });
    }

    process.exit(0);
  } catch (error) {
    console.error('Error:', error.message);
    process.exit(1);
  }
})();
