# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

**NSE Real-time Trading System** - A full-stack real-time trading signals platform that analyzes Indian stock market data (Nifty 50, Bank Nifty) and US indices (Dow Jones) using 50+ technical indicators to generate automated trading signals.

### Target Indices
- **Nifty 50**: MoneyControl symbol `in;NSX`
- **Bank Nifty**: MoneyControl symbol `in;nbx`
- **Dow Jones Future**: Investing.com ID `8873`

## Architecture

### Tech Stack
- **Backend**: Node.js, Express.js, MongoDB, Socket.IO
- **Frontend**: React.js with lightweight-charts library
- **Real-time**: WebSocket for live updates (Socket.IO)
- **APIs**: MoneyControl (Indian markets), Investing.com (US markets via backend proxy)

### Background Agents (Auto-start on Server Launch)
1. **Data Agent** (`backend/agents/data-agent.js`): Fetches NSE data every 1 minute
2. **Chart Generator** (`backend/auto-chart-generator.js`): Generates OHLC charts every minute
3. **Signal Generator** (`backend/auto-signal-generator.js`): Analyzes indicators and generates trading signals
4. **Signal Tracker** (`backend/services/signal-tracker.js`): Monitors active signals and tracks P&L

### Key Services
- **Replay Manager** (`backend/services/replay-manager.js`): Event-driven replay system with listeners pattern
- **Database** (`backend/config/database.js`): MongoDB connection management
- **Backend Proxy** (`backend/routes/investing.js`): Bypasses CORS/Cloudflare for Investing.com API

## Project Structure

```
nse-realtime-trading-system/
├── backend/
│   ├── server.js                           # Main Express server with Socket.IO
│   ├── config/database.js                  # MongoDB connection
│   ├── models/                             # Mongoose schemas
│   ├── agents/data-agent.js                # Fetches NSE data every minute
│   ├── services/
│   │   ├── replay-manager.js               # Manages replay state, event-driven
│   │   ├── signal-tracker.js               # Monitors active signals
│   │   └── signal-combiner.js              # Combines 50+ indicators into signals
│   ├── indicators/                         # 50+ technical indicators (46 files)
│   │   ├── index.js                        # Main exports
│   │   ├── momentum/                       # RSI, Stochastic, CCI, Williams %R, etc.
│   │   ├── trend/                          # EMA, MACD, ADX, Supertrend, Ichimoku, etc.
│   │   ├── volatility/                     # Bollinger Bands, ATR, Keltner, etc.
│   │   ├── volume/                         # OBV, MFI, VWAP, A/D, CMF, etc.
│   │   ├── support-resistance/             # Pivot Points, Fibonacci, S/R levels
│   │   └── options/                        # PCR, Open Interest analysis
│   ├── routes/
│   │   ├── test.js                         # Test endpoints
│   │   ├── chart.js                        # Chart data endpoints
│   │   ├── demo.js                         # Demo data
│   │   ├── replay.js                       # Replay control
│   │   ├── signals.js                      # Signal generation
│   │   ├── signals-test.js                 # Signal testing
│   │   ├── history.js                      # Historical data
│   │   └── investing.js                    # Backend proxy for Investing.com
│   ├── auto-chart-generator.js             # Auto-generates OHLC charts
│   ├── auto-signal-generator.js            # Auto-generates trading signals
│   └── INDICATORS_LIST.md                  # Complete indicator documentation
├── frontend/src/
│   ├── App.js                              # Main app with routes
│   ├── components/
│   │   ├── LiveChart/
│   │   │   ├── MoneyControlChart.jsx       # Reusable chart component
│   │   │   └── MoneyControlChart.css       # Chart styling
│   │   ├── Signals/SignalCard.jsx          # Signal display card
│   │   └── Common/Header.jsx               # Header with navigation
│   ├── pages/
│   │   ├── DetailedChart.jsx               # Full-page detailed chart view
│   │   ├── SignalHistoryPage.jsx           # Signal history
│   │   └── SignalDetail.jsx                # Individual signal detail
│   └── hooks/
│       ├── useWebSocket.js                 # WebSocket connection
│       ├── useMarketStatus.js              # Market open/close status
│       ├── useSignals.js                   # Fetch and refresh signals
│       └── useLiveData.js                  # Real-time market data
```

## Development Commands

