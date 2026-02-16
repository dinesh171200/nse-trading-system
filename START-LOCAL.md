# Running NSE Trading System Locally

## Prerequisites Checklist

✅ Node.js v20.11.0 - **INSTALLED**
❌ MongoDB - **NEEDS INSTALLATION**

## Step 1: Install MongoDB

### Option A: MongoDB Community Edition (Recommended)
1. Download MongoDB from: https://www.mongodb.com/try/download/community
2. Choose Windows version and install
3. During installation, select "Install MongoDB as a Service"
4. Default settings will start MongoDB on port 27017

### Option B: MongoDB with Docker (Alternative)
```bash
docker run -d -p 27017:27017 --name mongodb mongo:latest
```

### Verify MongoDB is running:
```bash
mongosh --version
# or
mongo --version
```

## Step 2: Install Dependencies

### Backend Dependencies
```bash
cd backend
npm install
```

### Frontend Dependencies
```bash
cd frontend
npm install
```

## Step 3: Environment Configuration

✅ Backend `.env` - **CREATED** (C:\Users\dinesh181.kumar\Desktop\project\nse-trading-system\backend\.env)
✅ Frontend `.env` - **CREATED** (C:\Users\dinesh181.kumar\Desktop\project\nse-trading-system\frontend\.env)

Default configuration:
- Backend API: http://localhost:5000
- WebSocket: ws://localhost:5001
- MongoDB: mongodb://localhost:27017/nse_trading

## Step 4: Start the System

### Terminal 1 - Backend Server
```bash
cd backend
npm start
```

### Terminal 2 - Frontend Server
```bash
cd frontend
npm start
```

The frontend will automatically open in your browser at http://localhost:3000

## Step 5: Optional - Start Trading Agents

In a third terminal (only during market hours 9:15 AM - 3:30 PM IST):
```bash
cd backend
npm run agents
```

## Testing the System

### Test Data Fetching
```bash
cd backend
npm run test-data-agent
```

### Test Signal Generation
```bash
cd backend
npm run test-signal-agent
```

### Load Historical Data (for testing)
```bash
cd backend
npm run load-historical
```

## Troubleshooting

### MongoDB Connection Error
- Ensure MongoDB service is running: `net start MongoDB` (Windows)
- Check if port 27017 is available
- Verify MongoDB URI in backend/.env

### Port Already in Use
- Backend port 5000: Change `PORT` in backend/.env
- Frontend port 3000: Set `PORT=3001` in frontend/.env
- WebSocket port 5001: Change `WS_PORT` in backend/.env

### Dependencies Issues
```bash
# Clear and reinstall
rm -rf node_modules package-lock.json
npm install
```

## Quick Start Commands

```bash
# In project root directory

# Start backend
cd backend && npm start

# In another terminal, start frontend
cd frontend && npm start
```

## Market Hours (IST)
- Trading: 9:15 AM - 3:30 PM
- Data agents run automatically during market hours
- Outside market hours, you can test with historical data

## API Endpoints

Once running, test these:
- http://localhost:5000/api/health - Health check
- http://localhost:5000/api/charts/NIFTY50/5m - Chart data
- http://localhost:5000/api/signals/live - Live signals

## Notes

- System fetches real data from NSE during market hours
- Outside market hours, use historical data for testing
- WebSocket connections provide real-time updates
- Minimum 50% confidence required for signals to display
