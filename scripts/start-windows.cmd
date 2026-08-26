@echo off
setlocal
title RoundAIble

where node >nul 2>nul
if errorlevel 1 (
  echo Node.js 18+ is required. Install it from https://nodejs.org then run this file again.
  pause
  exit /b 1
)

cd /d "%~dp0.."

if not exist "backend\node_modules" if not exist "frontend\node_modules" (
  echo First run: installing dependencies, please wait...
  call npm install --no-audit --no-fund
)

if not exist "backend\dist\server.js" call npm run build:backend
if not exist "frontend\dist\index.html" call npm run build:frontend

echo.
echo   RoundAIble will open at  http://localhost:4199
echo   Keep this window open while you use the app. Close it to stop.
echo.

start "" cmd /c "timeout /t 2 >nul & start http://localhost:4199"
set PORT=4199
node backend\dist\server.js
pause
