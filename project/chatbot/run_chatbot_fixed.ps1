Write-Host "🤖 Starting AI Learning Scheduler Chatbot..." -ForegroundColor Cyan
Write-Host ""

# Check if virtual environment exists
if (-not (Test-Path "chatbot_env\Scripts\activate.ps1")) {
    Write-Host "❌ Error: Virtual environment not found!" -ForegroundColor Red
    Write-Host "Please create it first:" -ForegroundColor Yellow
    Write-Host "  python -m venv chatbot_env" -ForegroundColor Gray
    Write-Host "  .\chatbot_env\Scripts\Activate.ps1" -ForegroundColor Gray
    Write-Host "  pip install -r requirements.txt" -ForegroundColor Gray
    Read-Host "Press Enter to exit"
    exit 1
}

# Activate virtual environment
Write-Host "🔧 Activating virtual environment..." -ForegroundColor Yellow
& .\chatbot_env\Scripts\Activate.ps1

# Check if uvicorn is installed
try {
    & .\chatbot_env\Scripts\uvicorn.exe --version | Out-Null
} catch {
    Write-Host "📦 Installing requirements..." -ForegroundColor Yellow
    pip install -r requirements.txt
}

# Start the chatbot server
Write-Host "✅ Virtual environment activated!" -ForegroundColor Green
Write-Host "🚀 Starting chatbot on http://localhost:8000" -ForegroundColor Green
Write-Host "Press Ctrl+C to stop the server" -ForegroundColor Cyan
Write-Host ""

& .\chatbot_env\Scripts\uvicorn.exe main:app --reload --port 8000