### Setup
```bash
# Backend setup
cd backend
npm install

# Frontend setup
cd frontend
npm install
```

### Running the System
```bash
# Terminal 1 - Start backend server (port 3001 by default)
cd backend
npm start                            # or: node server.js

# Terminal 2 - Start frontend (port 3000)
cd frontend
npm start
```

**Important**: Backend automatically starts all background agents on launch (Data Agent, Chart Generator, Signal Generator, Signal Tracker). No separate agent process needed.

### Building for Production
```bash
# Frontend production build
cd frontend
npm run build
```

## Environment Configuration

### Backend (.env)
```env
PORT=3001
MONGODB_URI=mongodb+srv://username:password@cluster.mongodb.net/nse_trading
NODE_ENV=development
```

### Frontend (.env)
```env
REACT_APP_API_URL=http://localhost:3001
REACT_APP_WS_URL=ws://localhost:3001
```

**Critical**: WebSocket URL must match the HTTP server port (3001). Backend runs WebSocket and HTTP on the same port, not separate ports.

## Key Technical Details

### Chart System Architecture

**MoneyControlChart Component** (`frontend/src/components/LiveChart/MoneyControlChart.jsx`):
- Reusable chart component for all symbols (Nifty 50, Bank Nifty, Dow Jones)
- Each symbol gets its own independent chart instance (destroy/recreate on symbol change)
- Auto-refreshes every 60 seconds
- Supports dual chart types: candlestick (Indian indices) vs line (US indices)
- Overlays technical indicators (EMA 9/21/50, Volume) directly on charts using lightweight-charts series

**Data Flow**:
1. Component mounts → fetch initial data from API
2. Create lightweight-charts instance with specific configuration
3. Add multiple series to chart:
   - Main series: Candlestick or line chart
   - Indicator series: EMA lines (9/21/50 periods)
   - Volume series: Histogram with separate price scale
4. Transform API data to chart format (OHLC for candlestick, time/value for line)
5. Calculate EMA values client-side using exponential smoothing algorithm
6. Apply data to all series (main chart, EMAs, volume)
7. Set interval for 60-second auto-refresh
8. On symbol change → destroy old chart, create new instance (ensures zoom/pan independence)

**Critical Pattern**: Always wrap `chart.remove()` in try-catch blocks due to React Strict Mode remounting components. Set refs to null after disposal to prevent stale references.

### API Integration

**MoneyControl API** (Indian Indices):
- Nifty 50: `symbol=in;NSX`
- Bank Nifty: `symbol=in;nbx`
- URL: `https://priceapi.moneycontrol.com/techCharts/indianMarket/index/history`
- Parameters: `resolution=5` (5-minute candles), `from` and `to` (Unix timestamps), `countback=1440`
- Data range: 5 days from current datetime
- Response format: `{s: 'ok', t: [timestamps], o: [open], h: [high], l: [low], c: [close]}`

**Investing.com API** (US Indices) via Backend Proxy:
- Dow Jones ID: `8873`
- Frontend calls: `${API_URL}/api/investing/dow-jones`
- Backend proxies to: `https://api.investing.com/api/financialdata/8873/historical/chart/`
- Parameters: `interval=PT5M`, `pointscount=160`
- Response format: `[[timestamp_ms, open, high, low, close, volume], ...]`
- Data transformation: `time: Math.floor(item[0] / 1000)`, `value: item[4]` (close price)

**Why Backend Proxy?** Investing.com API is protected by Cloudflare. Direct browser requests fail with "Just a moment..." page. Backend proxy adds proper headers (User-Agent, Referer, Origin) to bypass protection.

### WebSocket Communication

**Server** (`backend/server.js`):
- Socket.IO server on port 3001 (same as HTTP server)
- Emits `replay-status`, `replay-update` events
- Listens for `replay-start`, `replay-pause`, `replay-resume`, `replay-stop` commands

**Client** (`frontend/src/hooks/useWebSocket.js`):
- Connects to `REACT_APP_WS_URL` (must match HTTP server port)
- Maintains connection status

### API Endpoints

**Test Endpoints**:
- `GET /api/test` - Test endpoint info
- `GET /api/test/fetch-nse` - Manually fetch NSE data
- `GET /api/test/market-status` - Market open/close status
- `GET /api/test/latest-data` - Latest market data

