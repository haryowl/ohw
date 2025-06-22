@echo off
echo 🔧 Fixing Git Path Issues
echo ========================

REM Try to find Git installation
set GIT_PATH=

REM Check common Git installation paths
if exist "C:\Program Files\Git\bin\git.exe" (
    set GIT_PATH="C:\Program Files\Git\bin\git.exe"
    echo ✅ Found Git at: C:\Program Files\Git\bin\git.exe
) else if exist "C:\Program Files (x86)\Git\bin\git.exe" (
    set GIT_PATH="C:\Program Files (x86)\Git\bin\git.exe"
    echo ✅ Found Git at: C:\Program Files (x86)\Git\bin\git.exe
) else (
    echo ❌ Git not found in common locations!
    echo.
    echo Please install Git from: https://git-scm.com/download/win
    echo After installation, restart this script.
    pause
    exit /b 1
)

REM Test Git
%GIT_PATH% --version
if errorlevel 1 (
    echo ❌ Git found but not working!
    pause
    exit /b 1
)

echo.
echo 🚀 Setting up Git configuration...

REM Configure Git user
%GIT_PATH% config --global user.name "Haryo"
%GIT_PATH% config --global user.email "haryo@example.com"

echo ✅ Git user configured

REM Initialize repository
%GIT_PATH% init

REM Remove existing remote
%GIT_PATH% remote remove origin 2>nul

REM Add all files
%GIT_PATH% add .

REM Make initial commit
%GIT_PATH% commit -m "Initial commit: Galileosky Parser project"

REM Create main branch
%GIT_PATH% branch -M main

REM Add remote
%GIT_PATH% remote add origin https://github.com/haryowl/galileosky-parser.git

echo.
echo 📊 Current status:
%GIT_PATH% status

echo.
echo 🚀 Pushing to GitHub...
%GIT_PATH% push -u origin main

if errorlevel 1 (
    echo.
    echo ❌ Push failed!
    echo.
    echo This might be due to authentication.
    echo You may need to:
    echo 1. Use a Personal Access Token
    echo 2. Or use GitHub CLI: winget install GitHub.cli
    echo.
) else (
    echo.
    echo ✅ Successfully pushed to GitHub!
    echo 🎉 Your repository is live at: https://github.com/haryowl/galileosky-parser
)

echo.
pause 