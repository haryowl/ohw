Write-Host "🚀 Updating GitHub with Enhanced Galileosky Parser..." -ForegroundColor Green
Write-Host "===============================================" -ForegroundColor Green
Write-Host ""

# Check if Git is available
try {
    $gitVersion = git --version 2>$null
    if ($LASTEXITCODE -eq 0) {
        Write-Host "✅ Git found: $gitVersion" -ForegroundColor Green
    } else {
        throw "Git not found"
    }
} catch {
    Write-Host "❌ Git is not available in PATH" -ForegroundColor Red
    Write-Host "Please install Git for Windows or run this in Termux" -ForegroundColor Yellow
    Read-Host "Press Enter to exit"
    exit 1
}

Write-Host "📁 Checking repository status..." -ForegroundColor Cyan

# Check if this is a Git repository
try {
    $status = git status 2>$null
    if ($LASTEXITCODE -ne 0) {
        throw "Not a Git repository"
    }
} catch {
    Write-Host "❌ This is not a Git repository" -ForegroundColor Red
    Write-Host "Please run this script from your gali-parse directory" -ForegroundColor Yellow
    Read-Host "Press Enter to exit"
    exit 1
}

Write-Host "📁 Adding all files to Git..." -ForegroundColor Cyan
git add .

if ($LASTEXITCODE -ne 0) {
    Write-Host "❌ Failed to add files to Git" -ForegroundColor Red
    Read-Host "Press Enter to exit"
    exit 1
}

Write-Host "📝 Committing enhanced features..." -ForegroundColor Cyan
$commitMessage = '✨ Enhanced Galileosky parser with complete parameter parsing

- Added comprehensive tag parsing (0x01 to 0xe9)
- Enhanced frontend with real-time parameter display
- Added device status panels and live statistics
- Implemented proper data type handling and formatting
- Added comprehensive JSON downloads with all parameters
- Created startup script and documentation
- Supports all Galileosky parameters: device info, location, status, GSM, sensors, user data'

git commit -m $commitMessage

if ($LASTEXITCODE -ne 0) {
    Write-Host "❌ Failed to commit changes" -ForegroundColor Red
    Read-Host "Press Enter to exit"
    exit 1
}

Write-Host "🚀 Pushing to GitHub..." -ForegroundColor Cyan
git push origin main

if ($LASTEXITCODE -eq 0) {
    Write-Host "✅ Successfully updated GitHub!" -ForegroundColor Green
    Write-Host "🌐 Your enhanced Galileosky parser is now live on GitHub" -ForegroundColor Green
} else {
    Write-Host "❌ Failed to push to GitHub" -ForegroundColor Red
    Write-Host "Please check your Git configuration and try again" -ForegroundColor Yellow
}

Write-Host ""
Write-Host "📋 Files updated:" -ForegroundColor Cyan
Write-Host "- termux-enhanced-backend.js (Complete parameter parsing)" -ForegroundColor White
Write-Host "- simple-frontend.html (Enhanced UI with all parameters)" -ForegroundColor White
Write-Host "- start-enhanced.sh (Easy startup script)" -ForegroundColor White
Write-Host "- ENHANCED_FEATURES.md (Complete documentation)" -ForegroundColor White
Write-Host ""

Read-Host "Press Enter to exit" 