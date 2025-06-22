@echo off
setlocal enabledelayedexpansion

REM 🚀 Galileosky Parser GitHub Setup Script for Windows
REM This script helps you set up your GitHub repository

echo 🛰️  Galileosky Parser GitHub Setup
echo ==================================

REM Check if git is installed
git --version >nul 2>&1
if errorlevel 1 (
    echo ❌ Git is not installed. Please install Git first.
    echo Download from: https://git-scm.com/download/win
    pause
    exit /b 1
)

REM Check if we're in a git repository
if not exist ".git" (
    echo ℹ️  Initializing Git repository...
    git init
    echo ✅ Git repository initialized
)

REM Check if remote origin exists
git remote get-url origin >nul 2>&1
if errorlevel 1 (
    set /p github_username="Enter your GitHub username: "
    git remote add origin https://github.com/%github_username%/galileosky-parser.git
    echo ✅ Remote origin added
) else (
    echo ⚠️  Remote origin already exists:
    git remote get-url origin
    set /p update_remote="Do you want to update it? (y/n): "
    if /i "!update_remote!"=="y" (
        set /p github_username="Enter your GitHub username: "
        git remote set-url origin https://github.com/%github_username%/galileosky-parser.git
        echo ✅ Remote origin updated
    )
)

REM Update README.md with correct username
if defined github_username (
    echo ℹ️  Updating README.md with your GitHub username...
    powershell -Command "(Get-Content README.md) -replace 'YOUR_USERNAME', '%github_username%' | Set-Content README.md"
    echo ✅ README.md updated
)

REM Update scripts with correct repository URL
if defined github_username (
    echo ℹ️  Updating script files with correct repository URL...
    if exist "termux-start.sh" (
        powershell -Command "(Get-Content termux-start.sh) -replace 'https://github.com/your-repo/galileosky-parser.git', 'https://github.com/%github_username%/galileosky-parser.git' | Set-Content termux-start.sh"
    )
    if exist "termux-backend-only.sh" (
        powershell -Command "(Get-Content termux-backend-only.sh) -replace 'https://github.com/your-repo/galileosky-parser.git', 'https://github.com/%github_username%/galileosky-parser.git' | Set-Content termux-backend-only.sh"
    )
    echo ✅ Script files updated
)

REM Add all files to git
echo ℹ️  Adding files to Git...
git add .

REM Check if there are changes to commit
git diff --cached --quiet
if errorlevel 1 (
    set /p commit_message="Enter commit message (or press Enter for default): "
    if "!commit_message!"=="" set commit_message=Initial commit: Galileosky Parser project
    git commit -m "!commit_message!"
    echo ✅ Files committed
) else (
    echo ⚠️  No changes to commit
)

REM Ask if user wants to push to GitHub
set /p push_now="Do you want to push to GitHub now? (y/n): "
if /i "!push_now!"=="y" (
    echo ℹ️  Pushing to GitHub...
    git branch -M main
    git push -u origin main
    echo ✅ Successfully pushed to GitHub!
    
    echo ℹ️  Your repository URL:
    echo https://github.com/%github_username%/galileosky-parser
) else (
    echo ℹ️  To push later, run:
    echo git push -u origin main
)

echo.
echo 🎉 Setup complete!
echo.
echo Next steps:
echo 1. Go to https://github.com/%github_username%/galileosky-parser
echo 2. Add repository description and topics
echo 3. Enable GitHub Pages if desired
echo 4. Share your repository!
echo.
echo 📚 Check GITHUB_SETUP.md for detailed instructions
pause 