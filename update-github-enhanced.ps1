Write-Host "========================================" -ForegroundColor Green
Write-Host "Updating GitHub Repository" -ForegroundColor Green
Write-Host "========================================" -ForegroundColor Green

Write-Host ""
Write-Host "1. Adding all files to git..." -ForegroundColor Yellow
git add .

Write-Host ""
Write-Host "2. Checking git status..." -ForegroundColor Yellow
git status

Write-Host ""
Write-Host "3. Committing changes..." -ForegroundColor Yellow
git commit -m "Enhanced backend with detailed logging and IMEI parsing fixes

- Added comprehensive logging for packet processing
- Fixed IMEI parsing to use BCD decoding instead of UTF-8
- Enhanced debugging for small packets (< 32 bytes)
- Improved packet validation and error handling
- Added detailed console output for troubleshooting"

Write-Host ""
Write-Host "4. Pushing to GitHub..." -ForegroundColor Yellow
git push origin main

Write-Host ""
Write-Host "========================================" -ForegroundColor Green
Write-Host "GitHub Update Complete!" -ForegroundColor Green
Write-Host "========================================" -ForegroundColor Green
Write-Host ""
Write-Host "You can now test the enhanced backend with:" -ForegroundColor Cyan
Write-Host "  node termux-enhanced-backend.js" -ForegroundColor White
Write-Host ""
Write-Host "The enhanced logging will help identify any issues" -ForegroundColor Cyan
Write-Host "with small packets and IMEI parsing." -ForegroundColor Cyan
Write-Host ""
Read-Host "Press Enter to continue" 