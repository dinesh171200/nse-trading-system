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
});

module.exports = app;
