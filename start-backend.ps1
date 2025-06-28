# PowerShell script to start the Galileosky backend server
# This script handles the Windows PowerShell command separator issues

Write-Host "Starting Galileosky Backend Server..." -ForegroundColor Green

# Check if we're in the right directory
if (-not (Test-Path "backend")) {
    Write-Host "Error: 'backend' directory not found!" -ForegroundColor Red
    Write-Host "Please run this script from the gali-parse root directory." -ForegroundColor Yellow
    exit 1
}

# Change to backend directory
Write-Host "Changing to backend directory..." -ForegroundColor Cyan
Set-Location backend

# Check if node_modules exists
if (-not (Test-Path "node_modules")) {
    Write-Host "Installing dependencies..." -ForegroundColor Yellow
    npm install
    if ($LASTEXITCODE -ne 0) {
        Write-Host "Failed to install dependencies!" -ForegroundColor Red
        exit 1
    }
}

# Check available scripts
Write-Host "Available scripts:" -ForegroundColor Cyan
npm run

# Start the enhanced server
Write-Host "Starting enhanced server..." -ForegroundColor Green
npm run start:enhanced

# If the above fails, try alternative methods
if ($LASTEXITCODE -ne 0) {
    Write-Host "Enhanced server failed, trying alternative methods..." -ForegroundColor Yellow
    
    # Try starting with node directly
    Write-Host "Trying direct node start..." -ForegroundColor Cyan
    node src/enhanced-server.js
    
    if ($LASTEXITCODE -ne 0) {
        Write-Host "Trying simple server..." -ForegroundColor Cyan
        node ../simple-server.js
    }
}

Write-Host "Server startup complete!" -ForegroundColor Green 