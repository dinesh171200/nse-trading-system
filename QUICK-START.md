# NSE Trading System - Quick Start Guide

## Current Setup Status

✅ Node.js v20.11.0 - Installed
✅ Backend Dependencies - Installed
✅ Frontend Dependencies - Installed
✅ Environment Files - Created
❌ MongoDB - **NEEDS INSTALLATION**

## Installation Steps

### Step 1: Install MongoDB (15 minutes)

Read the detailed guide: **MONGODB-SETUP.md**

**Quick Install:**
1. Download: https://www.mongodb.com/try/download/community
2. Install with "Complete" setup + "Install as Service" option
3. Verify: Open Command Prompt (Admin) → `net start MongoDB`

### Step 2: Run the System

#### Option A: Using Batch Scripts (Easiest)

**Double-click:** `start-all.bat`

This opens 2 terminal windows:
- Backend Server (http://localhost:5000)
- Frontend Server (http://localhost:3000)

#### Option B: Manual Start (2 terminals)

**Terminal 1 - Backend:**
```bash
cd backend
npm start
```

**Terminal 2 - Frontend:**
```bash
cd frontend
npm start
```

### Step 3: Access the Application

The frontend will automatically open in your browser:
- **Frontend:** http://localhost:3000
- **Backend API:** http://localhost:5000
- **WebSocket:** ws://localhost:5001

## What You'll See

### Frontend Features
- **Live Charts**: Real-time OHLC charts for Nifty 50 and Bank Nifty
- **Trading Signals**: BUY/SELL signals with confidence levels
- **Multiple Timeframes**: 1m, 5m, 15m, 30m, 1h, 1d
- **Indicator Details**: View all 115+ technical indicators
- **Historical Signals**: Past trading signals with performance

### Market Hours (IST)
- **Trading Hours:** 9:15 AM - 3:30 PM, Monday-Friday
- **Data Collection:** Automatic every 1 minute during market hours
- **Outside Market Hours:** Can test with historical data

## Testing Commands

### Test Individual Components

```bash
cd backend

# Test data fetching from NSE
npm run test-data-agent

# Test chart generation
npm run test-chart-agent

# Test signal generation with indicators
npm run test-signal-agent

# Load 5 days of historical data (for testing)
npm run load-historical
```

### Test API Endpoints

Open in browser or use curl:
```bash
# Health check
http://localhost:5000/api/health

# Get chart data (5-minute OHLC for Nifty 50)
http://localhost:5000/api/charts/NIFTY50/5m

# Get live trading signals
http://localhost:5000/api/signals/live

# Get signal statistics
http://localhost:5000/api/signals/statistics
```

## Running the Trading Agents

The agents run automatically with the backend server during market hours.

To run agents manually in a third terminal:
```bash
cd backend
npm run agents
```

**Three Agents:**
1. **Data Agent**: Fetches NSE data every 1 minute
2. **Chart Agent**: Converts tick data to OHLC candles
3. **Signal Agent**: Analyzes 115+ indicators and generates signals

## Project Structure

```
nse-trading-system/
├── backend/               # Node.js + Express API
│   ├── server.js         # Main server
│   ├── agents/           # Data, Chart, Signal agents
│   ├── indicators/       # 115+ technical indicators
│   ├── models/           # MongoDB schemas
│   ├── routes/           # API endpoints
│   ├── services/         # Business logic
│   └── utils/            # Helper functions
├── frontend/             # React application
│   └── src/
│       ├── components/   # UI components
│       └── services/     # API + WebSocket clients
└── docs/                 # Documentation
```

## Environment Configuration

### Backend (.env)
```env
PORT=5000
MONGODB_URI=mongodb://localhost:27017/nse_trading
MARKET_OPEN_HOUR=9
MARKET_OPEN_MINUTE=15
MARKET_CLOSE_HOUR=15
MARKET_CLOSE_MINUTE=30
MIN_CONFIDENCE=50
```

### Frontend (.env)
```env
REACT_APP_API_URL=http://localhost:5000
REACT_APP_WS_URL=ws://localhost:5001
```

## Troubleshooting

### MongoDB Connection Error
```
Error: connect ECONNREFUSED 127.0.0.1:27017
```
**Solution:** MongoDB is not running
- Run as Admin: `net start MongoDB`
- Or check services: Win+R → `services.msc` → MongoDB

### Port Already in Use
```
Error: listen EADDRINUSE: address already in use :::5000
```
**Solution:** Another process is using the port
- Change port in backend/.env: `PORT=5001`
- Or kill the process: `netstat -ano | findstr :5000`

### Frontend Not Opening
**Solution:**
- Manually open: http://localhost:3000
- Check if backend is running first
- Verify .env files exist

### No Trading Signals Showing
**Possible Reasons:**
- Outside market hours (9:15 AM - 3:30 PM IST)
- No data in database yet (agents need time to collect)
- Confidence below 50% (signals filtered)

**Solution:**
- Load historical data: `npm run load-historical`
- Wait for agents to collect real-time data
- Lower MIN_CONFIDENCE in backend/.env

## Next Steps

1. ✅ **Install MongoDB** (see MONGODB-SETUP.md)
2. ✅ **Start the system** (double-click start-all.bat)
3. ✅ **Open browser** to http://localhost:3000
4. 📊 **Explore the UI** - view charts and signals
5. 🧪 **Test during market hours** for real-time data
6. 📈 **Load historical data** for testing anytime

## Additional Resources

- **Complete Documentation:** nse_realtime_system.md
- **MongoDB Setup:** MONGODB-SETUP.md
- **Local Setup Guide:** START-LOCAL.md
- **Deployment Guide:** DEPLOYMENT.md

## Support

- Check logs in backend console for errors
- MongoDB data: Use MongoDB Compass to inspect
- API testing: Use Postman or browser for endpoints

## Stop the System

- **Batch Scripts:** Close the terminal windows
- **Manual:** Press Ctrl+C in each terminal

---

**Ready to start?**
1. Install MongoDB (if not done)
2. Double-click `start-all.bat`
3. Open http://localhost:3000

Happy Trading! 📈
