require('dotenv').config();
const nseFetcher = require('../services/nse-fetcher');

async function testDataFetcher() {
  console.log('═══════════════════════════════════════════════════════════');
  console.log('  NSE Data Fetcher Test');
  console.log('═══════════════════════════════════════════════════════════');
  console.log('');

  // Check market status
  const istTime = nseFetcher.getISTTime();
  const isOpen = nseFetcher.isMarketOpen();

  console.log(`📅 Current IST Time: ${istTime.toLocaleString('en-IN', { timeZone: 'Asia/Kolkata' })}`);
  console.log(`🏢 Market Status: ${isOpen ? '✅ OPEN' : '❌ CLOSED'}`);
  console.log('');

  if (!isOpen) {
    console.log('⚠️  Market is closed. Data may be delayed or from previous session.');
    console.log('');
  }

  // Test Nifty 50
  console.log('📊 Fetching Nifty 50 data...');
  try {
    const nifty50 = await nseFetcher.smartFetch('NIFTY50');
    console.log('✓ Nifty 50 Data:');
    console.log(`  Symbol:         ${nifty50.symbol}`);
    console.log(`  Current Price:  ₹${nifty50.price.toFixed(2)}`);
    console.log(`  Open:           ₹${nifty50.metadata.open.toFixed(2)}`);
    console.log(`  High:           ₹${nifty50.metadata.high.toFixed(2)}`);
    console.log(`  Low:            ₹${nifty50.metadata.low.toFixed(2)}`);
    console.log(`  Change:         ${nifty50.metadata.change >= 0 ? '+' : ''}${nifty50.metadata.change.toFixed(2)} (${nifty50.metadata.changePercent.toFixed(2)}%)`);
    console.log(`  Volume:         ${nifty50.volume.toLocaleString()}`);
    console.log(`  Source:         ${nifty50.source}`);
    console.log(`  Timestamp:      ${nifty50.timestamp.toLocaleString()}`);
    console.log('');
  } catch (error) {
    console.error('✗ Failed to fetch Nifty 50:', error.message);
    console.log('');
  }

  // Test Bank Nifty
  console.log('🏦 Fetching Bank Nifty data...');
  try {
    const bankNifty = await nseFetcher.smartFetch('BANKNIFTY');
    console.log('✓ Bank Nifty Data:');
    console.log(`  Symbol:         ${bankNifty.symbol}`);
    console.log(`  Current Price:  ₹${bankNifty.price.toFixed(2)}`);
    console.log(`  Open:           ₹${bankNifty.metadata.open.toFixed(2)}`);
    console.log(`  High:           ₹${bankNifty.metadata.high.toFixed(2)}`);
    console.log(`  Low:            ₹${bankNifty.metadata.low.toFixed(2)}`);
    console.log(`  Change:         ${bankNifty.metadata.change >= 0 ? '+' : ''}${bankNifty.metadata.change.toFixed(2)} (${bankNifty.metadata.changePercent.toFixed(2)}%)`);
    console.log(`  Volume:         ${bankNifty.volume.toLocaleString()}`);
    console.log(`  Source:         ${bankNifty.source}`);
    console.log(`  Timestamp:      ${bankNifty.timestamp.toLocaleString()}`);
    console.log('');
  } catch (error) {
    console.error('✗ Failed to fetch Bank Nifty:', error.message);
    console.log('');
  }

  // Test fetch all
  console.log('🔄 Testing batch fetch...');
  try {
    const allData = await nseFetcher.fetchAll();
    console.log('✓ Batch fetch successful');
    console.log(`  Nifty 50:     ₹${allData.nifty50.price.toFixed(2)}`);
    console.log(`  Bank Nifty:   ₹${allData.bankNifty.price.toFixed(2)}`);
    console.log(`  Fetched at:   ${allData.fetchedAt.toLocaleString()}`);
    console.log('');
  } catch (error) {
    console.error('✗ Batch fetch failed:', error.message);
    console.log('');
  }

  console.log('═══════════════════════════════════════════════════════════');
  console.log('✓ Test completed');
  console.log('═══════════════════════════════════════════════════════════');
}

// Run the test
testDataFetcher()
  .then(() => process.exit(0))
  .catch(error => {
    console.error('Test failed:', error);
    process.exit(1);
  });