**Chart Endpoints**:
- `GET /api/charts/*` - Chart data

**Signal Endpoints**:
- `GET /api/signals?index=NIFTY50&timeframe=5m` - Current signal for index/timeframe
- `GET /api/signals-test` - Test signal generation
- `GET /api/history` - Historical signals

**Proxy Endpoints**:
- `GET /api/investing/dow-jones` - Dow Jones data via backend proxy (bypasses Cloudflare)

### Technical Indicator System (50+ Indicators)

The system implements a comprehensive technical analysis engine with 50+ indicators across 6 categories. See `backend/INDICATORS_LIST.md` for the complete list.

**Indicator Organization** (`backend/indicators/`):
```
indicators/
├── index.js                      # Main exports for all indicators
├── momentum/                     # 16 momentum indicators (RSI, Stochastic, CCI, etc.)
├── trend/                        # 16 trend indicators (EMA, MACD, ADX, Ichimoku, etc.)
├── volatility/                   # 6 volatility indicators (Bollinger Bands, ATR, etc.)
├── volume/                       # 9 volume indicators (OBV, MFI, VWAP, etc.)
├── support-resistance/           # 4 S/R indicators (Pivot Points, Fibonacci, etc.)
└── options/                      # Options indicators (PCR, OI Analysis)
```

**Signal Weighting System** (`backend/services/signal-combiner.js`):

Each category contributes differently to the final signal:
- **Trend**: 30% - Most important for overall market direction
- **Momentum**: 25% - Second-most important for timing
- **Volume**: 15% - Confirms price movements
- **Volatility**: 10% - Risk assessment
- **Patterns**: 10% - Chart pattern recognition
- **Support/Resistance**: 10% - Key price levels

**Signal Generation Flow**:
1. Calculate all 50+ indicators on OHLC candle data
2. Each indicator returns a score (-100 to +100) and signal (BUY/SELL/NEUTRAL)
3. Group scores by category and calculate category averages
4. Apply category weights to get total weighted score
5. Add agreement bonus when multiple indicators align
6. Normalize to confidence percentage (0-100%)
7. Determine action (BUY/SELL/HOLD) and strength (STRONG/MODERATE/WEAK)
8. Calculate entry/exit levels using support/resistance zones

**How to Add a New Indicator**:

1. **Create indicator file** in appropriate category folder:
```javascript
// backend/indicators/momentum/my-indicator.js
function calculateMyIndicator(candles, period = 14) {
  // Validate data
  if (!candles || candles.length < period) {
    throw new Error('Insufficient data for My Indicator');
  }

  // Calculate indicator logic
  const value = /* your calculation */;

  // Determine signal
  let signal = 'NEUTRAL', score = 0;
  if (/* bullish condition */) {
    signal = 'BUY';
    score = 50; // Range: 0 to 100
  } else if (/* bearish condition */) {
    signal = 'SELL';
    score = -50; // Range: -100 to 0
  }

  return {
    name: 'My Indicator',
    category: 'momentum', // or trend/volatility/volume/supportResistance
    value,
    signal: {
      action: signal,
      score,
      strength: 'MODERATE' // STRONG/MODERATE/WEAK
    },
    interpretation: 'Human-readable explanation'
  };
}

module.exports = { calculateMyIndicator };
```

2. **Export in index.js**:
```javascript
// backend/indicators/index.js
const myIndicator = require('./momentum/my-indicator');

module.exports = {
  momentum: {
    // ... existing indicators
    myIndicator
  },
  // ... other categories
};
```

3. **Integrate in signal-combiner.js**:
```javascript
// backend/services/signal-combiner.js
async calculateAllIndicators(candles) {
  const results = {};

  // Add your indicator calculation
  try {
    if (candles.length >= 14) {
      results.my_indicator = indicators.momentum.myIndicator.calculateMyIndicator(candles, 14);
    }
  } catch (error) {
    console.log('My Indicator calculation skipped:', error.message);
  }

  return results;
}
```

**Indicator Return Format** (Standard):
```javascript
{
  name: 'Indicator Name',
  category: 'trend|momentum|volatility|volume|supportResistance',
  value: 42.5,                    // Numeric value
  signal: {
    action: 'BUY|SELL|NEUTRAL',
    score: 65,                    // -100 to +100
    strength: 'STRONG|MODERATE|WEAK'
  },
  interpretation: 'Explanation',  // Optional
  // Additional indicator-specific fields (bands, levels, etc.)
}
```

