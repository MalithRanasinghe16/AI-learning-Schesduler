#!/usr/bin/env python3
"""Simple test script to identify chatbot startup issues"""

import sys
import traceback

def test_imports():
    """Test all imports step by step"""
    print("🔄 Testing imports...")
    
    try:
        print("  - Testing fastapi...")
        from fastapi import FastAPI
        print("  ✅ FastAPI OK")
        
        print("  - Testing spacy...")
        import spacy
        print("  ✅ spaCy OK")
        
        print("  - Testing spacy model...")
        nlp = spacy.load("en_core_web_sm")
        print("  ✅ spaCy model OK")
        
        print("  - Testing dotenv...")
        from dotenv import load_dotenv
        load_dotenv()
        print("  ✅ dotenv OK")
        
        print("  - Testing custom modules...")
        from nlp_processor import NLPProcessor
        print("  ✅ NLP Processor OK")
        
        from intent_classifier import IntentClassifier
        print("  ✅ Intent Classifier OK")
        
        from schedule_parser import ScheduleParser
        print("  ✅ Schedule Parser OK")
        
        from backend_client import BackendClient
        print("  ✅ Backend Client OK")
        
        from auth_manager import AuthManager
        print("  ✅ Auth Manager OK")
        
        print("  - Testing prioritization engine...")
        from prioritization_engine import PrioritizationEngine
        print("  ✅ Prioritization Engine OK")
        
        print("🎉 All imports successful!")
        return True
        
    except Exception as e:
        print(f"❌ Import failed: {e}")
        traceback.print_exc()
        return False

def test_initialization():
    """Test service initialization"""
    print("\n🔄 Testing initialization...")
    
    try:
        from nlp_processor import NLPProcessor
        from intent_classifier import IntentClassifier
        from schedule_parser import ScheduleParser
        from backend_client import BackendClient
        from auth_manager import AuthManager
        from prioritization_engine import PrioritizationEngine
        
        print("  - Initializing NLP Processor...")
        nlp_processor = NLPProcessor()
        print("  ✅ NLP Processor initialized")
        
        print("  - Initializing Intent Classifier...")
        intent_classifier = IntentClassifier()
        print("  ✅ Intent Classifier initialized")
        
        print("  - Initializing Schedule Parser...")
        schedule_parser = ScheduleParser()
        print("  ✅ Schedule Parser initialized")
        
        print("  - Initializing Backend Client...")
        backend_client = BackendClient()
        print("  ✅ Backend Client initialized")
        
        print("  - Initializing Auth Manager...")
        auth_manager = AuthManager()
        print("  ✅ Auth Manager initialized")
        
        print("  - Initializing Prioritization Engine...")
        prioritization_engine = PrioritizationEngine()
        print("  ✅ Prioritization Engine initialized")
        
        print("🎉 All services initialized successfully!")
        return True
        
    except Exception as e:
        print(f"❌ Initialization failed: {e}")
        traceback.print_exc()
        return False

def test_fastapi_app():
    """Test FastAPI app creation"""
    print("\n🔄 Testing FastAPI app...")
    
    try:
        from fastapi import FastAPI
        from fastapi.middleware.cors import CORSMiddleware
        
        print("  - Creating FastAPI app...")
        app = FastAPI(
            title="AI Learning Scheduler Chatbot",
            description="Intelligent chatbot for schedule management",
            version="1.0.0"
        )
        
        print("  - Adding CORS middleware...")
        app.add_middleware(
            CORSMiddleware,
            allow_origins=["http://localhost:3000", "http://localhost:5173"],
            allow_credentials=True,
            allow_methods=["*"],
            allow_headers=["*"],
        )
        
        print("  ✅ FastAPI app created successfully!")
        return True
        
    except Exception as e:
        print(f"❌ FastAPI app creation failed: {e}")
        traceback.print_exc()
        return False

if __name__ == "__main__":
    print("🚀 Chatbot Diagnostic Test")
    print("=" * 50)
    
    success = True
    
    success &= test_imports()
    if success:
        success &= test_initialization()
    if success:
        success &= test_fastapi_app()
    
    print("\n" + "=" * 50)
    if success:
        print("✅ All tests passed! Chatbot should start successfully.")
        sys.exit(0)
    else:
        print("❌ Some tests failed. Check the errors above.")
        sys.exit(1)
