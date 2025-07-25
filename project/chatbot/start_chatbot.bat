@echo off
echo Starting AI Learning Scheduler Chatbot...
echo.

cd /d "%~dp0"

REM Check if virtual environment exists
if not exist "chatbot_env\Scripts\python.exe" (
    echo Error: Virtual environment not found!
    echo Creating virtual environment...
    python -m venv chatbot_env
    echo Installing requirements...
    chatbot_env\Scripts\pip.exe install -r requirements.txt
)

REM Start the chatbot directly
echo Starting chatbot on http://localhost:8000
echo Press Ctrl+C to stop the server
echo.

chatbot_env\Scripts\python.exe -m uvicorn main:app --reload --port 8000

pause
