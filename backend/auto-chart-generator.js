/**
 * Auto Chart Generator
 * Automatically generates charts every minute after data collection
 */

require('dotenv').config();
const connectDB = require('./config/database');
const chartGenerator = require('./services/chart-generator');
const cron = require('node-cron');

async function generateCharts() {
  try {
    const istTime = new Date().toLocaleString('en-IN', { timeZone: 'Asia/Kolkata' });
    console.log(`\n[${istTime}] Generating charts...`);

    await chartGenerator.generateAllTimeframes('NIFTY50', { lookbackHours: 1 });
    await chartGenerator.generateAllTimeframes('BANKNIFTY', { lookbackHours: 1 });

    console.log('✓ Charts updated successfully');
  } catch (error) {
    console.error('✗ Error generating charts:', error.message);
  }
}

async function start() {
  await connectDB();

  console.log('═══════════════════════════════════════');
  console.log('  Auto Chart Generator Started');
  console.log('═══════════════════════════════════════\n');
  console.log('✓ Charts will be generated every minute');
  console.log('✓ Press Ctrl+C to stop\n');

  // Generate charts immediately
  await generateCharts();

  // Schedule to run every minute
  cron.schedule('* * * * *', generateCharts);
}

start().catch(console.error);
