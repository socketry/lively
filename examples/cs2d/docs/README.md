# 🎮 CS2D - Counter-Strike 2D Web Platform

[![Ruby](https://img.shields.io/badge/Ruby-3.0+-red.svg)](https://www.ruby-lang.org/)
[![Docker](https://img.shields.io/badge/Docker-Ready-blue.svg)](https://www.docker.com/)
[![License](https://img.shields.io/badge/License-MIT-green.svg)](LICENSE)

**CS2D** is a production-ready, browser-based 2D implementation of Counter-Strike 1.6, featuring authentic gameplay mechanics, Docker containerization, and a comprehensive tile-based mapping system.

## ✨ Features

- 🎯 **Authentic CS 1.6 Gameplay** - All weapons, mechanics, and economics faithfully recreated
- 🗺️ **Tile-Based Map System** - Visual map editor with 4 classic CS maps
- 🐳 **Docker Containerized** - Production-ready deployment with one command
- 🌍 **Internationalization** - English and Traditional Chinese support
- 🤖 **AI Bot System** - Multiple difficulty levels for single-player practice
- ⚡ **High Performance** - 60 FPS rendering, <10% CPU usage
- 🔄 **Real-time Multiplayer** - WebSocket-based gameplay with Redis backend

## 🚀 Quick Start

### Docker Deployment (Recommended)

```bash
# Clone repository
git clone https://github.com/yourusername/cs2d.git
cd cs2d

# Start with Docker
make setup && make up

# Access the game
# Lobby:     http://localhost:9292
# Game:      http://localhost:9293
# Map Editor: http://localhost:9293/map_editor.html
```

### Manual Setup

```bash
# Install dependencies
bundle install

# Start Redis
redis-server

# Run servers
./start_hybrid_servers.sh
```

## 🎮 Game Controls

### Movement & Combat

- **WASD** - Move (hold Shift to run)
- **Mouse** - Aim and shoot
- **R** - Reload
- **B** - Open buy menu
- **Tab** - Scoreboard
- **T** - Chat

### Quick Buy

- **1-5** - Quick buy weapons
  - 1: AK-47 ($2700)
  - 2: M4A1 ($3100)
  - 3: AWP ($4750)
  - 4: Desert Eagle ($700)
  - 5: Armor ($650)

## 🏗️ Architecture

CS2D uses a microservices architecture with Docker containers:

```
┌─────────────┐     ┌─────────────┐     ┌─────────────┐
│   Nginx     │────▶│    Lobby    │────▶│    Redis    │
│  (Proxy)    │     │  (Port 9292)│     │  (Storage)  │
└─────────────┘     └─────────────┘     └─────────────┘
       │                   │                    ▲
       ▼                   ▼                    │
┌─────────────┐     ┌─────────────┐            │
│    Game     │     │     API     │────────────┘
│ (Port 9293) │     │ (Port 9294) │
└─────────────┘     └─────────────┘
```

## 🗺️ Map Editor

Create custom maps with the built-in visual editor:

- 18 different tile types with unique properties
- Drawing tools: brush, line, rectangle, fill
- 50-state undo/redo system
- Import/export JSON map format
- Real-time collision preview

Access at: `http://localhost:9293/map_editor.html`

## 🎯 Game Modes

- **Deathmatch** - Free-for-all combat
- **Team Deathmatch** - Team-based warfare
- **Defuse** - Classic bomb defusal mode
- **Practice** - Train with bots

## 📚 Documentation

- [Quick Start Guide](docs/QUICK_START.md) - Get playing in 5 minutes
- [Gameplay Guide](docs/GAMEPLAY_GUIDE.md) - Complete controls and strategies
- [Technical Documentation](docs/TECHNICAL.md) - Architecture and development
- [Docker Deployment](DOCKER_DEPLOYMENT.md) - Container orchestration details
- [Tile Map System](TILE_MAP_SYSTEM_COMPLETION.md) - Mapping system documentation

## 🛠️ Development

### Project Structure

```
cs2d/
├── Docker/              # Container configurations
├── application.rb       # Main entry point
├── game/               # Game logic modules
│   ├── tile_map_system.rb
│   ├── player.rb
│   ├── game_room.rb
│   └── ...
├── public/_static/     # Client-side code
├── cstrike/           # Game assets
└── docs/              # Documentation
```

### Running Tests

```bash
# Ruby tests
bundle exec rspec

# Browser tests (in docs/testing/)
npx playwright test

# Linting
bundle exec rubocop
```

## 🤝 Contributing

Contributions are welcome! Please read our contributing guidelines before submitting PRs.

1. Fork the repository
2. Create your feature branch (`git checkout -b feature/amazing-feature`)
3. Commit your changes (`git commit -m 'Add amazing feature'`)
4. Push to the branch (`git push origin feature/amazing-feature`)
5. Open a Pull Request

## 📊 Performance

- **Startup Time**: <30 seconds (full Docker stack)
- **Memory Usage**: ~200MB (all containers)
- **CPU Usage**: <10% during active gameplay
- **Frame Rate**: 60 FPS canvas rendering
- **Player Capacity**: 50+ concurrent per instance

## 🚧 Roadmap

- [ ] Additional classic CS maps
- [ ] Competitive matchmaking system
- [ ] Replay system
- [ ] Advanced bot AI
- [ ] Steam workshop integration
- [ ] Mobile touch controls

## 📄 License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.

## 🙏 Acknowledgments

- Original Counter-Strike by Valve Corporation
- [Lively framework](https://github.com/socketry/lively) for Ruby WebSocket support
- All contributors and testers

## 📞 Support

- **Issues**: [GitHub Issues](https://github.com/yourusername/cs2d/issues)
- **Discussions**: [GitHub Discussions](https://github.com/yourusername/cs2d/discussions)

---

**Built with ❤️ using Ruby, Docker, and WebSockets**
