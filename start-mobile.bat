@echo off
echo Starting Galileosky Parser for Mobile Access...
echo.
echo This will start the backend and frontend servers accessible from mobile devices.
echo Make sure your computer and phone are on the same network.
echo.

REM Get local IP address
for /f "tokens=2 delims=:" %%a in ('ipconfig ^| findstr /r /c:"IPv4 Address"') do (
    set LOCAL_IP=%%a
    goto :found_ip
)
:found_ip
set LOCAL_IP=%LOCAL_IP: =%

echo Your local IP address is: %LOCAL_IP%
echo.
echo Mobile devices can access the app at:
echo Backend API: http://%LOCAL_IP%:3001
echo Frontend: http://%LOCAL_IP%:3002
echo.

REM Set environment variables for mobile access
set REACT_APP_API_URL=http://%LOCAL_IP%:3001
set REACT_APP_WS_URL=ws://%LOCAL_IP%:3001/ws

echo Starting backend server...
cd backend
start "Backend Server" cmd /k "npm start"

echo Starting frontend server...
cd ..\frontend
start "Frontend Server" cmd /k "npx serve -s build -l 3002"

echo.
echo Servers are starting...
echo Wait a moment, then open http://%LOCAL_IP%:3002 on your mobile device
echo.
pause 