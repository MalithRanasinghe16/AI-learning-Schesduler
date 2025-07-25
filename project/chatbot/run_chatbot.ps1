Write-Host "🤖 Starting AI Learning Scheduler Chatbot..." -ForegroundColor Cyan
Write-Host ""

# Check if virtual environment exists
if (-not (Test-Path ".venv\Scripts\python.exe")) {
    Write-Host "❌ Error: Virtual environment not found!" -ForegroundColor Red
    Write-Host "Please create it first:" -ForegroundColor Yellow
    Write-Host "  py -m venv .venv" -ForegroundColor Gray
    Write-Host "  .\.venv\Scripts\Activate.ps1" -ForegroundColor Gray
    Write-Host "  pip install -r requirements.txt" -ForegroundColor Gray
    Read-Host "Press Enter to exit"
    exit 1
}

# Start the chatbot server
Write-Host "✅ Virtual environment found!" -ForegroundColor Green
Write-Host "🚀 Starting chatbot on http://localhost:8000" -ForegroundColor Green
Write-Host "Press Ctrl+C to stop the server" -ForegroundColor Cyan
Write-Host ""

$pythonPath = Join-Path (Get-Location) ".venv\Scripts\python.exe"
& $pythonPath -m uvicorn main:app --reload --port 8000
