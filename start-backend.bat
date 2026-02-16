@echo off
echo ========================================
echo NSE Trading System - Backend Server
echo ========================================
echo.
echo Checking MongoDB...
net start MongoDB >nul 2>&1
if %errorlevel% equ 0 (
    echo MongoDB is running
) else (
    echo MongoDB service not found. Trying to start anyway...
)
echo.
echo Starting Backend Server on http://localhost:5000
echo WebSocket Server on ws://localhost:5001
echo.
echo Press Ctrl+C to stop the server
echo.
cd backend
npm start
