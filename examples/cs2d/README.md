# CS2D - Counter-Strike 2D Web Game 🎮

**✅ Production Ready** - A high-performance, secure browser-based 2D reimplementation of Counter-Strike with authentic CS 1.6 audio, multiplayer support, and intelligent AI bots. Now featuring 144+ FPS performance, spatial collision optimization, and comprehensive security hardening.

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

- ⚡ **144+ FPS Performance** - Optimized rendering with object pooling
- 🔒 **Security Hardened** - XSS protection, input sanitization
- 🎵 **Authentic CS 1.6 Audio** - Simplified audio system with fallback
- 🤖 **Smart Bot AI** - Advanced bots with personality traits
- 🌐 **Multiplayer Support** - Real-time WebSocket networking
- 🎨 **Modern UI** - React 18 with optimized components
- 🎯 **Spatial Collision** - 90% fewer collision checks
- 📦 **Object Pooling** - 75% reduction in garbage collection
- ⚙️ **Configuration System** - Centralized game constants
- 🌍 **i18n Support** - Multiple languages
- ♿ **Accessibility** - Full keyboard navigation
- ✨ **Visual Effects** - Animated backgrounds and smooth transitions

## 🏗️ Architecture

```
Frontend (React 18)   →    Game Engine     →    Multiplayer
     ↓                         ↓                     ↓
  Components/Hooks       GameCore.ts          WebSocketBridge
     ↓                         ↓                     ↓
  DOMPurify            Modular Systems       State Manager
  (Security)           (Input/Collision)      (Simplified)
```

## 📁 Project Structure

```
cs2d/
├── frontend/          # React 18 UI application
├── src/
│   ├── game/         # Game engine code
│   │   ├── systems/  # Modular systems (Input, Collision)
│   │   ├── config/   # Game constants configuration
│   │   └── utils/    # Object pool, Spatial grid, Performance
│   └── types/        # TypeScript definitions
├── public/cstrike/   # CS 1.6 assets
├── tests/            # Test suites
├── CLAUDE.md         # Detailed documentation
├── ARCHITECTURE.md   # System architecture
├── PERFORMANCE_IMPROVEMENTS.md  # Performance docs
└── SECURITY_IMPROVEMENTS.md      # Security docs
```

## 📈 Performance & Security

### Performance Metrics
- **FPS**: 144+ stable (up from 121)
- **CPU Usage**: 25% (down from 40%)
- **Memory**: < 10 MB/s allocation (down from 484 MB/s)
- **Collision Checks**: 50/frame (down from 500)
- **GC Pauses**: 5ms (down from 20ms)

### Security Features
- ✅ XSS Protection with DOMPurify
- ✅ Input sanitization on all user inputs
- ✅ Configuration validation
- ✅ No hardcoded secrets
- ✅ Safe HTML rendering

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

### Completed ✅
- [x] Core game engine (144+ FPS)
- [x] CS 1.6 audio system (simplified)
- [x] Bot AI system (personality traits)
- [x] Multiplayer framework
- [x] Performance optimization (object pooling, spatial grid)
- [x] Security hardening (XSS protection)
- [x] Modular architecture
- [x] Configuration system

### In Progress 🚧
- [ ] Map editor
- [ ] Competitive matchmaking
- [ ] Voice chat
- [ ] Replay system
- [ ] Server-side validation
- [ ] WebGL renderer

## 📖 Documentation

- [CLAUDE.md](./CLAUDE.md) - Comprehensive project documentation
- [ARCHITECTURE.md](./ARCHITECTURE.md) - System architecture overview
- [PERFORMANCE_IMPROVEMENTS.md](./PERFORMANCE_IMPROVEMENTS.md) - Performance optimization details
- [SECURITY_IMPROVEMENTS.md](./SECURITY_IMPROVEMENTS.md) - Security audit and fixes

## 🤝 Contributing

Contributions are welcome! Please read our contributing guidelines and submit PRs.

## 📄 License

MIT License - see [LICENSE](./LICENSE) file

---

**Version**: 0.3.0 | **Status**: Beta | **Last Updated**: 2025-08-23