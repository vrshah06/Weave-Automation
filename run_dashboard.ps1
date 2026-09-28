Write-Host "==================================================" -ForegroundColor Cyan
Write-Host "STARTING WEAVE AUTOMATION DASHBOARD" -ForegroundColor Green
Write-Host "==================================================" -ForegroundColor Cyan

Start-Process powershell -ArgumentList "-NoExit", "-Command", "cd '$PSScriptRoot\backend'; npm start"
Start-Process powershell -ArgumentList "-NoExit", "-Command", "cd '$PSScriptRoot\frontend'; npm run dev"

Write-Host ""
Write-Host "Dashboard launched!" -ForegroundColor Green
Write-Host "Backend:  http://localhost:5000" -ForegroundColor Yellow
Write-Host "Frontend: http://localhost:3000" -ForegroundColor Yellow
Write-Host "==================================================" -ForegroundColor Cyan
