# 📊 NSE Real-time Trading System

A real-time trading system that fetches live data from NSE for Nifty 50 and Bank Nifty indices, analyzes 100+ technical indicators, and generates automated BUY/SELL signals with confidence levels.

## Features

- ✅ Real-time NSE data fetching (every 1 minute)
- ✅ Multi-timeframe chart generation (1m, 5m, 15m, 30m, 1h, 1d)
- ✅ 100+ technical indicators combined
- ✅ Automated signal generation with confidence levels
- ✅ WebSocket for real-time updates
- ✅ Historical data analysis
- ✅ Signal performance tracking

## Tech Stack

**Backend:**
- Node.js + Express.js
- MongoDB with Mongoose
- Socket.io for WebSocket
- node-cron for scheduling

**Frontend:**
- React.js
- Recharts / Lightweight Charts
- Socket.io-client

## Quick Start

### Prerequisites
- Node.js v18+
- MongoDB 6.0+
- npm or yarn

### Installation

1. **Clone the repository**
```bash
git clone <repository-url>
cd nse-realtime-trading-system
```

2. **Backend Setup**
```bash
cd backend
npm install
cp .env.example .env
# Edit .env with your configuration
```

3. **Frontend Setup**
```bash
cd frontend
npm install
cp .env.example .env
# Edit .env with your configuration
```

4. **Start MongoDB**
```bash
mongod --dbpath /path/to/data/directory
```

5. **Load Historical Data (Optional)**
```bash
cd backend
npm run load-historical
```

### Running the Application

**Terminal 1 - Backend Server:**
```bash
cd backend
npm run dev
```

**Terminal 2 - Agents:**
```bash
cd backend
npm run agents
```

**Terminal 3 - Frontend:**
```bash
cd frontend
npm start
```

Open [http://localhost:3000](http://localhost:3000) in your browser.

## Project Structure

```
nse-realtime-trading-system/
├── backend/              # Backend server and agents
│   ├── config/          # Configuration files
│   ├── models/          # Database schemas
│   ├── agents/          # Data, Chart, and Signal agents
│   ├── services/        # Business logic services
│   ├── indicators/      # 100+ technical indicators
│   ├── routes/          # API endpoints
│   ├── websocket/       # WebSocket server
│   ├── scripts/         # Testing and utility scripts
│   └── tests/           # Unit tests
├── frontend/            # React frontend
│   └── src/
│       ├── components/  # React components
│       ├── services/    # API and WebSocket clients
│       └── hooks/       # Custom React hooks
└── docs/               # Additional documentation
```

## Testing

### Test Individual Components
```bash
# Test data fetching
npm run test-data-agent

# Test chart generation
npm run test-chart-agent

# Test signal generation
npm run test-signal-agent

# Test specific indicator
node scripts/test-indicator.js --indicator=rsi
```

### Run All Tests
```bash
npm test
```

## API Documentation

### Chart Endpoints
- `GET /api/charts/:symbol/:timeframe` - Get chart data
- `GET /api/charts/:symbol/all-timeframes` - Get all timeframe data

### Signal Endpoints
- `GET /api/signals/live` - Get active signals (>50% confidence)
- `GET /api/signals/historical` - Get past signals
- `GET /api/signals/statistics` - Get performance metrics

### WebSocket Events
- `tick-update` - Real-time price updates
- `chart-update` - Chart data updated
- `signal-generated` - New trading signal
- `signal-updated` - Signal status changed

## Configuration

Key environment variables:

**Backend (.env):**
- `PORT` - Server port (default: 5000)
- `MONGODB_URI` - MongoDB connection string
- `MIN_CONFIDENCE` - Minimum signal confidence (default: 50)
- `DATA_AGENT_INTERVAL` - Data fetch interval in ms (default: 60000)

**Frontend (.env):**
- `REACT_APP_API_URL` - Backend API URL
- `REACT_APP_WS_URL` - WebSocket URL

## Documentation

For detailed documentation, see:
- [Complete System Documentation](../nse_realtime_system.md)
- [CLAUDE.md](../CLAUDE.md) - Developer guide for Claude Code

## License

MIT License

## Acknowledgments

- NSE India for market data
- Technical Indicators library
- MongoDB team
- Socket.io team
- React community

---

**Built for traders, by traders** 📈
