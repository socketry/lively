# CS2D Startup Guide - Run All Servers with PNPM

## 🚀 Quick Start (One Command)

```bash
# Start everything with one command
pnpm dev
```

This will start:
- ✅ Frontend Dev Server (Port 5174)
- ✅ Backend WebSocket Server (Port 3001)

## 📦 Initial Setup

### 1. Install Dependencies
```bash
# Install all dependencies for root, frontend, and backend
pnpm install
```

### 2. Environment Setup (Optional)
The backend `.env` file is already configured with default values. If you need custom settings:
```bash
# Edit backend environment
nano src/backend/.env
```

### 3. Database Setup (Optional - for full features)
```bash
# Install PostgreSQL (Mac)
brew install postgresql
brew services start postgresql

# Install Redis (Mac)
brew install redis
brew services start redis

# Or start with the dev:all command
pnpm dev:all  # Includes Redis server
```

## 🎮 Available Commands

### Development Mode

| Command | Description | What it runs |
|---------|-------------|--------------|
| `pnpm dev` | **Start main servers** | Frontend + Backend |
| `pnpm dev:all` | Start everything | Frontend + Backend + Redis |
| `pnpm dev:frontend` | Frontend only | React app on port 5174 |
| `pnpm dev:backend` | Backend only | Node.js server on port 3001 |
| `pnpm dev:db` | Database only | Redis server |

### Production Mode

```bash
# Build everything
pnpm build

# Start production servers
pnpm start
```

### Individual Production Commands
```bash
pnpm start:frontend  # Serve built frontend
pnpm start:backend   # Production backend server
```

## 🖥️ Server Details

### Frontend Server
- **URL**: http://localhost:5174
- **Tech**: Vite + React + TypeScript
- **Features**: Hot reload, fast refresh

### Backend Server
- **URL**: http://localhost:3001
- **API**: http://localhost:3001/api
- **WebSocket**: ws://localhost:3001
- **Tech**: Node.js + Express + Socket.IO

### Quick Play Flow
1. Run `pnpm dev`
2. Open http://localhost:5174
3. Click "🎮 Quick Play (with Bots)"
4. Play immediately!

## 🛠️ Troubleshooting

### Port Already in Use
```bash
# Kill processes on specific ports
lsof -i :5174 | grep LISTEN | awk '{print $2}' | xargs kill -9
lsof -i :3001 | grep LISTEN | awk '{print $2}' | xargs kill -9
```

### Clear Dependencies
```bash
# Clean install
rm -rf node_modules frontend/node_modules pnpm-lock.yaml
pnpm install
```

### Check Running Servers
```bash
# See what's running
pnpm ls
ps aux | grep -E "vite|node|redis"
```

## 🎨 Terminal Output

When you run `pnpm dev`, you'll see:

```
[frontend] VITE v5.0.10  ready in 525 ms
[frontend] 
[frontend] ➜  Local:   http://localhost:5174/
[frontend] ➜  Network: use --host to expose
[backend ] 
[backend ] 🚀 CS2D Backend Server Starting...
[backend ] ✅ Server running on http://localhost:3001
[backend ] 🔌 WebSocket server ready
[backend ] 📊 API available at http://localhost:3001/api
```

## 📋 Features Available

### With `pnpm dev` (Basic)
- ✅ Full game with bots
- ✅ Quick Play mode
- ✅ Modern UI/UX
- ✅ Complete HUD system
- ✅ Grenades & player actions
- ✅ CS 1.6 authentic audio

### With `pnpm dev:all` (Full Stack)
All basic features plus:
- ✅ User authentication
- ✅ Matchmaking
- ✅ Leaderboards
- ✅ Persistent stats
- ✅ Anti-cheat
- ✅ Social features

## 🔥 Hot Tips

1. **Fast Restart**: `Ctrl+C` then `pnpm dev` again
2. **Watch Logs**: Colored output shows which server is logging
3. **Quick Play**: Best way to test - starts game instantly with bots
4. **Performance**: Game runs at 144+ FPS with all optimizations

## 📱 Mobile Testing

```bash
# Start with network exposure
pnpm dev -- --host

# Access from mobile device on same network
# Use your computer's IP: http://192.168.x.x:5174
```

## 🚢 Production Deployment

```bash
# 1. Build everything
pnpm build

# 2. Start production servers
NODE_ENV=production pnpm start

# Or with PM2
pm2 start ecosystem.config.js
```

## 📊 Monitoring

Check server health:
```bash
# Frontend status
curl http://localhost:5174

# Backend status
curl http://localhost:3001/api/status

# WebSocket test
wscat -c ws://localhost:3001
```

---

## ✨ Quick Commands Reference

```bash
pnpm dev          # Start coding! 🚀
pnpm dev:all      # Full stack mode 🎮
pnpm build        # Production build 📦
pnpm start        # Production mode 🌐
pnpm test         # Run tests 🧪
```

**That's it! Run `pnpm dev` and start playing!** 🎯