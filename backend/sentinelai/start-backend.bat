@echo off
echo ========================================
echo   SentinelAI Backend Startup Script
echo ========================================
echo.

:: Kill any existing backend process on port 8082
echo [1/3] Checking for existing backend processes...
for /f "tokens=5" %%a in ('netstat -aon ^| findstr :8082') do (
    echo Killing process PID %%a...
    taskkill /F /PID %%a >nul 2>&1
)
timeout /t 2 /nobreak >nul

:: Start the backend
echo [2/3] Starting Spring Boot backend...
echo.
cd /d "%~dp0"
call mvnw.cmd spring-boot:run

echo [3/3] Backend stopped.
pause
