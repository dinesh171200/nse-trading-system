# MongoDB Installation Guide for Windows

## Quick Install (Recommended)

### Step 1: Download MongoDB
1. Go to: https://www.mongodb.com/try/download/community
2. Select:
   - Version: 7.0 or later
   - Platform: Windows
   - Package: MSI
3. Click "Download"

### Step 2: Install MongoDB
1. Run the downloaded `.msi` file
2. Choose "Complete" installation
3. **IMPORTANT**: Check "Install MongoDB as a Service"
4. **IMPORTANT**: Check "Install MongoDB Compass" (GUI tool, optional but helpful)
5. Click "Next" and complete installation

### Step 3: Verify Installation
Open Command Prompt as Administrator and run:
```cmd
mongod --version
```

You should see version information if installed correctly.

### Step 4: Start MongoDB Service
```cmd
net start MongoDB
```

If you see "Access is denied", run Command Prompt as Administrator.

## Alternative: MongoDB with Docker

If you have Docker Desktop installed:

```bash
# Pull MongoDB image
docker pull mongo:latest

# Start MongoDB container
docker run -d -p 27017:27017 --name mongodb-nse mongo:latest

# Verify it's running
docker ps
```

## Verify MongoDB is Working

### Option 1: Using mongosh (MongoDB Shell)
```cmd
mongosh
```

You should see:
```
Current Mongosh Log ID: [some-id]
Connecting to: mongodb://127.0.0.1:27017
```

Type `exit` to quit.

### Option 2: Using MongoDB Compass
1. Open MongoDB Compass (installed with MongoDB)
2. Connect to: `mongodb://localhost:27017`
3. You should see a successful connection

## Troubleshooting

### "MongoDB service not found"
- MongoDB was not installed as a service
- Reinstall and check "Install as Service" option
- Or start manually: `mongod --dbpath C:\data\db`

### "Access is denied" when starting service
- Run Command Prompt as Administrator
- Right-click CMD → "Run as administrator"
- Then: `net start MongoDB`

### Port 27017 already in use
- Another MongoDB instance is running
- Check with: `netstat -ano | findstr :27017`
- Stop existing instance or change port in backend/.env

### Can't connect to MongoDB
- Check if service is running: `net start MongoDB`
- Check Windows Services: Win+R → `services.msc` → find "MongoDB"
- Verify it's set to "Running"

## After MongoDB is Installed

1. Keep MongoDB service running (it will auto-start with Windows)
2. Return to the main project directory
3. Run the startup scripts to launch the trading system

## MongoDB Compass (Optional GUI)

If installed, MongoDB Compass is useful for:
- Viewing database collections
- Browsing trading signals
- Checking tick data
- Debugging data issues

Connect to: `mongodb://localhost:27017/nse_trading`

## Default Settings

- Host: localhost
- Port: 27017
- Database: nse_trading (will be created automatically)
- No authentication required for local development
