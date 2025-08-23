# CS2D - Counter-Strike 2D Web Game 🎮

A browser-based 2D reimplementation of Counter-Strike with authentic CS 1.6 audio, multiplayer support, and AI bots.

![TypeScript](https://img.shields.io/badge/TypeScript-5.0-blue)
![React](https://img.shields.io/badge/React-18.0-61dafb)
![Vite](https://img.shields.io/badge/Vite-5.0-646cff)
![Node](https://img.shields.io/badge/Node-18+-green)

## 🚀 Quick Start

```bash
# Clone the repository
git clone https://github.com/yourusername/cs2d.git
cd cs2d

# Install dependencies
npm install
cd frontend && npm install && cd ..

# Start the game
cd frontend && npm run dev

# Open in browser
# http://localhost:5174
```

## 🎮 How to Play

### Controls
- **WASD** - Move
- **Mouse** - Aim & Shoot
- **R** - Reload
- **B** - Buy Menu
- **Tab** - Scoreboard
- **Z/X/C/V** - Radio Commands

### Game Modes
- **Deathmatch** - Free for all combat
- **Team Deathmatch** - Team-based combat
- **Bomb Defusal** - Classic CS mode
- **Hostage Rescue** - Save the hostages

## ✨ Features

- 🎵 **Authentic CS 1.6 Audio** - 464 original sounds
- 🤖 **Smart Bot AI** - Bots with personality traits
- 🌐 **Multiplayer Support** - Real-time WebSocket networking
- 🎨 **Modern UI** - React-based responsive interface
- 🏃 **60 FPS Performance** - Optimized game engine
- 🌍 **i18n Support** - Multiple languages
- ♿ **Accessibility** - Full keyboard navigation

## 🏗️ Architecture

```
Frontend (React)     →    Game Engine    →    Multiplayer
     ↓                        ↓                    ↓
  UI/Lobby              GameCore.ts         WebSocketBridge
     ↓                        ↓                    ↓
  Room Browser          Physics/AI         State Manager
```

## 📁 Project Structure

```
cs2d/
├── frontend/          # React UI application
├── src/game/         # Game engine code
├── public/cstrike/   # CS 1.6 assets
├── tests/            # Test suites
└── CLAUDE.md         # Detailed documentation
```

## 🛠️ Development

### Prerequisites
- Node.js 18+
- npm 9+

### Building for Production
```bash
# Build frontend
cd frontend && npm run build

# Run production server
npm run serve
```

### Testing
```bash
# Run all tests
npm test

# E2E tests with UI
npm run test:e2e:ui
```

## 🎯 Roadmap

- [x] Core game engine
- [x] CS 1.6 audio system
- [x] Bot AI system
- [x] Multiplayer framework
- [ ] Map editor
- [ ] Competitive matchmaking
- [ ] Voice chat
- [ ] Replay system

## 📖 Documentation

For detailed technical documentation, see [CLAUDE.md](./CLAUDE.md)

## 🤝 Contributing

Contributions are welcome! Please read our contributing guidelines and submit PRs.

## 📄 License

MIT License - see [LICENSE](./LICENSE) file

---

**Version**: 0.2.0 | **Status**: Alpha | **Last Updated**: 2025-08-22