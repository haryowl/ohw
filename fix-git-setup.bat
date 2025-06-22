@echo off
setlocal enabledelayedexpansion

echo 🔧 Fixing Git Setup
echo ===================

REM Check if git is installed
git --version >nul 2>&1
if errorlevel 1 (
    echo ❌ Git is not installed!
    echo.
    echo Please install Git first:
    echo 1. Go to https://git-scm.com/download/win
    echo 2. Download and install Git for Windows
    echo 3. Restart this script after installation
    echo.
    pause
    exit /b 1
)

echo ✅ Git is installed

REM Check if we're in a git repository
if not exist ".git" (
    echo ℹ️  Initializing Git repository...
    git init
    echo ✅ Git repository initialized
) else (
    echo ✅ Git repository already exists
)

REM Get GitHub username
set /p github_username="Enter your GitHub username (e.g., haryowl): "

REM Remove any existing remote
git remote remove origin 2>nul

REM Add correct remote
git remote add origin https://github.com/%github_username%/galileosky-parser.git
echo ✅ Remote origin set to: https://github.com/%github_username%/galileosky-parser.git

REM Update README.md with correct username
echo ℹ️  Updating README.md...
powershell -Command "(Get-Content README.md) -replace 'YOUR_USERNAME', '%github_username%' | Set-Content README.md"
echo ✅ README.md updated

REM Update scripts with correct repository URL
echo ℹ️  Updating script files...
if exist "termux-start.sh" (
    powershell -Command "(Get-Content termux-start.sh) -replace 'https://github.com/your-repo/galileosky-parser.git', 'https://github.com/%github_username%/galileosky-parser.git' | Set-Content termux-start.sh"
)
if exist "termux-backend-only.sh" (
    powershell -Command "(Get-Content termux-backend-only.sh) -replace 'https://github.com/your-repo/galileosky-parser.git', 'https://github.com/%github_username%/galileosky-parser.git' | Set-Content termux-backend-only.sh"
)
echo ✅ Script files updated

REM Add all files
echo ℹ️  Adding files to Git...
git add .

REM Check if there are changes to commit
git diff --cached --quiet
if errorlevel 1 (
    echo ℹ️  Committing changes...
    git commit -m "Initial commit: Galileosky Parser project"
    echo ✅ Changes committed
) else (
    echo ⚠️  No changes to commit
)

REM Check if we have any commits
git rev-list --count HEAD >nul 2>&1
if errorlevel 1 (
    echo ❌ No commits found! Creating initial commit...
    echo # Galileosky Parser > README.md
    git add README.md
    git commit -m "Initial commit: Galileosky Parser project"
    echo ✅ Initial commit created
)

REM Create and switch to main branch
echo ℹ️  Creating main branch...
git checkout -b main 2>nul || git branch -M main
echo ✅ Main branch created/selected

REM Show current status
echo.
echo 📊 Current Git Status:
git status

echo.
echo 🚀 Ready to push! Run the following command:
echo git push -u origin main
echo.
echo Or press any key to push now...
pause >nul

REM Push to GitHub
echo ℹ️  Pushing to GitHub...
git push -u origin main

if errorlevel 1 (
    echo ❌ Push failed!
    echo.
    echo Possible issues:
    echo 1. Repository doesn't exist on GitHub
    echo 2. Authentication failed
    echo 3. Network issues
    echo.
    echo Please create the repository on GitHub first:
    echo https://github.com/new
    echo Repository name: galileosky-parser
    echo.
    echo Then try again.
) else (
    echo ✅ Successfully pushed to GitHub!
    echo.
    echo 🎉 Your repository is live at:
    echo https://github.com/%github_username%/galileosky-parser
)

echo.
pause 