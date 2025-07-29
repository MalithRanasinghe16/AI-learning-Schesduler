@echo off
echo ========================================
echo   AI Learning Scheduler - Quick Start
echo ========================================
echo.

echo [1/3] Starting Backend Server (Port 5000)...
start cmd /k "cd /d %~dp0 && npm run dev:server"
timeout /t 3 /nobreak >nul

echo [2/3] Starting Chatbot Service (Port 8000)...
start cmd /k "cd /d %~dp0chatbot && .\run_chatbot.bat"
timeout /t 3 /nobreak >nul

echo [3/3] Starting Frontend (Port 5173)...
start cmd /k "cd /d %~dp0 && npm run dev"

echo.
echo ✅ All services are starting!
echo.
echo Access your application:
echo   Frontend: http://localhost:5173
echo   Backend:  http://localhost:5000
echo   Chatbot:  http://localhost:8000
echo.
echo Press any key to exit...
pause >nul
