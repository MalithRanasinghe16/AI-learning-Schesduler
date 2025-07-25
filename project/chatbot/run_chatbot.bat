@echo off
echo Starting AI Learning Scheduler Chatbot...
echo.

REM Check if virtual environment exists
if not exist ".venv\Scripts\activate.bat" (
    echo Error: Virtual environment not found at .venv\
    echo Please create virtual environment first:
    echo   py -m venv .venv
    echo   .venv\Scripts\activate.bat
    echo   pip install -r requirements.txt
    pause
    exit /b 1
)

REM Start the chatbot server directly
echo Starting chatbot on http://localhost:8000
echo Press Ctrl+C to stop the server
echo.
.venv\Scripts\python.exe -m uvicorn main:app --reload --port 8000

pause

pause
