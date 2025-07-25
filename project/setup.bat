@echo off
echo ========================================
echo   AI Learning Scheduler - Setup
echo ========================================
echo.

echo [1/4] Installing Node.js dependencies...
call npm install
if errorlevel 1 (
    echo ERROR: Failed to install Node.js dependencies
    pause
    exit /b 1
)

echo.
echo [2/4] Setting up Python virtual environment...
cd chatbot
py -m venv .venv
if errorlevel 1 (
    echo ERROR: Failed to create virtual environment
    pause
    exit /b 1
)

echo.
echo [3/4] Installing Python dependencies...
.venv\Scripts\python.exe -m pip install --upgrade pip
.venv\Scripts\python.exe -m pip install -r requirements.txt
if errorlevel 1 (
    echo ERROR: Failed to install Python dependencies
    pause
    exit /b 1
)

echo.
echo [4/4] Downloading spaCy language model...
.venv\Scripts\python.exe -m spacy download en_core_web_sm
if errorlevel 1 (
    echo ERROR: Failed to download spaCy model
    pause
    exit /b 1
)

cd ..
echo.
echo ✅ Setup complete!
echo.
echo Next steps:
echo 1. Copy .env.example to .env and configure your MongoDB URI
echo 2. Run: .\start_all.bat
echo.
pause
