@echo off
echo 🔧 Simple Git Fix
echo ================

echo.
echo Step 1: Try to find Git...
if exist "C:\Program Files\Git\bin\git.exe" (
    echo ✅ Found Git at: C:\Program Files\Git\bin\git.exe
    set GIT_CMD="C:\Program Files\Git\bin\git.exe"
) else if exist "C:\Program Files (x86)\Git\bin\git.exe" (
    echo ✅ Found Git at: C:\Program Files (x86)\Git\bin\git.exe
    set GIT_CMD="C:\Program Files (x86)\Git\bin\git.exe"
) else (
    echo ❌ Git not found! Please install Git first.
    echo Download from: https://git-scm.com/download/win
    pause
    exit /b 1
)

echo.
echo Step 2: Configure Git user...
%GIT_CMD% config --global user.name "haryowl"
%GIT_CMD% config --global user.email "haryowl@example.com"

echo.
echo Step 3: Initialize repository...
%GIT_CMD% init

echo.
echo Step 4: Remove existing remote...
%GIT_CMD% remote remove origin 2>nul

echo.
echo Step 5: Add all files...
%GIT_CMD% add .

echo.
echo Step 6: Make initial commit...
%GIT_CMD% commit -m "Initial commit: Galileosky Parser project"

echo.
echo Step 7: Create main branch...
%GIT_CMD% branch -M main

echo.
echo Step 8: Add remote...
%GIT_CMD% remote add origin https://github.com/haryowl/galileosky-parser.git

echo.
echo Step 9: Show status...
%GIT_CMD% status

echo.
echo Step 10: Push to GitHub...
echo ⚠️  You may be prompted for authentication
echo Use your GitHub username: haryowl
echo Use a Personal Access Token as password (not your GitHub password)
echo.
%GIT_CMD% push -u origin main

if errorlevel 1 (
    echo.
    echo ❌ Push failed! This is likely an authentication issue.
    echo.
    echo To fix this:
    echo 1. Go to https://github.com/settings/tokens
    echo 2. Generate new token (classic)
    echo 3. Select 'repo' scope
    echo 4. Copy the token and use it as password
    echo.
) else (
    echo.
    echo ✅ Successfully pushed to GitHub!
    echo 🎉 Your repository is live at: https://github.com/haryowl/galileosky-parser
)

echo.
pause 