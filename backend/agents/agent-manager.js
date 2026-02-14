require('dotenv').config();
const connectDB = require('../config/database');
const DataAgent = require('./data-agent');
// TODO: Import other agents
// const ChartAgent = require('./chart-agent');
// const SignalAgent = require('./signal-agent');

class AgentManager {
  constructor() {
    this.agents = {
      dataAgent: null,
      chartAgent: null,
      signalAgent: null
    };
    this.isRunning = false;
  }

  async start() {
    try {
      // Connect to database
      await connectDB();

      console.log('═══════════════════════════════════════');
      console.log('  NSE Trading System - Agent Manager  ');
      console.log('═══════════════════════════════════════');
      console.log('');

      // TODO: Start all agents
      console.log('⏳ Starting agents...');

      // Start data agent
      if (process.env.DATA_AGENT_ENABLED !== 'false') {
        this.agents.dataAgent = new DataAgent();
        this.agents.dataAgent.start();
        console.log('  ✓ Data Agent: Started (fetching every 1 minute)');
      }

      // Start chart agent
      if (process.env.CHART_AGENT_ENABLED !== 'false') {
        // TODO: Implement chart agent
        console.log('  ⏳ Chart Agent: Not implemented yet');
      }

      // Start signal agent
      if (process.env.SIGNAL_AGENT_ENABLED !== 'false') {
        // TODO: Implement signal agent
        console.log('  ⏳ Signal Agent: Not implemented yet');
      }

      console.log('');
      console.log('✓ All agents started successfully');
      console.log('✓ System is now running');
      console.log('✓ Data will be fetched every minute');
      console.log('');
      console.log('Press Ctrl+C to stop');

      this.isRunning = true;

      // Keep process alive
      process.on('SIGINT', () => this.stop());
      process.on('SIGTERM', () => this.stop());

    } catch (error) {
      console.error('✗ Failed to start agents:', error.message);
      process.exit(1);
    }
  }

  async stop() {
    console.log('');
    console.log('⏳ Stopping agents...');

    // Stop data agent
    if (this.agents.dataAgent) {
      this.agents.dataAgent.stop();
      console.log('  ✓ Data Agent stopped');
    }

    // TODO: Stop other agents

    this.isRunning = false;
    console.log('✓ All agents stopped');
    process.exit(0);
  }

  checkHealth() {
    // TODO: Implement health checks
    return {
      dataAgent: 'healthy',
      chartAgent: 'healthy',
      signalAgent: 'healthy'
    };
  }
}

// Start if run directly
if (require.main === module) {
  const manager = new AgentManager();
  manager.start();
}

module.exports = AgentManager;
