#!/bin/bash

# CS2D Hybrid Architecture Startup Script
# This script starts both the Lively lobby server and the static game server

echo "🎮 CS2D 混合架構啟動腳本"
echo "======================================"

# Check if Redis is running
echo "檢查 Redis 服務器狀態..."
if ! redis-cli ping > /dev/null 2>&1; then
    echo "⚠️  Redis 未運行，正在啟動 Redis..."
    redis-server --daemonize yes
    sleep 2
    
    if redis-cli ping > /dev/null 2>&1; then
        echo "✅ Redis 啟動成功"
    else
        echo "❌ Redis 啟動失敗，請手動啟動 Redis"
        exit 1
    fi
else
    echo "✅ Redis 已運行"
fi

# Function to cleanup background processes
cleanup() {
    echo -e "\n🛑 正在停止伺服器..."
    
    # Kill the static server
    if [ ! -z "$STATIC_PID" ]; then
        kill $STATIC_PID 2>/dev/null
        echo "✅ 靜態文件伺服器已停止"
    fi
    
    # Kill the lively server  
    if [ ! -z "$LIVELY_PID" ]; then
        kill $LIVELY_PID 2>/dev/null
        echo "✅ Lively 大廳伺服器已停止"
    fi
    
    echo "👋 CS2D 混合架構已停止"
    exit 0
}

# Set up signal handlers
trap cleanup SIGINT SIGTERM

echo ""
echo "🚀 啟動靜態文件伺服器 (端口 9293)..."
ruby static_server.rb 9293 > static_server.log 2>&1 &
STATIC_PID=$!

# Wait a moment for static server to start
sleep 2

# Check if static server started successfully
if ps -p $STATIC_PID > /dev/null; then
    echo "✅ 靜態文件伺服器啟動成功 (PID: $STATIC_PID)"
    echo "   - 房間頁面: http://localhost:9293/room.html"
    echo "   - 遊戲頁面: http://localhost:9293/game.html"
else
    echo "❌ 靜態文件伺服器啟動失敗"
    exit 1
fi

echo ""
echo "🚀 啟動 Lively 大廳伺服器 (端口 9292)..."
bundle exec lively ./application > lively_server.log 2>&1 &
LIVELY_PID=$!

# Wait a moment for lively server to start
sleep 3

# Check if lively server started successfully
if ps -p $LIVELY_PID > /dev/null; then
    echo "✅ Lively 大廳伺服器啟動成功 (PID: $LIVELY_PID)"
    echo "   - 大廳入口: http://localhost:9292"
else
    echo "❌ Lively 大廳伺服器啟動失敗"
    echo "   請檢查 lively_server.log 文件以獲取詳細錯誤信息"
    cleanup
    exit 1
fi

echo ""
echo "🎉 CS2D 混合架構啟動成功！"
echo "======================================"
echo "🌐 服務器狀態:"
echo "   📋 大廳 (Lively):     http://localhost:9292"
echo "   🏠 房間 (靜態):       http://localhost:9293/room.html" 
echo "   🎮 遊戲 (靜態):       http://localhost:9293/game.html"
echo "   🗃️  Redis:           localhost:6379"
echo ""
echo "🎯 完整遊戲流程:"
echo "   1. 訪問 http://localhost:9292 進入大廳"
echo "   2. 創建或加入房間 → 自動跳轉到房間等待頁面"
echo "   3. 房主點擊開始遊戲 → 進入遊戲頁面"
echo ""
echo "📝 日誌文件:"
echo "   - Lively 服務器: lively_server.log"
echo "   - 靜態文件服務器: static_server.log"
echo ""
echo "⚡ 按 Ctrl+C 停止所有服務器"
echo "======================================"

# Wait for background processes
wait