require('dotenv').config();
const mongoose = require('mongoose');
const TradingSignal = require('./models/TradingSignal');

(async () => {
  await mongoose.connect(process.env.MONGODB_URI);

  console.log('═══════════════════════════════════════');
  console.log('  SIGNAL HISTORY CHECK');
  console.log('═══════════════════════════════════════\n');

  // Total signals
  const total = await TradingSignal.countDocuments();
  console.log('📊 Total Signals in Database:', total);

  // By status
  const active = await TradingSignal.countDocuments({ status: 'ACTIVE' });
  const hitTarget = await TradingSignal.countDocuments({ status: 'HIT_TARGET' });
  const hitSL = await TradingSignal.countDocuments({ status: 'HIT_SL' });
  const expired = await TradingSignal.countDocuments({ status: 'EXPIRED' });

  console.log('\nBy Status:');
  console.log('  Active:', active);
  console.log('  Hit Target:', hitTarget);
  console.log('  Hit Stop Loss:', hitSL);
  console.log('  Expired:', expired);

  // Performance stats
  const wins = await TradingSignal.countDocuments({ 'performance.outcome': 'WIN' });
  const losses = await TradingSignal.countDocuments({ 'performance.outcome': 'LOSS' });

  console.log('\nPerformance:');
  console.log('  Wins:', wins);
  console.log('  Losses:', losses);
  if (wins + losses > 0) {
    console.log('  Win Rate:', ((wins / (wins + losses)) * 100).toFixed(1) + '%');
  }

  // Latest 5 completed signals
  const completed = await TradingSignal.find({
    status: { $in: ['HIT_TARGET', 'HIT_SL'] }
  }).sort({ timestamp: -1 }).limit(5);

  console.log('\n📈 Latest 5 Completed Signals:');
  completed.forEach((s, i) => {
    const emoji = s.performance.outcome === 'WIN' ? '✅' : '❌';
    const pl = s.performance.profitLoss || 0;
    const plPct = s.performance.profitLossPercent || 0;
    console.log(`\n${i+1}. ${emoji} ${s.symbol} ${s.signal.action}`);
    console.log(`   Entry: ₹${s.levels.entry.toFixed(2)} → Exit: ₹${s.performance.exitPrice.toFixed(2)}`);
    console.log(`   P/L: ${pl >= 0 ? '+' : ''}₹${pl.toFixed(2)} (${plPct >= 0 ? '+' : ''}${plPct.toFixed(2)}%)`);
    console.log(`   Hit: ${s.performance.hitLevel || 'N/A'}`);
  });

  process.exit(0);
})();
