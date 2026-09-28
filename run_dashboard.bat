@echo off
echo ==================================================
echo STARTING WEAVE AUTOMATION DASHBOARD
echo ==================================================

start "Weave Backend (Port 5000)" cmd /k "cd backend && npm start"
start "Weave Frontend Dashboard (Port 3000)" cmd /k "cd frontend && npm run dev"

echo.
echo Dashboard launched!
echo Backend:  http://localhost:5000
echo Frontend: http://localhost:3000
echo ==================================================
