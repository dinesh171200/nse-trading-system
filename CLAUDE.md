# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Status

This repository currently contains **project specification and documentation only**. The actual codebase has not been implemented yet. The complete system architecture, technical requirements, and implementation plan are documented in `nse_realtime_system.md`.

## Project Overview

**NSE Real-time Trading System** - A real-time trading system for analyzing NSE indices (Nifty 50 and Bank Nifty) using 100+ technical indicators to generate automated BUY/SELL signals.

### Target Indices
- **Nifty 50**: ^NSEI
- **Bank Nifty**: ^NSEBANK

## Planned Architecture

### Tech Stack
- **Backend**: Node.js, Express.js, MongoDB, Socket.io
- **Frontend**: React.js, Recharts/Lightweight Charts
- **Real-time**: WebSocket for live updates
- **Task Scheduling**: node-cron for 1-minute data fetching

### Three-Agent System
1. **Data Agent** (`backend/agents/data-agent.js`): Fetches NSE data every 1 minute
2. **Chart Agent** (`backend/agents/chart-agent.js`): Converts tick data into OHLC charts for timeframes (1m, 5m, 15m, 30m, 1h, 1d)
3. **Signal Agent** (`backend/agents/signal-agent.js`): Analyzes 100+ technical indicators and generates BUY/SELL signals with confidence levels

### Database Collections (MongoDB)
- **TickData**: Raw 1-minute price data from NSE
- **ChartData**: OHLC candles for multiple timeframes
- **TradingSignals**: Generated signals with indicators, confidence, entry/exit levels
- **SystemLogs**: System activity and error logs

### Indicator Categories (115+ total)
- Trend (30 weight%): EMA, SMA, MACD, ADX, DMI, Parabolic SAR, Supertrend, Ichimoku
- Momentum (25 weight%): RSI, Stochastic, CCI, Williams %R, ROC, TSI, Ultimate Oscillator
- Volatility (10 weight%): Bollinger Bands, ATR, Keltner Channel, Donchian Channel
- Volume (15 weight%): OBV, MFI, VWAP, Accumulation/Distribution, Chaikin Money Flow
- Support/Resistance (10 weight%): Pivot Points (5 types), Fibonacci levels, S/R detection
- Patterns (10 weight%): 20+ candlestick patterns, chart patterns, harmonic patterns
- Options (5 weight% when available): PCR, Max Pain, Implied Volatility

## Project Structure (When Implemented)

```
nse-realtime-trading-system/
├── backend/
│   ├── server.js                    # Main Express server
│   ├── config/                      # Database and NSE configuration
│   ├── models/                      # Mongoose schemas (TickData, ChartData, TradingSignal, SystemLog)
│   ├── agents/                      # Data, Chart, and Signal agents
│   ├── services/                    # NSE fetcher, chart generator, signal combiner
│   ├── indicators/                  # 100+ technical indicators organized by category
│   │   ├── trend/                   # EMA, SMA, MACD, ADX, DMI, etc.
│   │   ├── momentum/                # RSI, Stochastic, CCI, Williams %R, etc.
│   │   ├── volatility/              # Bollinger Bands, ATR, Keltner, etc.
│   │   ├── volume/                  # OBV, MFI, VWAP, etc.
│   │   ├── support-resistance/      # Pivot points, Fibonacci, S/R detector
│   │   ├── patterns/                # Candlestick and chart patterns
│   │   └── options/                 # PCR, Max Pain, IV analysis
│   ├── utils/                       # Timeframe converter, OHLC generator, logger
│   ├── routes/                      # REST API endpoints
│   ├── websocket/                   # WebSocket server for real-time updates
│   ├── scripts/                     # Test scripts for agents and indicators
│   └── tests/                       # Unit tests
├── frontend/
│   └── src/
│       ├── components/
│       │   ├── LiveChart/           # Real-time line charts with timeframe selector
│       │   ├── Signals/             # Live signal panel with confidence display
│       │   ├── Historical/          # Past signals and performance metrics
│       │   └── Common/              # Header, index selector, status indicator
│       ├── services/                # API and WebSocket clients
│       └── hooks/                   # React hooks for WebSocket and live data
└── docs/                            # Additional documentation
```

## Key Development Commands (When Implemented)

### Setup
```bash
# Backend setup
cd backend
npm install express mongoose socket.io axios node-cron dotenv cors winston technicalindicators date-fns

# Frontend setup
cd frontend
npm install react react-dom socket.io-client axios recharts date-fns lightweight-charts
```

### Running the System
```bash
# Terminal 1 - Start backend server
cd backend
npm run dev                          # or: node server.js

# Terminal 2 - Start frontend
cd frontend
npm start

# Terminal 3 - Start agents
cd backend
node agents/agent-manager.js
```

