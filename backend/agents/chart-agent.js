const ChartData = require('../models/ChartData');
const TickData = require('../models/TickData');
const chartGenerator = require('../services/chart-generator');

class ChartAgent {
  constructor() {
    this.isRunning = false;
    this.timeframes = ['1m', '5m', '15m', '30m', '1h', '1d'];
  }

  start() {
    console.log('Starting Chart Agent...');

    // TODO: Listen for 'tick-data-saved' event
    // eventEmitter.on('tick-data-saved', () => this.generateCharts());

    this.isRunning = true;
    console.log('✓ Chart Agent started');
  }

  stop() {
    this.isRunning = false;
    console.log('✓ Chart Agent stopped');
  }

  async generateCharts() {
    try {
      const istTime = new Date().toLocaleString('en-IN', { timeZone: 'Asia/Kolkata' });
      console.log(`[${istTime}] Generating charts...`);

      // Generate charts for both symbols
      await chartGenerator.generateAllTimeframes('NIFTY50', { lookbackHours: 24 });
      await chartGenerator.generateAllTimeframes('BANKNIFTY', { lookbackHours: 24 });

      console.log('✓ Charts generated successfully');

      // TODO: Emit event to trigger signal agent
      // eventEmitter.emit('chart-updated');

    } catch (error) {
      console.error('✗ Error generating charts:', error.message);
    }
  }
}

module.exports = ChartAgent;
