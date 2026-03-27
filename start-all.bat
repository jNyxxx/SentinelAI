@echo off
echo ========================================
echo   SentinelAI - Starting All Services
echo ========================================
echo.

:: Check if Redis is running
echo [1/4] Checking Redis...
sc query Redis | find "RUNNING" >nul
if %errorlevel% equ 0 (
    echo [OK] Redis is running
) else (
    echo [ERROR] Redis is not running. Starting...
    net start Redis
)
echo.

:: Check PostgreSQL (optional - just informational)
echo [2/4] Checking PostgreSQL...
sc query postgresql-x64-18 >nul 2>&1
if %errorlevel% equ 0 (
    echo [OK] PostgreSQL service found
) else (
    sc query postgresql >nul 2>&1
    if %errorlevel% equ 0 (
        echo [OK] PostgreSQL service found
    ) else (
        echo [INFO] PostgreSQL service name not found in default names
        echo        Please ensure PostgreSQL is running manually
    )
)
echo.

:: Start Backend
echo [3/4] Starting Backend Server...
echo        This may take 30-60 seconds...
echo.
start "SentinelAI Backend" cmd /k "cd /d %~dp0backend\sentinelai && mvnw.cmd spring-boot:run"
timeout /t 3 /nobreak >nul
echo        Backend starting in new window...
echo.

:: Wait for backend to initialize
echo        Waiting for backend to initialize (20 seconds)...
timeout /t 20 /nobreak >nul
echo.

:: Start Frontend
echo [4/4] Starting Frontend Server...
start "SentinelAI Frontend" cmd /k "cd /d %~dp0 && npm run dev"
echo.
echo        Frontend starting in new window...
echo.

:: Wait for frontend
timeout /t 10 /nobreak >nul

echo.
echo ========================================
echo   Services Started Successfully!
echo ========================================
echo.
echo Backend:  http://localhost:8082
echo Frontend: http://localhost:5173
echo.
echo Check the two new command windows for status.
echo.
echo Press any key to open the application in your browser...
pause >nul
start http://localhost:5173

echo.
echo To stop services:
echo   1. Close the Frontend window (Ctrl+C or X button)
echo   2. Close the Backend window (Ctrl+C or X button)
echo   3. Redis will continue running (Windows service)
echo.
