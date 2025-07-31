#!/bin/bash
echo "🚀 Starting AI Learning Scheduler..."

# Function to check if a port is in use
check_port() {
    if lsof -Pi :$1 -sTCP:LISTEN -t >/dev/null ; then
        echo "⚠️  Port $1 is already in use!"
        return 1
    fi
    return 0
}

# Check required ports
echo "🔍 Checking ports..."
check_port 5173 || exit 1
check_port 5000 || exit 1
check_port 8000 || exit 1

echo "✅ All ports are available"

# Start services in background
echo "🌐 Starting frontend (port 5173)..."
npm run dev &
FRONTEND_PID=$!

echo "🔧 Starting backend (port 5000)..."
npm run dev:server &
BACKEND_PID=$!

echo "🤖 Starting chatbot (port 8000)..."
npm run dev:chatbot:unix &
CHATBOT_PID=$!

# Wait a moment for services to start
sleep 3

echo ""
echo "🎉 All services started successfully!"
echo ""
echo "📱 Access your application:"
echo "   Frontend:  http://localhost:5173"
echo "   Backend:   http://localhost:5000"
echo "   Chatbot:   http://localhost:8000"
echo "   API Docs:  http://localhost:8000/docs"
echo ""
echo "⏹️  To stop all services, press Ctrl+C"

# Function to cleanup on exit
cleanup() {
    echo ""
    echo "🛑 Stopping all services..."
    kill $FRONTEND_PID $BACKEND_PID $CHATBOT_PID 2>/dev/null
    echo "✅ All services stopped"
    exit 0
}

# Trap cleanup function on script exit
trap cleanup INT TERM

# Wait for user to stop the services
wait
