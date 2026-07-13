@echo off
title Claude Desk 7
echo ==========================================
echo   Claude Desk 7
echo   Web Dashboard for Claude Code
echo ==========================================
echo.

:: Check if already running
tasklist /FI "WINDOWTITLE eq Claude Desk 7*" 2>nul | findstr "node" >nul
if %errorlevel%==0 (
    echo [WARNING] Claude Desk 7 is already running!
    echo   Open: http://localhost:3712
    echo.
    echo To restart, run: stop.bat first
    pause
    exit /b
)

:: Check if node_modules exists
if not exist "node_modules" (
    echo [..] Installing dependencies...
    call npm install
)

:: Build frontend if not built
if not exist "dist\index.html" (
    echo [..] Building frontend...
    call npx vite build
)

:: Start server
echo [OK] Starting server...
echo.
echo   Open: http://localhost:3712
echo   Stop: stop.bat
echo.
start /B /WAIT node server\dist\index.js
