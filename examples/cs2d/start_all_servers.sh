#!/bin/bash

# Start all CS2D servers on different ports for proper routing

echo "🚀 Starting CS2D Multi-Server Setup..."

# Kill any existing processes on our ports
echo "🧹 Cleaning up old processes..."
lsof -ti:9292 | xargs kill -9 2>/dev/null
lsof -ti:9293 | xargs kill -9 2>/dev/null  
lsof -ti:9294 | xargs kill -9 2>/dev/null
sleep 2

# Start lobby on port 9292
echo "🏠 Starting Lobby on port 9292..."
PORT=9292 bundle exec lively ./async_redis_lobby_i18n &
LOBBY_PID=$!
echo "   Lobby PID: $LOBBY_PID"

# Start room waiting on port 9293
echo "⏳ Starting Room Waiting on port 9293..."
PORT=9293 bundle exec lively ./room_waiting &
ROOM_PID=$!
echo "   Room PID: $ROOM_PID"

# Start game on port 9294
echo "🎮 Starting Game on port 9294..."
PORT=9294 bundle exec lively ./cs16_multiplayer_view &
GAME_PID=$!
echo "   Game PID: $GAME_PID"

echo ""
echo "✅ All servers started!"
echo "   Lobby: http://localhost:9292"
echo "   Room:  http://localhost:9293/room"
echo "   Game:  http://localhost:9294/game"
echo ""
echo "Press Ctrl+C to stop all servers..."

# Wait for interrupt
trap "echo '🛑 Stopping all servers...'; kill $LOBBY_PID $ROOM_PID $GAME_PID 2>/dev/null; exit" INT
wait