#!/bin/bash

# CS2D Development Server Startup Script
# This script starts both frontend and backend servers

echo "🎮 Starting CS2D Development Servers..."

# Kill any existing processes on the ports
echo "📍 Checking for existing processes..."
lsof -ti:3000 | xargs kill -9 2>/dev/null
lsof -ti:9292 | xargs kill -9 2>/dev/null
lsof -ti:9294 | xargs kill -9 2>/dev/null

# Start backend server
echo "🚀 Starting backend server (Ruby/Falcon) on port 9292..."
(cd "$(dirname "$0")/.." && ./scripts/run_app.sh) &
BACKEND_PID=$!

# Wait for backend to start
sleep 3

# Start frontend server
echo "🚀 Starting frontend server (React/Vite) on port 3000..."
(cd "$(dirname "$0")/../frontend" && npm run dev) &
FRONTEND_PID=$!

echo ""
echo "✅ Servers started successfully!"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo "🎮 CS2D is now running!"
echo ""
echo "🌐 Frontend: http://localhost:3000"
echo "🔧 Backend:  http://localhost:9292"
echo ""
echo "📝 Press Ctrl+C to stop all servers"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"

# Function to handle script termination
cleanup() {
    echo ""
    echo "🛑 Stopping servers..."
    kill $FRONTEND_PID 2>/dev/null
    kill $BACKEND_PID 2>/dev/null
    pkill -f "ruby.*main_server" 2>/dev/null
    pkill -f "vite" 2>/dev/null
    echo "✅ All servers stopped"
    exit 0
}

# Set up trap to handle Ctrl+C
trap cleanup INT TERM

# Wait for background processes
wait