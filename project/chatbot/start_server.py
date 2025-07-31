#!/usr/bin/env python3
"""
Simple server starter script for the AI Learning Scheduler Chatbot
"""
import os
import sys
import uvicorn

# Add current directory to Python path
current_dir = os.path.dirname(os.path.abspath(__file__))
sys.path.insert(0, current_dir)

# Import the main app
from main import app

if __name__ == "__main__":
    print("Starting AI Learning Scheduler Chatbot Server...")
    print(f"Current directory: {current_dir}")
    print(f"Python path: {sys.path[:3]}")  # Show first 3 paths
    
    try:
        uvicorn.run(
            app,
            host="0.0.0.0",
            port=8000,
            reload=False,
            log_level="info"
        )
    except Exception as e:
        print(f"Error starting server: {e}")
        input("Press Enter to continue...")