### Testing Individual Components
```bash
# Test data fetching from NSE
node scripts/test-data-agent.js

# Test chart generation
node scripts/test-chart-agent.js --symbol=NIFTY50 --timeframe=5m

# Test signal generation
node scripts/test-signal-agent.js --symbol=BANKNIFTY

# Test specific indicator
node scripts/test-indicator.js --indicator=rsi
node scripts/test-indicator.js --indicator=macd
node scripts/test-indicator.js --indicator=bollinger

# Run all tests
npm test

# Run specific test suite
npm test -- indicators
npm test -- agents
npm test -- services
```

### Database Operations
```bash
# Load 5 days historical data for testing
node scripts/load-historical.js

# Reset database
node scripts/reset-database.js

# Cleanup old data
node scripts/cleanup-database.js --days=7
```

## Environment Configuration

### Backend (.env)
```env
PORT=5000
MONGODB_URI=mongodb://localhost:27017/nse_trading
NSE_BASE_URL=https://www.nseindia.com
MARKET_OPEN_HOUR=9
MARKET_OPEN_MINUTE=15
MARKET_CLOSE_HOUR=15
MARKET_CLOSE_MINUTE=30
DATA_AGENT_INTERVAL=60000        # 1 minute
MIN_CONFIDENCE=50                 # Only show signals >50% confidence
SIGNAL_EXPIRY_HOURS=4
WS_PORT=5001
```

### Frontend (.env)
```env
REACT_APP_API_URL=http://localhost:5000
REACT_APP_WS_URL=ws://localhost:5001
```

## Key Technical Details

### Signal Generation Logic
- Each indicator produces a score from -100 (Strong Sell) to +100 (Strong Buy)
- Scores are weighted by category (Trend: 30%, Momentum: 25%, Volume: 15%, etc.)
- Final confidence score: 0-100% based on weighted combination
- Only signals with confidence >50% are stored and displayed
- Signals include: action (BUY/SELL), entry price, stop loss, 3 targets, risk/reward ratio

### Market Hours (IST)
- Trading: 9:15 AM - 3:30 PM
- Data Agent runs every 1 minute during market hours
- System auto-detects market holidays and weekends

### API Endpoints (When Implemented)
- `GET /api/charts/:symbol/:timeframe` - Get chart data
- `GET /api/signals/live` - Get active signals (confidence >50%)
- `GET /api/signals/historical` - Get past signals with performance
- `GET /api/signals/statistics` - Get win rate and performance metrics
- `GET /api/test/data-agent` - Manually test data fetching
- `GET /api/test/indicator/:name` - Test specific indicator

### WebSocket Events
- `tick-update` - Real-time price updates (every 1 min)
- `chart-update` - Chart data updated
- `signal-generated` - New trading signal
- `signal-updated` - Existing signal hit target/SL

## Implementation Guidelines

### When Building the Indicators
1. Each indicator should be in its own file under the appropriate category folder
2. Export a function that takes chart data and returns a signal score (-100 to 100)
3. Include metadata: indicator name, category, weight, description
4. Handle edge cases (insufficient data, invalid values)
5. Add unit tests for each indicator

### When Building the Agents
1. **Data Agent**: Use proper headers and user-agent when fetching from NSE to avoid blocking
2. **Chart Agent**: Implement efficient OHLC aggregation from tick data
3. **Signal Agent**: Run indicator calculations in parallel for performance

### Database Indexes (Critical for Performance)
- TickData: `{ symbol: 1, timestamp: -1 }`
- ChartData: `{ symbol: 1, timeframe: 1, timestamp: -1 }`
- TradingSignals: `{ symbol: 1, timestamp: -1 }`, `{ "signal.confidence": -1, timestamp: -1 }`

## Important Notes

- This is a **specification document only** - no code has been implemented yet
- NSE data fetching may require specific headers and rate limiting
- Market data is only available during trading hours (9:15 AM - 3:30 PM IST)
- The system requires substantial computational resources when calculating 100+ indicators
- Consider starting with a subset of indicators (20-30) before implementing all 115+
- WebSocket connections need proper error handling and reconnection logic
- Signal performance tracking requires comparing entry price with subsequent price movements

## Next Steps for Implementation

1. Set up project structure (backend/frontend folders)
2. Initialize Node.js project with dependencies
3. Configure MongoDB connection
4. Implement NSE data fetcher service (test with manual runs first)
5. Build Data Agent with 1-minute cron job
6. Create database models (TickData, ChartData, TradingSignal)
7. Implement Chart Agent for OHLC generation
8. Build core indicators (start with EMA, RSI, MACD, Bollinger Bands)
9. Implement Signal Agent with indicator combination logic
10. Create REST API endpoints
11. Set up WebSocket server
12. Build React frontend with live charts
13. Add historical data loader for testing
14. Implement comprehensive error handling and logging
