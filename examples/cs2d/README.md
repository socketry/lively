# CS2D - 2D Counter Strike

A 2D multiplayer Counter-Strike game built with the Lively framework for Ruby.

## Features

- Real-time multiplayer combat
- Terrorists vs Counter-Terrorists team mode
- Weapon purchase system
- Round-based gameplay mechanics
- Economy system with money management
- Real-time chat functionality
- Mac touchpad gesture support

## Quick Start

### Install Dependencies

```bash
cd examples/cs2d
bundle install
```

### Start Game Server

```bash
bundle exec lively application.rb
```

Then open your browser and navigate to http://localhost:9292

## Game Controls (Mac Touchpad Optimized)

### Movement & Combat
- **WASD** - Move (hold Shift to run)
- **Arrow Keys/IJKL** - Control aiming direction
  - Left/Right or J/L - Rotate aim
  - Up/Down or I/K - Adjust aim distance
- **Spacebar** - Shoot (or single finger tap)
- **R** - Reload
- **Q** - Quick 180° turn
- **V** - Toggle auto-aim assist

### Touchpad Gestures
- **Two-finger horizontal swipe** - Rotate aim angle
- **Two-finger vertical swipe** - Adjust aim distance
- **Two-finger tap** - Secondary fire
- **Single-finger tap** - Primary fire

### Interface Controls
- **B** - Open buy menu
- **1-5** - Quick buy weapons
  - 1: AK-47
  - 2: M4A1
  - 3: AWP
  - 4: Desert Eagle
  - 5: Armor
- **Tab** - View scoreboard
- **T** - Open chat

## Game Rules

### Round System
- 2 minutes per round
- Eliminate opposing team to win
- First team to win 16 rounds wins the match

### Economy System
- Starting money: $800
- Kill reward: $300
- Round win: $3250
- Round loss: $1400 (+ loss bonus)

### Weapon Prices
- **Pistols**
  - Glock-18: Default (T)
  - USP-S: Default (CT)
  - Desert Eagle: $700

- **Rifles**
  - AK-47: $2700
  - M4A1: $3100
  - AWP: $4750

- **SMGs**
  - MP5: $1500
  - P90: $2350

- **Equipment**
  - Kevlar Vest: $650
  - Kevlar + Helmet: $1000

## Architecture

### Backend (Ruby/Lively)
- `application.rb` - Main application entry point
- `game/game_room.rb` - Game room logic
- `game/player.rb` - Player class
- `game/bullet.rb` - Bullet physics
- `game/game_state.rb` - Game state management

### Frontend (JavaScript)
- Canvas 2D rendering
- WebSocket real-time communication
- Client-side prediction and interpolation

## Roadmap

- [ ] Bomb defusal mode
- [ ] Hostage rescue mode
- [ ] Map system with multiple layouts
- [ ] Grenade system (smoke, flash, HE)
- [ ] Voice communication
- [ ] Match statistics tracking
- [ ] Leaderboards and rankings
- [ ] Custom room creation

## Performance Optimizations

- Object pooling for bullet management
- Viewport culling for optimized rendering
- State compression to reduce network traffic
- Client-side prediction to minimize perceived latency

## Documentation

For detailed documentation, see the [docs](./docs/) directory:
- [Quick Start Guide](./docs/QUICK_START.md) - Get playing in 5 minutes
- [Gameplay Guide](./docs/GAMEPLAY_GUIDE.md) - Complete controls and strategies
- [Technical Documentation](./docs/TECHNICAL.md) - Architecture and development

## Contributing

Contributions are welcome! Please feel free to submit Issues and Pull Requests.

## License

MIT License