**Data Requirements**:
- **Minimal** (2-10 candles): OBV, VWAP, Pivot Points
- **Short** (11-20 candles): RSI, Stochastic, Bollinger Bands, ATR
- **Medium** (21-35 candles): MACD, ADX, Aroon
- **Long** (36+ candles): EMA 50, Ichimoku, Mass Index

**Error Handling Pattern**:
Always wrap indicator calculations in try-catch blocks. If insufficient data, log and skip gracefully:
```javascript
try {
  if (candles.length >= minRequired) {
    results.indicator_name = indicators.category.name.calculate(candles);
  }
} catch (error) {
  console.log('Indicator calculation skipped:', error.message);
}
```

**Testing Individual Indicators**:
```bash
# Create a test script
node -e "
const indicator = require('./indicators/momentum/rsi');
const testCandles = [...]; // Your test data
const result = indicator.calculateRSI(testCandles, 14);
console.log(result);
"
```

## Important Patterns and Best Practices

### Chart Component Patterns

**Chart Independence**:
```javascript
// ALWAYS destroy chart on symbol change to ensure independence
useEffect(() => {
  if (chartRef.current) {
    try { chartRef.current.remove(); } catch (e) {}
    chartRef.current = null;
  }

  // Create new chart for selected symbol
  const chart = createChart(chartContainerRef.current, {...});
  chartRef.current = chart;

  // Cleanup on unmount or symbol change
  return () => {
    if (chart) {
      try { chart.remove(); } catch (e) {}
    }
    chartRef.current = null;
    candlestickSeriesRef.current = null;
    lineSeriesRef.current = null;
  };
}, [selectedSymbol]); // Dependency on selectedSymbol is critical
```

**Error Handling for Chart Disposal**:
- React Strict Mode remounts components, causing double disposal
- Always wrap `chart.remove()` in try-catch blocks
- Set refs to null after disposal to prevent stale references
- Use try-catch in cleanup functions and resize handlers

**Data Transformation**:
```javascript
// MoneyControl (Indian) → Candlestick
chartData = data.t.map((timestamp, index) => ({
  time: timestamp,
  open: data.o[index],
  high: data.h[index],
  low: data.l[index],
  close: data.c[index],
}));

// Investing.com (US) → Line Chart
chartData = data.map(item => ({
  time: Math.floor(item[0] / 1000), // Convert ms to seconds
  value: item[4], // Close price
}));
```

**Adding Multiple Indicator Series**:
```javascript
// Create chart with main candlestick series
const chart = createChart(container, options);
const candlestickSeries = chart.addCandlestickSeries();

// Add EMA indicator lines
const ema9Series = chart.addLineSeries({
  color: '#2962FF',
  lineWidth: 1,
  title: 'EMA 9',
});

const ema21Series = chart.addLineSeries({
  color: '#E91E63',
  lineWidth: 1,
  title: 'EMA 21',
});

// Add volume histogram on separate scale
const volumeSeries = chart.addHistogramSeries({
  color: '#26a69a',
  priceFormat: { type: 'volume' },
  priceScaleId: 'volume', // Separate price scale
});

// Configure volume scale to appear below main chart
chart.priceScale('volume').applyOptions({
  scaleMargins: {
    top: 0.8,    // Volume takes bottom 20%
    bottom: 0,
  },
});

// Calculate and set EMA data
const calculateEMA = (data, period) => {
  const k = 2 / (period + 1);
  const emaData = [];
  let ema = 0;

  // Initial SMA
  for (let i = 0; i < period; i++) {
    ema += data[i].close;
  }
  ema = ema / period;
  emaData.push({ time: data[period - 1].time, value: ema });

  // Subsequent EMA values
  for (let i = period; i < data.length; i++) {
    ema = data[i].close * k + ema * (1 - k);
    emaData.push({ time: data[i].time, value: ema });
  }
  return emaData;
};

// Apply data to series
candlestickSeries.setData(chartData);
ema9Series.setData(calculateEMA(chartData, 9));
ema21Series.setData(calculateEMA(chartData, 21));

// Volume data with color based on price direction
const volumeData = chartData.map(candle => ({
  time: candle.time,
  value: candle.volume || 0,
  color: candle.close >= candle.open ? '#26a69a80' : '#ef535080'
}));
volumeSeries.setData(volumeData);
```

