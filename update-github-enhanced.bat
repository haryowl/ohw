@echo off
echo ========================================
echo Updating GitHub Repository
echo ========================================

echo.
echo 1. Adding all files to git...
git add .

echo.
echo 2. Checking git status...
git status

echo.
echo 3. Committing changes...
git commit -m "Enhanced backend with detailed logging and IMEI parsing fixes

- Added comprehensive logging for packet processing
- Fixed IMEI parsing to use BCD decoding instead of UTF-8
- Enhanced debugging for small packets (< 32 bytes)
- Improved packet validation and error handling
- Added detailed console output for troubleshooting"

echo.
echo 4. Pushing to GitHub...
git push origin main

echo.
echo ========================================
echo GitHub Update Complete!
echo ========================================
echo.
echo You can now test the enhanced backend with:
echo   node termux-enhanced-backend.js
echo.
echo The enhanced logging will help identify any issues
echo with small packets and IMEI parsing.
echo.
pause 