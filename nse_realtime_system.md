# 📊 NSE Real-time Trading System - Complete Documentation

## Table of Contents
1. [Project Overview](#project-overview)
2. [System Architecture](#system-architecture)
3. [Project Structure](#project-structure)
4. [Technology Stack](#technology-stack)
5. [Database Schema](#database-schema)
6. [Agent System](#agent-system)
7. [Technical Signals (100+)](#technical-signals)
8. [Installation Guide](#installation-guide)
9. [Configuration](#configuration)
10. [API Endpoints](#api-endpoints)
11. [WebSocket Events](#websocket-events)
12. [Testing Individual Scripts](#testing-individual-scripts)
13. [Deployment](#deployment)
14. [Troubleshooting](#troubleshooting)

---

## 📋 Project Overview

### Purpose
A real-time trading system that:
- Fetches live data from NSE for Nifty 50 and Bank Nifty indices
- Stores tick-by-tick data in database
- Generates dynamic charts for multiple timeframes (1m, 5m, 15m, 30m, 1h, 1d)
- Combines 100+ technical signals from top sources
- Provides real-time BUY/SELL signals with confidence levels
- Calculates stop loss and targets
- Stores historical signals for review
- Displays signals with >50% confidence continuously

### Key Features
- ✅ Real-time NSE data fetching (every 1 minute)
- ✅ Multi-timeframe chart generation
- ✅ 100+ technical indicators combined
- ✅ Automated signal generation
- ✅ Confidence-based filtering (>50%)
- ✅ Historical signal storage
- ✅ Live signal dashboard
- ✅ Separate testable scripts for each indicator
- ✅ WebSocket for real-time updates
- ✅ Last 5 days historical data for testing

### Target Indices
- **Nifty 50**: ^NSEI
- **Bank Nifty**: ^NSEBANK

---

## 🏗️ System Architecture

```
┌─────────────────────────────────────────────────────────────┐
│                     NSE Real-time System                     │
└─────────────────────────────────────────────────────────────┘

┌──────────────┐      ┌──────────────┐      ┌──────────────┐
│  Data Agent  │      │  Chart Agent │      │Signal Agent  │
│  (Fetch NSE) │─────>│(Generate     │─────>│(Analyze &    │
│  Every 1min  │      │ Charts)      │      │ Generate)    │
└──────────────┘      └──────────────┘      └──────────────┘
       │                      │                      │
       │                      │                      │
       v                      v                      v
┌──────────────────────────────────────────────────────────────┐
│                        MongoDB Database                       │
│  ┌─────────────┐  ┌──────────────┐  ┌──────────────────┐   │
│  │ TickData    │  │ ChartData    │  │ TradingSignals   │   │
│  │ Collection  │  │ Collection   │  │ Collection       │   │
│  └─────────────┘  └──────────────┘  └──────────────────┘   │
└──────────────────────────────────────────────────────────────┘
       │                      │                      │
       │                      │                      │
       v                      v                      v
┌──────────────────────────────────────────────────────────────┐
│                      Express.js API Server                    │
│  ┌─────────────┐  ┌──────────────┐  ┌──────────────────┐   │
│  │ REST API    │  │ WebSocket    │  │ Signal Stream    │   │
│  │ Endpoints   │  │ Server       │  │ (Live Updates)   │   │
│  └─────────────┘  └──────────────┘  └──────────────────┘   │
└──────────────────────────────────────────────────────────────┘
       │                      │                      │
       │                      │                      │
       v                      v                      v
┌──────────────────────────────────────────────────────────────┐
│                     React.js Frontend                         │
│  ┌─────────────┐  ┌──────────────┐  ┌──────────────────┐   │
│  │ Live Charts │  │ Signal Panel │  │ Historical       │   │
│  │ (Line Chart)│  │ (Real-time)  │  │ Signals View     │   │
│  └─────────────┘  └──────────────┘  └──────────────────┘   │
└──────────────────────────────────────────────────────────────┘
```

### Data Flow

1. **Data Agent** (runs every 1 minute)
   - Fetches live price from NSE
   - Stores tick data in MongoDB
   - Emits WebSocket event

2. **Chart Agent** (triggered after data storage)
   - Reads tick data from database
   - Aggregates into different timeframes (1m, 5m, 15m, etc.)
   - Generates OHLC candles
   - Stores in ChartData collection

3. **Signal Agent** (triggered after chart update)
   - Reads latest chart data
   - Calculates 100+ technical indicators
   - Combines signals with weighted scoring
   - Generates BUY/SELL recommendation
   - Calculates confidence, stop loss, targets
   - Stores in TradingSignals collection
   - Broadcasts to connected clients

4. **Frontend**
   - Receives real-time data via WebSocket
   - Displays live charts
   - Shows active signals (>50% confidence)
   - Allows viewing historical signals

---

## 📁 Project Structure

```
nse-realtime-trading-system/
│
├── backend/
│   ├── server.js                              # Main Express server
│   ├── package.json                           # Dependencies
│   ├── .env                                   # Environment variables
│   │
│   ├── config/
│   │   ├── database.js                        # MongoDB configuration
│   │   ├── nse-config.js                      # NSE API configuration
│   │   └── constants.js                       # System constants
│   │
│   ├── models/
│   │   ├── TickData.js                        # Tick data schema
│   │   ├── ChartData.js                       # Chart data schema
│   │   ├── TradingSignal.js                   # Trading signal schema
│   │   └── SystemLog.js                       # System logs schema
│   │
│   ├── agents/
│   │   ├── data-agent.js                      # Fetch NSE data every 1min
│   │   ├── chart-agent.js                     # Generate charts
│   │   ├── signal-agent.js                    # Generate signals
│   │   └── agent-manager.js                   # Manage all agents
│   │
│   ├── services/
│   │   ├── nse-fetcher.js                     # NSE data fetching service
│   │   ├── chart-generator.js                 # Chart generation logic
│   │   ├── signal-combiner.js                 # Combine all signals
│   │   └── historical-loader.js               # Load 5 days historical data
│   │
│   ├── indicators/
│   │   ├── index.js                           # Export all indicators
│   │   ├── trend/
│   │   │   ├── ema.js                         # EMA indicator
│   │   │   ├── sma.js                         # SMA indicator
│   │   │   ├── macd.js                        # MACD indicator
│   │   │   ├── adx.js                         # ADX indicator
│   │   │   └── dmi.js                         # DMI indicator
│   │   │
│   │   ├── momentum/
│   │   │   ├── rsi.js                         # RSI indicator
│   │   │   ├── stochastic.js                  # Stochastic oscillator
│   │   │   ├── cci.js                         # CCI indicator
│   │   │   ├── williams-r.js                  # Williams %R
│   │   │   └── roc.js                         # Rate of Change
│   │   │
│   │   ├── volatility/
│   │   │   ├── bollinger-bands.js             # Bollinger Bands
│   │   │   ├── atr.js                         # ATR indicator
│   │   │   ├── keltner-channel.js             # Keltner Channel
│   │   │   └── standard-deviation.js          # Standard Deviation
│   │   │
│   │   ├── volume/
│   │   │   ├── obv.js                         # On Balance Volume
│   │   │   ├── volume-profile.js              # Volume Profile
│   │   │   ├── mfi.js                         # Money Flow Index
│   │   │   └── vwap.js                        # VWAP indicator
│   │   │
│   │   ├── support-resistance/
│   │   │   ├── pivot-points.js                # Pivot points
│   │   │   ├── fibonacci.js                   # Fibonacci levels
│   │   │   ├── sr-detector.js                 # S/R detector
│   │   │   └── price-channels.js              # Price channels
│   │   │
│   │   ├── patterns/
│   │   │   ├── candlestick-patterns.js        # Candlestick patterns
│   │   │   ├── chart-patterns.js              # Chart patterns
│   │   │   └── harmonic-patterns.js           # Harmonic patterns
│   │   │
│   │   ├── oscillators/
│   │   │   ├── awesome-oscillator.js          # Awesome Oscillator
│   │   │   ├── commodity-channel.js           # Commodity Channel
│   │   │   └── detrended-price.js             # Detrended Price
│   │   │
│   │   └── options/
│   │       ├── pcr.js                         # Put-Call Ratio
│   │       ├── max-pain.js                    # Max Pain
│   │       └── implied-volatility.js          # IV analysis
│   │
│   ├── utils/
│   │   ├── timeframe-converter.js             # Convert timeframes
│   │   ├── ohlc-generator.js                  # Generate OHLC from ticks
│   │   ├── logger.js                          # Logging utility
│   │   └── helpers.js                         # Helper functions
│   │
│   ├── routes/
│   │   ├── chart.js                           # Chart endpoints
│   │   ├── signals.js                         # Signal endpoints
│   │   ├── historical.js                      # Historical data endpoints
│   │   └── test.js                            # Test endpoints
│   │
│   ├── websocket/
│   │   ├── socket-server.js                   # WebSocket server
│   │   └── event-emitter.js                   # Event emitter
│   │
│   ├── scripts/
│   │   ├── test-data-agent.js                 # Test data fetching
│   │   ├── test-chart-agent.js                # Test chart generation
│   │   ├── test-signal-agent.js               # Test signal generation
│   │   ├── test-indicator.js                  # Test individual indicator
│   │   ├── load-historical.js                 # Load 5 days data
│   │   └── reset-database.js                  # Reset database
│   │
│   └── tests/
│       ├── indicators/
│       │   ├── ema.test.js                    # Test EMA
│       │   ├── rsi.test.js                    # Test RSI
│       │   └── macd.test.js                   # Test MACD
│       │
│       ├── agents/
│       │   ├── data-agent.test.js
│       │   └── signal-agent.test.js
│       │
│       └── services/
│           └── signal-combiner.test.js
│
├── frontend/
│   ├── public/
│   │   └── index.html
│   │
│   ├── src/
│   │   ├── App.jsx                            # Main app
│   │   ├── App.css
│   │   ├── index.js
│   │   │
│   │   ├── components/
│   │   │   ├── LiveChart/
│   │   │   │   ├── LineChart.jsx              # Real-time line chart
│   │   │   │   ├── TimeframeSelector.jsx     # 1m, 5m, 15m, etc.
│   │   │   │   └── ChartContainer.jsx
│   │   │   │
│   │   │   ├── Signals/
│   │   │   │   ├── LiveSignalPanel.jsx        # Live signals (>50%)
│   │   │   │   ├── SignalCard.jsx             # Individual signal
│   │   │   │   ├── ConfidenceBar.jsx          # Confidence meter
│   │   │   │   └── SignalDetails.jsx          # SL, Target details
│   │   │   │
│   │   │   ├── Historical/
│   │   │   │   ├── HistoricalSignals.jsx      # Past signals
│   │   │   │   ├── SignalHistory.jsx          # Signal timeline
│   │   │   │   └── PerformanceMetrics.jsx     # Signal performance
│   │   │   │
│   │   │   └── Common/
│   │   │       ├── Header.jsx
│   │   │       ├── IndexSelector.jsx          # Nifty 50 / Bank Nifty
│   │   │       └── StatusIndicator.jsx        # Connection status
│   │   │
│   │   ├── services/
│   │   │   ├── api.js                         # REST API client
│   │   │   └── websocket.js                   # WebSocket client
│   │   │
│   │   └── hooks/
│   │       ├── useWebSocket.js                # WebSocket hook
│   │       ├── useLiveData.js                 # Live data hook
│   │       └── useSignals.js                  # Signals hook
│   │
│   └── package.json
│
├── docs/
│   ├── INDICATORS.md                          # All 100+ indicators list
│   ├── SIGNAL_LOGIC.md                        # Signal combination logic
│   ├── NSE_API.md                             # NSE data fetching guide
│   └── TESTING.md                             # Testing guide
│
├── .gitignore
├── README.md
└── docker-compose.yml
```

---

## 📦 Technology Stack

### Backend

#### Core
- **Runtime**: Node.js (v18+)
- **Framework**: Express.js
- **Database**: MongoDB (with Mongoose)
- **Real-time**: Socket.io (WebSocket)
- **Task Scheduling**: node-cron

#### Dependencies
```json
{
  "express": "^4.18.2",
  "mongoose": "^7.6.0",
  "socket.io": "^4.6.0",
  "axios": "^1.6.0",
  "node-cron": "^3.0.3",
  "dotenv": "^16.3.1",
  "cors": "^2.8.5",
  "winston": "^3.11.0",
  "technicalindicators": "^3.1.0",
  "date-fns": "^2.30.0"
}
```

### Frontend

#### Core
- **Framework**: React.js (v18+)
- **Charts**: Recharts / Chart.js / Lightweight Charts
- **Real-time**: Socket.io-client
- **State**: React Context / Zustand

#### Dependencies
```json
{
  "react": "^18.2.0",
  "react-dom": "^18.2.0",
  "socket.io-client": "^4.6.0",
  "axios": "^1.6.0",
  "recharts": "^2.10.0",
  "date-fns": "^2.30.0",
  "lightweight-charts": "^4.1.0"
}
```

### Database
- **Primary**: MongoDB (document storage)
- **Collections**: TickData, ChartData, TradingSignals, SystemLogs

---

## 🗄️ Database Schema

### 1. TickData Collection
Stores every 1-minute tick data from NSE

```javascript
{
  _id: ObjectId,
  symbol: String,              // "NIFTY50" or "BANKNIFTY"
  price: Number,               // Current price
  timestamp: Date,             // Exact time of tick
  volume: Number,              // Volume (if available)
  metadata: {
    open: Number,
    high: Number,
    low: Number,
    change: Number,
    changePercent: Number
  },
  source: String,              // "NSE"
  createdAt: Date,
  updatedAt: Date
}
```

**Indexes:**
- `{ symbol: 1, timestamp: -1 }`
- `{ timestamp: -1 }`

### 2. ChartData Collection
Aggregated OHLC data for different timeframes

```javascript
{
  _id: ObjectId,
  symbol: String,              // "NIFTY50" or "BANKNIFTY"
  timeframe: String,           // "1m", "5m", "15m", "30m", "1h", "1d"
  timestamp: Date,             // Start time of candle
  ohlc: {
    open: Number,
    high: Number,
    low: Number,
    close: Number
  },
  volume: Number,
  metadata: {
    tickCount: Number,         // Number of ticks in this candle
    calculatedFrom: Date,      // First tick timestamp
    calculatedTo: Date         // Last tick timestamp
  },
  createdAt: Date,
  updatedAt: Date
}
```

**Indexes:**
- `{ symbol: 1, timeframe: 1, timestamp: -1 }`
- `{ timestamp: -1 }`

### 3. TradingSignals Collection
Generated trading signals with all indicators

```javascript
{
  _id: ObjectId,
  symbol: String,              // "NIFTY50" or "BANKNIFTY"
  timestamp: Date,             // Signal generation time
  currentPrice: Number,
  
  signal: {
    action: String,            // "BUY", "SELL", "HOLD"
    strength: String,          // "STRONG", "MODERATE", "WEAK"
    confidence: Number,        // 0-100
    confidenceLevel: String    // "HIGH", "MEDIUM", "LOW"
  },
  
  levels: {
    entry: Number,
    stopLoss: Number,
    target1: Number,
    target2: Number,
    target3: Number,
    riskRewardRatio: Number
  },
  
  indicators: {
    trend: {
      ema9: Number,
      ema20: Number,
      ema50: Number,
      macd: { MACD: Number, signal: Number, histogram: Number },
      adx: Number,
      // ... 20+ trend indicators
    },
    momentum: {
      rsi: Number,
      stochastic: { k: Number, d: Number },
      cci: Number,
      williamsR: Number,
      // ... 20+ momentum indicators
    },
    volatility: {
      atr: Number,
      bollingerBands: { upper: Number, middle: Number, lower: Number },
      standardDev: Number,
      // ... 10+ volatility indicators
    },
    volume: {
      obv: Number,
      mfi: Number,
      vwap: Number,
      // ... 10+ volume indicators
    },
    supportResistance: {
      pivotPoints: { pp: Number, r1: Number, r2: Number, s1: Number, s2: Number },
      fibonacci: Array,
      detected: { supports: Array, resistances: Array }
      // ... 10+ S/R indicators
    },
    patterns: {
      candlestickPatterns: Array,
      chartPatterns: Array,
      // ... 10+ pattern indicators
    },
    options: {
      pcr: Number,
      maxPain: Number,
      impliedVolatility: Number
      // ... 5+ options indicators
    }
  },
  
  scoring: {
    trendScore: Number,        // -100 to 100
    momentumScore: Number,     // -100 to 100
    volumeScore: Number,       // -100 to 100
    volatilityScore: Number,   // -100 to 100
    patternScore: Number,      // -100 to 100
    totalScore: Number,        // -500 to 500
    normalizedScore: Number    // 0 to 100 (confidence)
  },
  
  reasoning: [String],         // Array of reasons for this signal
  alerts: [String],            // Important alerts
  
  metadata: {
    timeframe: String,         // Primary timeframe used
    indicatorsUsed: Number,    // Count of indicators
    processingTime: Number     // Time taken to generate (ms)
  },
  
  status: String,              // "ACTIVE", "EXPIRED", "HIT_TARGET", "HIT_SL"
  expiresAt: Date,            // Signal expiry time
  
  performance: {
    outcome: String,           // "WIN", "LOSS", "PENDING"
    entryFilled: Boolean,
    exitPrice: Number,
    profitLoss: Number,
    profitLossPercent: Number
  },
  
  createdAt: Date,
  updatedAt: Date
}
```

**Indexes:**
- `{ symbol: 1, timestamp: -1 }`
- `{ "signal.confidence": -1, timestamp: -1 }`
- `{ status: 1, expiresAt: 1 }`
- `{ createdAt: -1 }`

### 4. SystemLogs Collection
System activity and error logs

```javascript
{
  _id: ObjectId,
  level: String,               // "INFO", "WARN", "ERROR"
  agent: String,               // "data-agent", "chart-agent", "signal-agent"
  message: String,
  data: Object,                // Additional data
  timestamp: Date
}
```

---

## 🤖 Agent System

### Overview
Three independent agents work together to fetch, process, and analyze data:

1. **Data Agent** - Fetches NSE data every 1 minute
2. **Chart Agent** - Generates charts from tick data
3. **Signal Agent** - Analyzes charts and generates signals

### 1. Data Agent

**File**: `backend/agents/data-agent.js`

**Purpose**: Fetch live price data from NSE every 1 minute

**Schedule**: Runs every 1 minute (via cron: `* * * * *`)

**Process Flow**:
```
1. Check if market is open
2. Fetch current price for Nifty 50
3. Fetch current price for Bank Nifty
4. Store both in TickData collection
5. Emit event: 'tick-data-saved'
6. Trigger Chart Agent
```

**Configuration**:
- Fetch interval: 1 minute
- Retry on failure: 3 times
- Timeout: 10 seconds
- Market hours: 9:15 AM - 3:30 PM IST

**Error Handling**:
- Retry failed requests
- Log errors to SystemLogs
- Send alert if consecutive failures > 5

### 2. Chart Agent

**File**: `backend/agents/chart-agent.js`

**Purpose**: Convert tick data into OHLC charts for multiple timeframes

**Trigger**: Runs after Data Agent saves tick data

**Process Flow**:
```
1. Listen for 'tick-data-saved' event
2. Fetch recent tick data from database
3. For each timeframe (1m, 5m, 15m, 30m, 1h, 1d):
   a. Aggregate ticks into OHLC candles
   b. Calculate open, high, low, close
   c. Store in ChartData collection
4. Emit event: 'chart-updated'
5. Trigger Signal Agent
```

**Timeframes Supported**:
- 1 minute (1m) - Direct from ticks
- 5 minutes (5m) - Aggregate 5 ticks
- 15 minutes (15m) - Aggregate 15 ticks
- 30 minutes (30m) - Aggregate 30 ticks
- 1 hour (1h) - Aggregate 60 ticks
- 1 day (1d) - Full day aggregation

**Data Storage**:
- Stores last 1000 candles per timeframe
- Auto-cleanup old data (>30 days)

### 3. Signal Agent

**File**: `backend/agents/signal-agent.js`

**Purpose**: Analyze charts and generate trading signals

**Trigger**: Runs after Chart Agent updates charts

**Process Flow**:
```
1. Listen for 'chart-updated' event
2. Fetch latest chart data for all timeframes
3. Calculate 100+ technical indicators
4. Run indicator scripts in parallel
5. Combine all signals with weighted scoring
6. Generate BUY/SELL recommendation
7. Calculate confidence level (0-100)
8. Calculate entry, stop loss, targets
9. Store in TradingSignals collection (if confidence > 50%)
10. Emit event: 'signal-generated'
11. Broadcast via WebSocket to frontend
```

**Indicator Categories**:
- **Trend** (20 indicators): EMA, SMA, MACD, ADX, DMI, etc.
- **Momentum** (25 indicators): RSI, Stochastic, CCI, ROC, etc.
- **Volatility** (15 indicators): BB, ATR, Keltner, etc.
- **Volume** (15 indicators): OBV, MFI, VWAP, etc.
- **Support/Resistance** (15 indicators): Pivot Points, Fibonacci, etc.
- **Patterns** (20 indicators): Candlestick patterns, Chart patterns
- **Options** (5 indicators): PCR, Max Pain, IV

**Signal Weighting**:
```
Total Score = (Trend × 0.30) + 
              (Momentum × 0.25) + 
              (Volume × 0.15) + 
              (Volatility × 0.10) + 
              (Patterns × 0.10) + 
              (S/R × 0.10)
              
Confidence = (Total Score / Max Score) × 100
```

**Signal Generation Rules**:
- Confidence > 70%: STRONG BUY/SELL
- Confidence 50-70%: MODERATE BUY/SELL
- Confidence < 50%: No signal generated
- Multiple timeframe confirmation required

### Agent Manager

**File**: `backend/agents/agent-manager.js`

**Purpose**: Manage and monitor all agents

**Functions**:
- Start all agents
- Stop all agents
- Restart failed agents
- Monitor agent health
- Log agent activity

**Health Checks**:
- Data Agent: Last successful fetch time
- Chart Agent: Last chart generation time
- Signal Agent: Last signal generation time

**Auto-restart**:
- If agent fails > 3 times, restart
- If agent unresponsive > 5 minutes, restart

---

## 🎯 Technical Signals (100+)

### Signal Categories and Weights

#### 1. Trend Indicators (Weight: 30%)

**Moving Averages (10 indicators)**
- EMA (9, 12, 20, 26, 50, 100, 200)
- SMA (20, 50, 200)
- WMA (Weighted Moving Average)
- DEMA (Double EMA)
- TEMA (Triple EMA)
- HMA (Hull Moving Average)
- KAMA (Kaufman Adaptive MA)

**Trend Strength (10 indicators)**
- MACD (Moving Average Convergence Divergence)
- ADX (Average Directional Index)
- DMI (Directional Movement Index) - +DI, -DI
- Aroon Indicator
- Parabolic SAR
- Supertrend
- Ichimoku Cloud
- Linear Regression
- Zig Zag
- Trend Intensity Index

#### 2. Momentum Indicators (Weight: 25%)

**Oscillators (15 indicators)**
- RSI (Relative Strength Index) - 14, 21 period
- Stochastic (Fast, Slow, Full)
- CCI (Commodity Channel Index)
- Williams %R
- ROC (Rate of Change)
- Momentum Indicator
- TSI (True Strength Index)
- Ultimate Oscillator
- Awesome Oscillator
- Detrended Price Oscillator
- Elder Ray Index
- Know Sure Thing (KST)
- Price Momentum Oscillator
- Chande Momentum Oscillator

**Divergence Detection (5 indicators)**
- RSI Divergence
- MACD Divergence
- Stochastic Divergence
- Volume Divergence
- Price-Volume Divergence

**Strength Indicators (5 indicators)**
- Relative Vigor Index
- Mass Index
- Coppock Curve
- Bull Bear Power
- Force Index

#### 3. Volatility Indicators (Weight: 10%)

**Bands & Channels (10 indicators)**
- Bollinger Bands (20, 2) (20, 3)
- Keltner Channel
- Donchian Channel
- Price Channel
- Envelope
- Moving Average Envelope
- Standard Deviation Channel
- True Range
- Average True Range (ATR) - 14 period
- Chandelier Exit

**Volatility Measures (5 indicators)**
- Historical Volatility
- Realized Volatility
- ATR Bands
- Volatility Index
- Standard Deviation

#### 4. Volume Indicators (Weight: 15%)

**Volume Analysis (15 indicators)**
- On Balance Volume (OBV)
- Money Flow Index (MFI)
- Volume Weighted Average Price (VWAP)
- Accumulation/Distribution
- Chaikin Money Flow
- Volume Price Trend
- Ease of Movement
- Negative Volume Index
- Positive Volume Index
- Volume Oscillator
- Volume Rate of Change
- Klinger Oscillator
- Elder Force Index
- Chaikin Oscillator
- Money Flow Multiplier

#### 5. Support & Resistance (Weight: 10%)

**Levels (15 indicators)**
- Pivot Points (Standard, Fibonacci, Woodie, Camarilla, DeMark)
- Fibonacci Retracement (23.6%, 38.2%, 50%, 61.8%, 78.6%)
- Fibonacci Extension (127.2%, 161.8%, 200%, 261.8%)
- Fibonacci Fans
- Gann Levels
- Murray Math Lines
- Price Channels
- Support/Resistance Detection Algorithm
- Horizontal Levels
- Dynamic S/R
- Order Block Detection
- Supply/Demand Zones
- Fair Value Gaps
- Swing High/Low
- Psychological Levels (Round Numbers)

#### 6. Chart Patterns (Weight: 10%)

**Candlestick Patterns (20 indicators)**
- Doji (Standard, Dragonfly, Gravestone, Long-legged)
- Hammer / Hanging Man
- Shooting Star / Inverted Hammer
- Engulfing (Bullish/Bearish)
- Harami (Bullish/Bearish)
- Piercing Pattern / Dark Cloud Cover
- Morning Star / Evening Star
- Three White Soldiers / Three Black Crows
- Rising Three Methods / Falling Three Methods
- Tweezer Top / Tweezer Bottom
- Marubozu (Bullish/Bearish)
- Spinning Top
- Belt Hold
- Breakaway
- Concealing Baby Swallow
- Kicking
- Ladder Bottom / Top
- Mat Hold
- Stick Sandwich
- Tasuki Gap

**Chart Patterns (10 indicators)**
- Head and Shoulders / Inverse H&S
- Double Top / Double Bottom
- Triple Top / Triple Bottom
- Cup and Handle / Inverted Cup and Handle
- Ascending/Descending Triangle
- Symmetrical Triangle
- Wedge (Rising/Falling)
- Flag (Bullish/Bearish)
- Pennant
- Rectangle (Continuation/Reversal)
- Rounding Bottom / Top
- Diamond Formation

**Harmonic Patterns (5 indicators)**
- Gartley Pattern
- Butterfly Pattern
- Bat Pattern
- Crab Pattern
- Shark Pattern

#### 7. Options Analysis (Weight: 5% - when available)

**Options Indicators (5 indicators)**
- Put-Call Ratio (PCR)
- Max Pain Level
- Implied Volatility (IV)
- Open Interest Analysis
- Options Greeks (Delta, Gamma, Theta, Vega)

---

### Signal Combination Logic

**Step 1: Calculate Individual Scores**
Each indicator generates a score between -100 (Strong Sell) and +100 (Strong Buy)

**Step 2: Category Aggregation**
```
Trend Score = Average of all trend indicators
Momentum Score = Average of all momentum indicators
Volume Score = Average of all volume indicators
... and so on
```

**Step 3: Weighted Combination**
```
Total Score = (Trend × 0.30) + 
              (Momentum × 0.25) + 
              (Volume × 0.15) + 
              (Volatility × 0.10) + 
              (Patterns × 0.10) + 
              (S/R × 0.10)
```

**Step 4: Normalize to Confidence**
```
Confidence = ((Total Score + MaxNegativeScore) / (MaxPositiveScore + MaxNegativeScore)) × 100

Where:
- MaxPositiveScore = Sum of all positive weights
- MaxNegativeScore = Sum of all negative weights
```

**Step 5: Generate Signal**
```
If Confidence >= 70: STRONG BUY/SELL
Else If Confidence >= 50: MODERATE BUY/SELL  
Else: NO SIGNAL
```

**Step 6: Calculate Levels**
```
Entry = Current Price
Stop Loss = Entry - (ATR × 2) for BUY
           Entry + (ATR × 2) for SELL
           
Target 1 = Entry + (ATR × 1.5) for BUY
Target 2 = Entry + (ATR × 3) for BUY
Target 3 = Entry + (ATR × 5) for BUY

Risk:Reward = (Target - Entry) / (Entry - StopLoss)
```

---

## 🚀 Installation Guide

### Prerequisites
- Node.js v18+
- MongoDB 6.0+
- npm or yarn
- Git

### Step 1: Clone Repository
```bash
git clone <repository-url>
cd nse-realtime-trading-system
```

### Step 2: Backend Setup

```bash
cd backend
npm install
```

**Install all dependencies**:
```bash
npm install express mongoose socket.io axios node-cron dotenv cors winston technicalindicators date-fns cheerio
```

**Dev dependencies**:
```bash
npm install --save-dev nodemon jest supertest
```

### Step 3: Database Setup

**Install MongoDB**:
```bash
# Ubuntu/Debian
sudo apt-get install mongodb

# macOS
brew install mongodb-community

# Windows
Download from https://www.mongodb.com/try/download/community
```

**Start MongoDB**:
```bash
mongod --dbpath /path/to/data/directory
```

**Create Database**:
```bash
mongo
use nse_trading
```

### Step 4: Frontend Setup

```bash
cd frontend
npm install
```

**Install dependencies**:
```bash
npm install react react-dom socket.io-client axios recharts date-fns lightweight-charts
```

### Step 5: Configuration

Create `backend/.env`:
```env
# Server
PORT=5000
NODE_ENV=development

# Database
MONGODB_URI=mongodb://localhost:27017/nse_trading

# NSE Configuration
NSE_BASE_URL=https://www.nseindia.com
NSE_TIMEOUT=10000
NSE_RETRY_COUNT=3

# Market Hours (IST)
MARKET_OPEN_HOUR=9
MARKET_OPEN_MINUTE=15
MARKET_CLOSE_HOUR=15
MARKET_CLOSE_MINUTE=30

# Agents
DATA_AGENT_INTERVAL=60000
CHART_AGENT_ENABLED=true
SIGNAL_AGENT_ENABLED=true

# WebSocket
WS_PORT=5001

# Signal Configuration
MIN_CONFIDENCE=50
SIGNAL_EXPIRY_HOURS=4

# Historical Data
HISTORICAL_DAYS=5

# Logging
LOG_LEVEL=info
```

Create `frontend/.env`:
```env
REACT_APP_API_URL=http://localhost:5000
REACT_APP_WS_URL=ws://localhost:5001
```

### Step 6: Load Historical Data (for testing)

```bash
cd backend
node scripts/load-historical.js
```

This will:
- Fetch last 5 days of data
- Store in database
- Generate charts for all timeframes
- Generate initial signals

### Step 7: Start System

**Terminal 1 - Backend**:
```bash
cd backend
npm run dev
```

**Terminal 2 - Frontend**:
```bash
cd frontend
npm start
```

**Terminal 3 - Agents**:
```bash
cd backend
node agents/agent-manager.js
```

### Step 8: Verify Installation

1. Open browser: `http://localhost:3000`
2. Check if data is being fetched (every 1 minute)
3. Check if charts are updating
4. Check if signals are being generated
5. Verify WebSocket connection in browser console

---

## ⚙️ Configuration

### System Configuration

**File**: `backend/config/constants.js`

```javascript
module.exports = {
  // Indices
  INDICES: {
    NIFTY50: 'NIFTY50',
    BANKNIFTY: 'BANKNIFTY'
  },
  
  // NSE Symbols
  NSE_SYMBOLS: {
    NIFTY50: '^NSEI',
    BANKNIFTY: '^NSEBANK'
  },
  
  // Timeframes
  TIMEFRAMES: {
    ONE_MIN: '1m',
    FIVE_MIN: '5m',
    FIFTEEN_MIN: '15m',
    THIRTY_MIN: '30m',
    ONE_HOUR: '1h',
    ONE_DAY: '1d'
  },
  
  // Signal Thresholds
  SIGNAL_THRESHOLDS: {
    STRONG_BUY: 70,
    BUY: 50,
    HOLD: 50,
    SELL: 50,
    STRONG_SELL: 70
  },
  
  // Indicator Weights
  INDICATOR_WEIGHTS: {
    TREND: 0.30,
    MOMENTUM: 0.25,
    VOLUME: 0.15,
    VOLATILITY: 0.10,
    PATTERNS: 0.10,
    SUPPORT_RESISTANCE: 0.10,
    OPTIONS: 0.05
  },
  
  // Data Retention
  DATA_RETENTION: {
    TICK_DATA_DAYS: 7,
    CHART_DATA_DAYS: 30,
    SIGNAL_DATA_DAYS: 90
  }
};
```

### Agent Configuration

**Data Agent Settings**:
- Fetch interval: 1 minute (adjustable)
- Retry attempts: 3
- Timeout: 10 seconds
- Market hours check: Enabled

**Chart Agent Settings**:
- Trigger: On tick data save
- Timeframes: All (1m, 5m, 15m, 30m, 1h, 1d)
- Batch size: 1000 candles
- Auto-cleanup: Enabled

**Signal Agent Settings**:
- Trigger: On chart update
- Min confidence: 50%
- Timeframe priority: 15m (primary)
- Multi-timeframe analysis: Enabled
- Indicator count: 100+

---

## 🌐 API Endpoints

### Chart Endpoints

#### GET /api/charts/:symbol/:timeframe
Get chart data for specific symbol and timeframe

**Parameters**:
- `symbol`: NIFTY50 or BANKNIFTY
- `timeframe`: 1m, 5m, 15m, 30m, 1h, 1d

**Query Parameters**:
- `limit`: Number of candles (default: 100, max: 1000)
- `from`: Start date (ISO format)
- `to`: End date (ISO format)

**Response**:
```json
{
  "success": true,
  "data": {
    "symbol": "NIFTY50",
    "timeframe": "5m",
    "candles": [
      {
        "timestamp": "2024-01-15T09:15:00Z",
        "open": 21500,
        "high": 21550,
        "low": 21480,
        "close": 21520,
        "volume": 1000000
      }
    ],
    "count": 100
  }
}
```

#### GET /api/charts/:symbol/all-timeframes
Get chart data for all timeframes

**Response**:
```json
{
  "success": true,
  "data": {
    "1m": [...],
    "5m": [...],
    "15m": [...],
    "30m": [...],
    "1h": [...],
    "1d": [...]
  }
}
```

### Signal Endpoints

#### GET /api/signals/live
Get all active live signals (confidence > 50%)

**Query Parameters**:
- `symbol`: Filter by symbol (optional)
- `minConfidence`: Minimum confidence (default: 50)

**Response**:
```json
{
  "success": true,
  "data": [
    {
      "_id": "...",
      "symbol": "NIFTY50",
      "timestamp": "2024-01-15T10:30:00Z",
      "currentPrice": 21520,
      "signal": {
        "action": "BUY",
        "strength": "STRONG",
        "confidence": 75,
        "confidenceLevel": "HIGH"
      },
      "levels": {
        "entry": 21520,
        "stopLoss": 21450,
        "target1": 21600,
        "target2": 21700,
        "target3": 21850
      },
      "reasoning": [
        "Strong uptrend on 15m timeframe",
        "RSI at 65, bullish momentum",
        "MACD bullish crossover"
      ]
    }
  ]
}
```

#### GET /api/signals/historical
Get historical signals

**Query Parameters**:
- `symbol`: Filter by symbol
- `from`: Start date
- `to`: End date
- `limit`: Number of signals (default: 50)
- `status`: ACTIVE, EXPIRED, HIT_TARGET, HIT_SL

**Response**:
```json
{
  "success": true,
  "data": [...],
  "pagination": {
    "total": 500,
    "page": 1,
    "pages": 10
  }
}
```

#### GET /api/signals/:id
Get specific signal details

**Response**:
```json
{
  "success": true,
  "data": {
    // Full signal object with all indicators
  }
}
```

#### GET /api/signals/statistics
Get signal performance statistics

**Response**:
```json
{
  "success": true,
  "data": {
    "totalSignals": 1000,
    "winRate": 65.5,
    "avgProfit": 1.2,
    "avgLoss": -0.8,
    "bySymbol": {
      "NIFTY50": {
        "total": 600,
        "winRate": 68
      },
      "BANKNIFTY": {
        "total": 400,
        "winRate": 62
      }
    }
  }
}
```

### Historical Data Endpoints

#### GET /api/historical/load
Manually trigger historical data load

**Query Parameters**:
- `days`: Number of days (default: 5)
- `symbol`: Specific symbol (optional)

**Response**:
```json
{
  "success": true,
  "message": "Historical data load started",
  "jobId": "..."
}
```

#### GET /api/historical/status/:jobId
Check historical data load status

**Response**:
```json
{
  "success": true,
  "data": {
    "status": "COMPLETED",
    "progress": 100,
    "recordsLoaded": 5000,
    "errors": []
  }
}
```

### Test Endpoints

#### GET /api/test/data-agent
Test data agent manually

#### GET /api/test/chart-agent
Test chart agent

#### GET /api/test/signal-agent
Test signal agent

#### GET /api/test/indicator/:name
Test specific indicator

**Parameters**:
- `name`: Indicator name (e.g., rsi, macd, ema)

---

## 🔌 WebSocket Events

### Client → Server Events

#### `subscribe`
Subscribe to real-time updates

```javascript
socket.emit('subscribe', {
  symbols: ['NIFTY50', 'BANKNIFTY'],
  events: ['tick', 'chart', 'signal']
});
```

#### `unsubscribe`
Unsubscribe from updates

```javascript
socket.emit('unsubscribe', {
  symbols: ['NIFTY50']
});
```

### Server → Client Events

#### `tick-update`
Real-time tick data (every 1 minute)

```javascript
socket.on('tick-update', (data) => {
  console.log(data);
  // {
  //   symbol: 'NIFTY50',
  //   price: 21520,
  //   timestamp: '2024-01-15T10:30:00Z',
  //   change: 50,
  //   changePercent: 0.23
  // }
});
```

#### `chart-update`
Chart data updated

```javascript
socket.on('chart-update', (data) => {
  console.log(data);
  // {
  //   symbol: 'NIFTY50',
  //   timeframe: '5m',
  //   candle: { open, high, low, close, volume }
  // }
});
```

#### `signal-generated`
New signal generated

```javascript
socket.on('signal-generated', (data) => {
  console.log(data);
  // Full signal object
});
```

#### `signal-updated`
Existing signal updated (e.g., hit target/SL)

```javascript
socket.on('signal-updated', (data) => {
  console.log(data);
  // { signalId, status, outcome, profitLoss }
});
```

#### `connection-status`
Connection status updates

```javascript
socket.on('connection-status', (data) => {
  console.log(data);
  // { status: 'connected', timestamp }
});
```

#### `error`
Error messages

```javascript
socket.on('error', (data) => {
  console.error(data);
  // { message, code, timestamp }
});
```

---

## 🧪 Testing Individual Scripts

### Test Data Agent

**File**: `backend/scripts/test-data-agent.js`

**Purpose**: Test NSE data fetching independently

**Run**:
```bash
node scripts/test-data-agent.js
```

**Output**:
```
✓ Fetching Nifty 50 data...
✓ Current Price: 21520
✓ Data saved to database

✓ Fetching Bank Nifty data...
✓ Current Price: 45230
✓ Data saved to database

✓ Test completed successfully
```

### Test Chart Agent

**File**: `backend/scripts/test-chart-agent.js`

**Purpose**: Test chart generation from tick data

**Run**:
```bash
node scripts/test-chart-agent.js
```

**Options**:
```bash
node scripts/test-chart-agent.js --symbol=NIFTY50 --timeframe=5m
```

**Output**:
```
✓ Fetching tick data...
✓ Found 300 ticks
✓ Generating 5m candles...
✓ Generated 60 candles
✓ Saved to database

Sample candle:
{
  timestamp: '2024-01-15T10:00:00Z',
  open: 21500,
  high: 21550,
  low: 21480,
  close: 21520,
  volume: 500000
}
```

### Test Signal Agent

**File**: `backend/scripts/test-signal-agent.js`

**Purpose**: Test signal generation

**Run**:
```bash
node scripts/test-signal-agent.js
```

**Options**:
```bash
node scripts/test-signal-agent.js --symbol=BANKNIFTY
```

**Output**:
```
✓ Fetching chart data...
✓ Calculating indicators...
✓ Running 105 indicators...
✓ Combining signals...
✓ Generating recommendation...

Signal Generated:
{
  symbol: 'NIFTY50',
  action: 'BUY',
  confidence: 75,
  entry: 21520,
  stopLoss: 21450,
  target1: 21600,
  target2: 21700,
  reasoning: [...]
}

✓ Signal saved to database
```

### Test Individual Indicator

**File**: `backend/scripts/test-indicator.js`

**Purpose**: Test a specific indicator independently

**Run**:
```bash
node scripts/test-indicator.js --indicator=rsi
```

**Available Indicators**:
- `rsi` - RSI indicator
- `macd` - MACD indicator
- `ema` - EMA indicator
- `bollinger` - Bollinger Bands
- `atr` - ATR indicator
- ... (all 100+ indicators)

**Output**:
```
Testing RSI Indicator
─────────────────────

✓ Fetching chart data...
✓ Calculating RSI...

RSI Results:
- Period: 14
- Current RSI: 65.32
- Status: Bullish (above 50)
- Signal: BUY (not overbought)

Historical RSI values:
[62.5, 63.2, 64.1, 65.32]

✓ Test completed
```

### Run All Tests

**Run**:
```bash
npm test
```

**Run specific test suite**:
```bash
npm test -- indicators
npm test -- agents
npm test -- services
```

---

## 🚀 Deployment

### Production Deployment

#### Backend Deployment (Render/Railway)

**1. Prepare for deployment**:

Create `backend/package.json` scripts:
```json
{
  "scripts": {
    "start": "node server.js",
    "agents": "node agents/agent-manager.js",
    "dev": "nodemon server.js"
  }
}
```

**2. Deploy to Render**:
- Create account on Render.com
- New Web Service
- Connect GitHub
- Build Command: `npm install`
- Start Command: `npm start`
- Add environment variables

**3. Deploy Agents separately**:
- Create Background Worker on Render
- Start Command: `npm run agents`
- Same environment variables

#### Frontend Deployment (Vercel)

```bash
cd frontend
npm run build
vercel --prod
```

Add environment variables in Vercel dashboard.

#### Database (MongoDB Atlas)

1. Create free cluster on MongoDB Atlas
2. Whitelist IP addresses
3. Update connection string in `.env`
4. Create database indexes

### Docker Deployment

**docker-compose.yml**:
```yaml
version: '3.8'

services:
  mongodb:
    image: mongo:6.0
    volumes:
      - mongodb_data:/data/db
    ports:
      - "27017:27017"
    
  backend:
    build: ./backend
    ports:
      - "5000:5000"
      - "5001:5001"
    environment:
      - MONGODB_URI=mongodb://mongodb:27017/nse_trading
    depends_on:
      - mongodb
    
  agents:
    build: ./backend
    command: node agents/agent-manager.js
    environment:
      - MONGODB_URI=mongodb://mongodb:27017/nse_trading
    depends_on:
      - mongodb
      - backend
    
  frontend:
    build: ./frontend
    ports:
      - "3000:3000"
    depends_on:
      - backend

volumes:
  mongodb_data:
```

**Deploy**:
```bash
docker-compose up -d
```

---

## 🐛 Troubleshooting

### Common Issues

#### Issue 1: Data Agent Not Fetching
**Symptoms**: No tick data in database

**Troubleshooting**:
1. Check if market is open
2. Test manually: `node scripts/test-data-agent.js`
3. Check NSE website accessibility
4. Verify environment variables
5. Check agent logs

**Solution**:
```bash
# Check logs
tail -f backend/logs/data-agent.log

# Restart agent
pm2 restart data-agent
```

#### Issue 2: Charts Not Updating
**Symptoms**: Charts show old data

**Troubleshooting**:
1. Check if tick data is being saved
2. Test chart agent: `node scripts/test-chart-agent.js`
3. Verify database connection
4. Check for errors in logs

#### Issue 3: Signals Not Generating
**Symptoms**: No signals in database or frontend

**Troubleshooting**:
1. Check confidence threshold (default: 50%)
2. Test signal agent: `node scripts/test-signal-agent.js`
3. Verify all indicators are working
4. Check for calculation errors

**Solution**:
```bash
# Test individual indicator
node scripts/test-indicator.js --indicator=rsi

# Lower confidence threshold temporarily
# In .env: MIN_CONFIDENCE=30
```

#### Issue 4: WebSocket Connection Failed
**Symptoms**: Frontend not receiving real-time updates

**Troubleshooting**:
1. Check WebSocket port (5001)
2. Verify CORS settings
3. Check browser console
4. Test connection manually

#### Issue 5: Database Full
**Symptoms**: Disk space errors

**Solution**:
1. Run cleanup script
2. Reduce data retention period
3. Increase disk space

```bash
node scripts/cleanup-database.js --days=7
```

#### Issue 6: High CPU Usage
**Symptoms**: System slow, high resource usage

**Causes**:
- Too many indicators running
- Large dataset processing
- Memory leaks

**Solution**:
1. Reduce indicator count
2. Optimize calculation loops
3. Add caching
4. Increase server resources

---

## 📊 Performance Optimization

### Database Optimization
- Add appropriate indexes
- Use aggregation pipelines
- Implement data archiving
- Regular cleanup

### Agent Optimization
- Parallel processing for indicators
- Caching frequently used data
- Batch database operations
- Optimize timeframe conversions

### Frontend Optimization
- Virtual scrolling for large datasets
- Chart data sampling
- WebSocket message throttling
- Component memoization

---

## 📝 Maintenance

### Daily Tasks
- Monitor agent health
- Check error logs
- Verify signal generation
- Review system performance

### Weekly Tasks
- Database backup
- Clean old logs
- Update market holiday calendar
- Review signal accuracy

### Monthly Tasks
- Update technical indicators
- Optimize database
- Security updates
- Performance review

---

## 📄 License

MIT License

---

## 🙏 Acknowledgments

- NSE India for market data
- Technical Indicators library
- MongoDB team
- Socket.io team
- React community

---

**Built for traders, by traders** 📈

**Version**: 1.0.0  
**Last Updated**: January 2024