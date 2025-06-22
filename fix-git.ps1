Write-Host "🔧 Git Setup Fix" -ForegroundColor Green
Write-Host "================" -ForegroundColor Green
Write-Host ""

# Step 1: Find Git
$gitPath = $null
if (Test-Path "C:\Program Files\Git\bin\git.exe") {
    $gitPath = "C:\Program Files\Git\bin\git.exe"
    Write-Host "✅ Found Git at: $gitPath" -ForegroundColor Green
} elseif (Test-Path "C:\Program Files (x86)\Git\bin\git.exe") {
    $gitPath = "C:\Program Files (x86)\Git\bin\git.exe"
    Write-Host "✅ Found Git at: $gitPath" -ForegroundColor Green
} else {
    Write-Host "❌ Git not found! Please install Git first." -ForegroundColor Red
    Write-Host "Download from: https://git-scm.com/download/win" -ForegroundColor Yellow
    Read-Host "Press Enter to exit"
    exit 1
}

# Step 2: Configure Git user
Write-Host ""
Write-Host "Step 2: Configure Git user..." -ForegroundColor Cyan
& $gitPath config --global user.name "haryowl"
& $gitPath config --global user.email "haryowl@example.com"

# Step 3: Initialize repository
Write-Host ""
Write-Host "Step 3: Initialize repository..." -ForegroundColor Cyan
& $gitPath init

# Step 4: Remove existing remote
Write-Host ""
Write-Host "Step 4: Remove existing remote..." -ForegroundColor Cyan
& $gitPath remote remove origin 2>$null

# Step 5: Add all files
Write-Host ""
Write-Host "Step 5: Add all files..." -ForegroundColor Cyan
& $gitPath add .

# Step 6: Make initial commit
Write-Host ""
Write-Host "Step 6: Make initial commit..." -ForegroundColor Cyan
& $gitPath commit -m "Initial commit: Galileosky Parser project"

# Step 7: Create main branch
Write-Host ""
Write-Host "Step 7: Create main branch..." -ForegroundColor Cyan
& $gitPath branch -M main

# Step 8: Add remote
Write-Host ""
Write-Host "Step 8: Add remote..." -ForegroundColor Cyan
& $gitPath remote add origin https://github.com/haryowl/galileosky-parser.git

# Step 9: Show status
Write-Host ""
Write-Host "Step 9: Show status..." -ForegroundColor Cyan
& $gitPath status

# Step 10: Push to GitHub
Write-Host ""
Write-Host "Step 10: Push to GitHub..." -ForegroundColor Cyan
Write-Host "⚠️  You may be prompted for authentication" -ForegroundColor Yellow
Write-Host "Use your GitHub username: haryowl" -ForegroundColor Yellow
Write-Host "Use a Personal Access Token as password (not your GitHub password)" -ForegroundColor Yellow
Write-Host ""

$result = & $gitPath push -u origin main 2>&1

if ($LASTEXITCODE -ne 0) {
    Write-Host ""
    Write-Host "❌ Push failed! This is likely an authentication issue." -ForegroundColor Red
    Write-Host ""
    Write-Host "To fix this:" -ForegroundColor Yellow
    Write-Host "1. Go to https://github.com/settings/tokens" -ForegroundColor Yellow
    Write-Host "2. Generate new token (classic)" -ForegroundColor Yellow
    Write-Host "3. Select 'repo' scope" -ForegroundColor Yellow
    Write-Host "4. Copy the token and use it as password" -ForegroundColor Yellow
    Write-Host ""
} else {
    Write-Host ""
    Write-Host "✅ Successfully pushed to GitHub!" -ForegroundColor Green
    Write-Host "🎉 Your repository is live at: https://github.com/haryowl/galileosky-parser" -ForegroundColor Green
}

Write-Host ""
Read-Host "Press Enter to exit" 