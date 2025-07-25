@echo off
echo Starting AI Learning Scheduler Chatbot...
echo.

REM Activate virtual environment
call .venv\Scripts\activate.bat

REM Start the chatbot server
echo Virtual environment activated!
echo Starting chatbot on http://localhost:8000
echo Press Ctrl+C to stop the server
echo.
uvicorn main:app --reload --port 8000

pause
