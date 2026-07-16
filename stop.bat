@echo off
title Claude Desk 7 - Stop
echo ==========================================
echo   Claude Desk 7 - Stopping Server
echo ==========================================
echo.

:: Kill node processes serving the app (vite dev server + tsx backend)
echo [*] Stopping Vite dev server...
taskkill /f /fi "IMAGENAME eq node.exe" /fi "WINDOWTITLE eq vite*" 2>nul

echo [*] Stopping tsx backend...
taskkill /f /fi "IMAGENAME eq node.exe" /fi "WINDOWTITLE eq tsx*" 2>nul

:: Also kill specific processes by port usage
echo [*] Checking ports 5173 and 3712...
for /f "tokens=5" %%a in ('netstat -ano ^| findstr ":5173 "') do (
    taskkill /f /pid %%a 2>nul
)
for /f "tokens=5" %%a in ('netstat -ano ^| findstr ":3712 "') do (
    taskkill /f /pid %%a 2>nul
)

echo.
echo [OK] Server stopped.
echo.
pause
