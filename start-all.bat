@echo off
echo ========================================
echo NSE Trading System - Complete Startup
echo ========================================
echo.
echo This will start:
echo 1. Backend Server (http://localhost:5000)
echo 2. Frontend Server (http://localhost:3000)
echo.
echo Opening 2 terminal windows...
echo.

start "NSE Trading Backend" cmd /k "cd /d %~dp0backend && echo Backend Server Starting... && npm start"
timeout /t 3 /nobreak >nul
start "NSE Trading Frontend" cmd /k "cd /d %~dp0frontend && echo Frontend Server Starting... && npm start"

echo.
echo Both servers are starting in separate windows.
echo Close those windows to stop the servers.
echo.
pause
