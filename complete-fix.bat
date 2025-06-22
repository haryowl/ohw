@echo off
echo 🔧 Complete Git Fix
echo ==================

echo.
echo Step 1: Check Git installation
git --version
if errorlevel 1 (
    echo ❌ Git not found! Please install Git first.
    pause
    exit /b 1
)

echo.
echo Step 2: Configure Git user (if needed)
git config --global user.name >nul 2>&1
if errorlevel 1 (
    echo ℹ️  Setting up Git user configuration...
    set /p git_name="Enter your name (e.g., Haryo): "
    set /p git_email="Enter your email (e.g., haryo@example.com): "
    git config --global user.name "%git_name%"
    git config --global user.email "%git_email%"
    echo ✅ Git user configured
) else (
    echo ✅ Git user already configured
)

echo.
echo Step 3: Initialize repository
git init

echo.
echo Step 4: Remove existing remote (if any)
git remote remove origin 2>nul
echo ✅ Remote cleaned

echo.
echo Step 5: Add all files
git add .

echo.
echo Step 6: Check if we have files to commit
git diff --cached --quiet
if errorlevel 1 (
    echo ℹ️  Making initial commit...
    git commit -m "Initial commit: Galileosky Parser project"
    echo ✅ Initial commit created
) else (
    echo ⚠️  No changes to commit, creating empty commit...
    git commit --allow-empty -m "Initial commit: Galileosky Parser project"
    echo ✅ Empty commit created
)

echo.
echo Step 7: Create main branch
git branch -M main
echo ✅ Main branch created

echo.
echo Step 8: Add remote
git remote add origin https://github.com/haryowl/galileosky-parser.git
echo ✅ Remote added

echo.
echo Step 9: Show current status
echo 📊 Git Status:
git status

echo.
echo Step 10: Push to GitHub
echo ℹ️  Pushing to GitHub...
git push -u origin main

if errorlevel 1 (
    echo.
    echo ❌ Push failed!
    echo.
    echo Possible solutions:
    echo 1. Create repository on GitHub first: https://github.com/new
    echo 2. Check authentication (use Personal Access Token)
    echo 3. Check network connection
    echo.
    echo Repository should be named: galileosky-parser
    echo.
) else (
    echo.
    echo ✅ Successfully pushed to GitHub!
    echo 🎉 Your repository is live at: https://github.com/haryowl/galileosky-parser
)

echo.
pause 