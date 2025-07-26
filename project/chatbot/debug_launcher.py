#!/usr/bin/env python3
"""
Debug launcher for the chatbot service
"""

import os
import sys
import traceback

def main():
    print("🚀 Starting AI Learning Scheduler Chatbot...")
    print(f"📂 Working directory: {os.getcwd()}")
    print(f"🐍 Python executable: {sys.executable}")
    print(f"📦 Python path: {sys.path}")
    
    try:
        print("\n🔧 Loading environment variables...")
        from dotenv import load_dotenv
        load_dotenv()
        
        print("📡 Starting FastAPI application...")
        import main
        
        print("🌐 Starting Uvicorn server...")
        import uvicorn
        
        host = os.getenv('CHATBOT_HOST', '0.0.0.0')
        port = int(os.getenv('CHATBOT_PORT', 8000))
        debug = os.getenv('CHATBOT_DEBUG', 'True').lower() == 'true'
        
        print(f"🎯 Server will run on: http://{host}:{port}")
        print(f"🐛 Debug mode: {debug}")
        
        uvicorn.run(
            "main:app", 
            host=host,
            port=port,
            reload=debug,
            log_level="info"
        )
        
    except Exception as e:
        print(f"❌ Error starting chatbot: {e}")
        traceback.print_exc()
        return 1
    
    return 0

if __name__ == "__main__":
    sys.exit(main())
