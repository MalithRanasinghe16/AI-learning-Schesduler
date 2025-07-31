#!/bin/bash
echo "🚀 Setting up AI Learning Scheduler..."

# Check if Node.js is installed
if ! command -v node &> /dev/null; then
    echo "❌ Node.js is not installed. Please install Node.js v18+ first."
    exit 1
fi

# Check if Python is installed
if ! command -v python3 &> /dev/null; then
    echo "❌ Python is not installed. Please install Python 3.9+ first."
    exit 1
fi

echo "✅ Prerequisites check passed"

# Install Node.js dependencies
echo "📦 Installing Node.js dependencies..."
npm install

if [ $? -ne 0 ]; then
    echo "❌ Failed to install Node.js dependencies"
    exit 1
fi

# Setup chatbot virtual environment
echo "🐍 Setting up Python virtual environment..."
cd chatbot

# Create virtual environment
python3 -m venv .venv

# Activate virtual environment
source .venv/bin/activate

# Install Python dependencies
echo "📦 Installing Python dependencies..."
pip install -r requirements.txt

if [ $? -ne 0 ]; then
    echo "❌ Failed to install Python dependencies"
    exit 1
fi

# Download spaCy language model
echo "🔤 Downloading spaCy English model..."
python -m spacy download en_core_web_sm

# Create environment files if they don't exist
if [ ! -f .env ]; then
    cp .env.example .env
    echo "📄 Created chatbot/.env - please configure it"
fi

cd ../server
if [ ! -f .env ]; then
    cp .env.example .env
    echo "📄 Created server/.env - please configure it"
fi

cd ..

echo ""
echo "🎉 Setup complete!"
echo ""
echo "📝 Next steps:"
echo "1. Configure your environment files:"
echo "   - server/.env (database connection, JWT secret)"
echo "   - chatbot/.env (backend URL, API keys)"
echo ""
echo "2. Start the application:"
echo "   npm run start:all"
echo ""
echo "3. Access the application:"
echo "   - Frontend: http://localhost:5173"
echo "   - Backend: http://localhost:5000"
echo "   - Chatbot: http://localhost:8000"
echo ""
echo "💡 For detailed instructions, see SETUP.md"