**Important**: Store all series in refs for cleanup:
```javascript
const ema9SeriesRef = useRef(null);
const ema21SeriesRef = useRef(null);
const volumeSeriesRef = useRef(null);

// In cleanup
return () => {
  if (chartRef.current) {
    try { chartRef.current.remove(); } catch (e) {}
  }
  chartRef.current = null;
  candlestickSeriesRef.current = null;
  ema9SeriesRef.current = null;
  ema21SeriesRef.current = null;
  volumeSeriesRef.current = null;
};
```

### Backend Proxy Pattern

When external APIs have CORS or Cloudflare protection:

1. Create backend proxy endpoint (`routes/investing.js`):
```javascript
const response = await axios.get(external_url, {
  params: {...},
  headers: {
    'User-Agent': 'Mozilla/5.0...',
    'Accept': 'application/json',
    'Referer': 'https://www.investing.com/',
    'Origin': 'https://www.investing.com'
  },
  timeout: 10000
});
res.json({ success: true, data: response.data });
```

2. Frontend calls backend proxy instead of external API directly:
```javascript
const API_URL = process.env.REACT_APP_API_URL || 'http://localhost:3001';
const response = await fetch(`${API_URL}/api/investing/dow-jones`);
```

### WebSocket Configuration

- Backend WebSocket runs on same port as HTTP server (3001), **not a separate port**
- Frontend `.env` must have: `REACT_APP_WS_URL=ws://localhost:3001`
- Common mistake: Setting WebSocket to different port causes connection failures

### Background Agent Startup

All agents auto-start in `backend/server.js` after server launch:
```javascript
function startBackgroundAgents() {
  const DataAgent = require('./agents/data-agent');
  const dataAgent = new DataAgent();
  dataAgent.start();

  require('./auto-chart-generator');
  require('./auto-signal-generator');

  const signalTracker = require('./services/signal-tracker');
  signalTracker.startTracking();
}
```

## Common Issues and Solutions

**Chart independence problem** - "changing or reducing graph single indexes like nifty50 then rest also reflecting"
- **Cause**: All symbols sharing same chart instance, zoom/pan state persists
- **Solution**: Destroy and recreate chart on symbol change using `useEffect` dependency on `selectedSymbol`

**WebSocket not connecting** - "market is open but price is not reflecting"
- **Cause**: `.env` has wrong WebSocket port (e.g., 5001 instead of 3001)
- **Solution**: Verify `REACT_APP_WS_URL=ws://localhost:3001` matches backend server port

**React Strict Mode disposal errors** - "Object is disposed" in console
- **Cause**: React Strict Mode remounts components, tries to dispose chart twice
- **Solution**: Wrap all `chart.remove()` calls in try-catch, set refs to null after disposal

**Cloudflare blocking** - "No data available from Investing.com"
- **Cause**: Investing.com API protected by Cloudflare, returns "Just a moment..." page on direct browser fetch
- **Solution**: Use backend proxy pattern (see `routes/investing.js`) with proper headers

**MongoDB connection errors**
- **Cause**: Deployment server IP not whitelisted in MongoDB Atlas
- **Solution**: Check Network Access settings in MongoDB Atlas dashboard, whitelist server IP

**Port conflicts**
- **Backend**: Default port 3001 (configurable via `PORT` env var)
- **Frontend dev server**: Port 3000
- **WebSocket**: Same as backend HTTP server (3001), not a separate port

## Deployment

**Render Configuration**:
- **Frontend**: Static site
  - Build command: `npm run build`
  - Publish directory: `build`
- **Backend**: Web service
  - Start command: `npm start`
  - Port: 3001 (or `PORT` env var)
  - Update `REACT_APP_API_URL` and `REACT_APP_WS_URL` to production backend URL

**MongoDB Atlas**:
- Whitelist deployment server IP in Network Access if connection fails
- Use connection string format: `mongodb+srv://username:password@cluster.mongodb.net/dbname`

**Environment Variables for Production**:
- Backend: `PORT`, `MONGODB_URI`, `NODE_ENV=production`
- Frontend: `REACT_APP_API_URL=https://your-backend-url.com`, `REACT_APP_WS_URL=wss://your-backend-url.com`
