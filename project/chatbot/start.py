#!/usr/bin/env python3
"""
Startup script for AI Learning Scheduler Chatbot
"""
import sys
import subprocess
import os
import platform

def check_python_version():
    """Check if Python version is compatible"""
    if sys.version_info < (3, 8):
        print("Error: Python 3.8 or higher is required")
        sys.exit(1)
    print(f"✓ Python {sys.version.split()[0]} detected")

def install_dependencies():
    """Install required Python packages"""
    print("Installing dependencies...")
    try:
        subprocess.check_call([sys.executable, "-m", "pip", "install", "-r", "requirements.txt"])
        print("✓ Dependencies installed successfully")
    except subprocess.CalledProcessError as e:
        print(f"Error installing dependencies: {e}")
        sys.exit(1)

def download_spacy_model():
    """Download spaCy English model"""
    print("Downloading spaCy English model...")
    try:
        subprocess.check_call([sys.executable, "-m", "spacy", "download", "en_core_web_sm"])
        print("✓ spaCy model downloaded successfully")
    except subprocess.CalledProcessError as e:
        print(f"Warning: Could not download spaCy model: {e}")
        print("You may need to run: python -m spacy download en_core_web_sm")

def setup_environment():
    """Setup environment variables"""
    if not os.path.exists('.env'):
        print("Creating .env file from template...")
        try:
            with open('.env.example', 'r') as example:
                content = example.read()
            with open('.env', 'w') as env_file:
                env_file.write(content)
            print("✓ .env file created")
            print("⚠️  Please update the .env file with your actual configuration")
        except FileNotFoundError:
            print("Warning: .env.example not found")
    else:
        print("✓ .env file already exists")

def start_chatbot():
    """Start the chatbot service"""
    print("\nStarting AI Learning Scheduler Chatbot...")
    print("Server will be available at: http://localhost:8000")
    print("API documentation at: http://localhost:8000/docs")
    print("\nPress Ctrl+C to stop the server\n")
    
    try:
        subprocess.run([sys.executable, "-m", "uvicorn", "main:app", "--reload", "--host", "0.0.0.0", "--port", "8000"])
    except KeyboardInterrupt:
        print("\n✓ Chatbot service stopped")
    except FileNotFoundError:
        print("Error: uvicorn not found. Please install dependencies first.")

def main():
    """Main setup and startup function"""
    print("=== AI Learning Scheduler Chatbot Setup ===\n")
    
    # Check Python version
    check_python_version()
    
    # Check if this is first run
    if not os.path.exists('requirements.txt'):
        print("Error: requirements.txt not found. Please run from the chatbot directory.")
        sys.exit(1)
    
    # Setup environment
    setup_environment()
    
    # Ask user what to do
    print("\nWhat would you like to do?")
    print("1. Install dependencies and setup")
    print("2. Start chatbot (dependencies must be installed)")
    print("3. Full setup and start")
    
    choice = input("\nEnter your choice (1-3): ").strip()
    
    if choice == "1":
        install_dependencies()
        download_spacy_model()
        print("\n✓ Setup complete! You can now start the chatbot with option 2.")
    
    elif choice == "2":
        start_chatbot()
    
    elif choice == "3":
        install_dependencies()
        download_spacy_model()
        start_chatbot()
    
    else:
        print("Invalid choice. Please run the script again.")

if __name__ == "__main__":
    main()
