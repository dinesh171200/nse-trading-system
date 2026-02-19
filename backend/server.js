const express = require('express');
const cors = require('cors');
const http = require('http');
const { Server } = require('socket.io');
require('dotenv').config();

const connectDB = require('./config/database');

const app = express();
const server = http.createServer(app);
const io = new Server(server, {
  cors: {
    origin: '*',
    methods: ['GET', 'POST']
  }
});

const PORT = process.env.PORT || 5000;

// Middleware
app.use(cors());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Connect to database
connectDB();

// Routes
app.get('/', (req, res) => {
  res.json({
    message: 'NSE Real-time Trading System API',
    version: '1.0.0',
    status: 'running',
    endpoints: {
      test: '/api/test',
      fetchNSE: '/api/test/fetch-nse',
      marketStatus: '/api/test/market-status',
      latestData: '/api/test/latest-data'
    }
  });
});

// API Routes
app.use('/api/test', require('./routes/test'));
app.use('/api/charts', require('./routes/chart'));
app.use('/api/demo', require('./routes/demo'));
app.use('/api/replay', require('./routes/replay'));
app.use('/api/signals', require('./routes/signals'));
app.use('/api/signals-test', require('./routes/signals-test'));
app.use('/api/history', require('./routes/history'));
app.use('/api/investing', require('./routes/investing'));

// TODO: Import and use other routes
// app.use('/api/options', require('./routes/options'));

// WebSocket - Replay Manager Integration
const replayManager = require('./services/replay-manager');

io.on('connection', (socket) => {
  console.log('✓ Client connected:', socket.id);

  // Send current replay status
  socket.emit('replay-status', replayManager.getStatus());

  // Add listener for replay updates
  const replayListener = (data) => {
    socket.emit('replay-update', data);
  };

  replayManager.addListener(replayListener);

  // Handle disconnection
  socket.on('disconnect', () => {
    console.log('✗ Client disconnected:', socket.id);
    replayManager.removeListener(replayListener);
  });

  // Control commands
  socket.on('replay-start', async (data) => {
    const result = await replayManager.start(data);
    socket.emit('replay-status', replayManager.getStatus());
  });

  socket.on('replay-pause', () => {
    replayManager.pause();
    socket.emit('replay-status', replayManager.getStatus());
  });

  socket.on('replay-resume', async () => {
    await replayManager.resume();
    socket.emit('replay-status', replayManager.getStatus());
  });

  socket.on('replay-stop', () => {
    replayManager.stop();
    socket.emit('replay-status', replayManager.getStatus());
  });
});

// Error handling middleware
app.use((err, req, res, next) => {
  console.error(err.stack);
  res.status(500).json({
    success: false,
    message: 'Internal server error',
    error: process.env.NODE_ENV === 'development' ? err.message : undefined
  });
});

// Start server
server.listen(PORT, () => {
  console.log(`✓ Server running on port ${PORT}`);
  console.log(`✓ Environment: ${process.env.NODE_ENV || 'development'}`);
  console.log(`✓ WebSocket enabled for replay updates`);

  // Start background agents automatically
  startBackgroundAgents();
});

/**
 * Start background signal generation (SIMPLIFIED ARCHITECTURE)
 *
 * OLD APPROACH (removed):
 * - Data Agent: Fetched from Yahoo Finance every 1 minute → MongoDB TickData
 * - Chart Generator: Converted TickData → ChartData every 1 minute
 * - Signal Generator: Read ChartData → Generate signals every 3 minutes
 *
 * NEW APPROACH:
 * - Signal Generator: Fetches fresh data from MoneyControl/Investing.com (same as frontend)
 *   → Generates signals → Stores ONLY signals in MongoDB
 * - No redundant data storage needed (frontend already has chart data)
 */
function startBackgroundAgents() {
  try {
    console.log('\n🤖 Starting background services...');

    // REMOVED: Data Agent (no longer needed - frontend gets data directly)
    // REMOVED: Chart Generator (no longer needed - frontend has charts)

    // Start SIMPLIFIED Signal Generator (fetches data on-demand, generates signals every 3 minutes)
    require('./auto-signal-generator-simple');
    console.log('✓ Simplified Signal Generator started');

    // Start Signal Tracker (monitors active signals)
    const signalTracker = require('./services/signal-tracker');
    if (signalTracker && signalTracker.startTracking) {
      signalTracker.startTracking();
      console.log('✓ Signal Performance Tracker started');
      console.log('✓ Signal Tracker started');
    }

    console.log('✅ All background services are running\n');
  } catch (error) {
    console.error('⚠️  Error starting background services:', error.message);
    console.log('💡 Services will need to be started manually if required');
  }
}

module.exports = app;
