@echo off
echo 🚀 Setting up AI Learning Scheduler...

REM Check if Node.js is installed
node --version >nul 2>&1
if errorlevel 1 (
    echo ❌ Node.js is not installed. Please install Node.js v18+ first.
    pause
    exit /b 1
)

REM Check if Python is installed
python --version >nul 2>&1
if errorlevel 1 (
    echo ❌ Python is not installed. Please install Python 3.9+ first.
    pause
    exit /b 1
)

echo ✅ Prerequisites check passed

REM Install Node.js dependencies
echo 📦 Installing Node.js dependencies...
call npm install

if errorlevel 1 (
    echo ❌ Failed to install Node.js dependencies
    pause
    exit /b 1
)

REM Setup chatbot virtual environment
echo 🐍 Setting up Python virtual environment...
cd chatbot

REM Create virtual environment
python -m venv .venv

REM Activate virtual environment
call .venv\Scripts\activate.bat

REM Install Python dependencies
echo 📦 Installing Python dependencies...
pip install -r requirements.txt

if errorlevel 1 (
    echo ❌ Failed to install Python dependencies
    pause
    exit /b 1
)

REM Download spaCy language model
echo 🔤 Downloading spaCy English model...
python -m spacy download en_core_web_sm

REM Create environment files if they don't exist
if not exist .env (
    copy .env.example .env
    echo 📄 Created chatbot/.env - please configure it
)

cd ..\server
if not exist .env (
    copy .env.example .env
    echo 📄 Created server/.env - please configure it
)

cd ..

echo.
echo 🎉 Setup complete!
echo.
echo 📝 Next steps:
echo 1. Configure your environment files:
echo    - server/.env (database connection, JWT secret^)
echo    - chatbot/.env (backend URL, API keys^)
echo.
echo 2. Start the application:
echo    npm run start:all
echo.
echo 3. Access the application:
echo    - Frontend: http://localhost:5173
echo    - Backend: http://localhost:5000
echo    - Chatbot: http://localhost:8000
echo.
echo 💡 For detailed instructions, see SETUP.md
pause
