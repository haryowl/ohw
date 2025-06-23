@echo off
echo Galileosky Parser - System Test
echo ==============================
echo.

echo Starting backend server...
start "Backend Server" node termux-enhanced-backend.js

echo Waiting for backend to start...
timeout /t 3 /nobreak > nul

echo Starting test data generator...
start "Test Data Generator" node test-device-data.js

echo.
echo System is now running!
echo.
echo Backend: http://localhost:3000
echo Frontend: http://localhost:3000/simple-frontend.html
echo.
echo Test data will be sent every 5 seconds.
echo.
echo Press any key to stop all processes...
pause > nul

echo Stopping processes...
taskkill /f /im node.exe > nul 2>&1
echo Done! 