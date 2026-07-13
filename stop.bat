@echo off
title Claude Desk 7 - Stop
echo ==========================================
echo   Claude Desk 7 - Stopping Server
echo ==========================================
echo.

:: Find and kill the node process running the server
for /f "tokens=2 delims=," %%a in ('tasklist /FI "WINDOWTITLE eq Claude Desk 7*" /FO CSV /NH 2^>nul') do (
    taskkill /F /PID %%a >nul 2>&1
)

:: Also kill any tsx serving the server
taskkill /F /IM node.exe /FI "WINDOWTITLE eq Claude Desk 7*" >nul 2>&1

echo [OK] Server stopped.
echo.
pause
