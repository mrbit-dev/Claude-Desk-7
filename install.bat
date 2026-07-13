@echo off
title Claude Desk 7 - Setup
echo ==========================================
echo   Claude Desk 7 - Installing...
echo ==========================================
echo.
npm install > nul 2>&1
echo [OK] Dependencies installed

call npx vite build > nul 2>&1
echo [OK] Frontend built

echo.
echo ==========================================
echo   Setup complete!
echo.
echo   To start:    start.bat
echo   Or dev mode: npm run dev
echo ==========================================
pause
