@echo off
echo 🔧 Manual Git Fix
echo ================

echo.
echo Step 1: Check Git installation
git --version
if errorlevel 1 (
    echo ❌ Git not found! Please install Git first.
    pause
    exit /b 1
)

echo.
echo Step 2: Initialize repository
git init

echo.
echo Step 3: Add all files
git add .

echo.
echo Step 4: Make initial commit
git commit -m "Initial commit: Galileosky Parser project"

echo.
echo Step 5: Create main branch
git branch -M main

echo.
echo Step 6: Add remote (replace YOUR_USERNAME with haryowl)
git remote add origin https://github.com/haryowl/galileosky-parser.git

echo.
echo Step 7: Push to GitHub
git push -u origin main

echo.
echo ✅ Done! Check if push was successful above.
pause 