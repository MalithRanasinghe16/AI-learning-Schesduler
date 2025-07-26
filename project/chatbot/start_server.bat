@echo off
cd /d "C:\Users\T.M.Malith Sandeepa\OneDrive\Desktop\Projects\AI-learning-Schesduler\project\chatbot"
call .venv\Scripts\activate.bat
echo Starting AI Learning Scheduler Chatbot Server...
python -m uvicorn main:app --host 0.0.0.0 --port 8000 --reload
pause
