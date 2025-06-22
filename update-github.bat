@echo off
echo 🚀 Updating GitHub with Enhanced Galileosky Parser...
echo ================================================

REM Check if Git is available
where git >nul 2>&1
if %errorlevel% neq 0 (
    echo ❌ Git is not available in PATH
    echo Please install Git for Windows or run this in Termux
    pause
    exit /b 1
)

echo ✅ Git found, checking repository status...

REM Check if this is a Git repository
git status >nul 2>&1
if %errorlevel% neq 0 (
    echo ❌ This is not a Git repository
    echo Please run this script from your gali-parse directory
    pause
    exit /b 1
)

echo 📁 Adding all files to Git...
git add .

echo 📝 Committing enhanced features...
git commit -m "✨ Enhanced Galileosky parser with complete parameter parsing

- Added comprehensive tag parsing (0x01 to 0xe9)
- Enhanced frontend with real-time parameter display  
- Added device status panels and live statistics
- Implemented proper data type handling and formatting
- Added comprehensive JSON downloads with all parameters
- Created startup script and documentation
- Supports all Galileosky parameters: device info, location, status, GSM, sensors, user data"

echo 🚀 Pushing to GitHub...
git push origin main

if %errorlevel% equ 0 (
    echo ✅ Successfully updated GitHub!
    echo 🌐 Your enhanced Galileosky parser is now live on GitHub
) else (
    echo ❌ Failed to push to GitHub
    echo Please check your Git configuration and try again
)

echo.
echo 📋 Files updated:
echo - termux-enhanced-backend.js (Complete parameter parsing)
echo - simple-frontend.html (Enhanced UI with all parameters)
echo - start-enhanced.sh (Easy startup script)
echo - ENHANCED_FEATURES.md (Complete documentation)
echo.

pause 