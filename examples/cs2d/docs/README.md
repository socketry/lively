# CS2D Documentation

Welcome to the CS2D documentation! This directory contains comprehensive guides and references for playing and developing CS2D.

## 📚 Documentation Structure

### For Players

1. **[Quick Start Guide](./QUICK_START.md)** ⭐
   - Get playing in under 5 minutes
   - Essential controls and tips
   - Perfect for beginners

2. **[Complete Gameplay Guide](./GAMEPLAY_GUIDE.md)** 📖
   - Detailed mechanics explanation
   - Advanced strategies
   - Full control reference

3. **[Mac Optimization Guide](./GAMEPLAY_GUIDE.md#mac-optimization)** 🍎
   - Touchpad gesture controls
   - Performance settings
   - Mac-specific tips

### For Developers

4. **[Technical Architecture](./TECHNICAL.md)** 🔧
   - System design overview
   - Network protocol
   - Game state management

5. **[API Reference](./API.md)** 💻
   - Server endpoints
   - WebSocket events
   - Data structures

## 🎮 Quick Links

### Start Playing
- **Local Server**: `http://localhost:9292`
- **Required**: Ruby 3.2+, Modern browser
- **Recommended**: Chrome/Safari, Mac with touchpad

### Essential Controls
```
Move:    WASD
Aim:     Arrow Keys
Shoot:   Spacebar
Reload:  R
Use:     E
Buy:     B
```

### First-Time Setup
1. Install dependencies: `bundle install`
2. Start server: `ruby cs16_server.rb`
3. Open browser: `http://localhost:9292`
4. Press `B` to buy weapons
5. Complete objectives to win!

## 🗺️ Game Modes

| Mode | Players | Description |
|------|---------|-------------|
| **Classic** | 5v5 | Full competitive rules |
| **Casual** | 2v2 | Simplified, faster rounds |
| **Deathmatch** | FFA | Practice aim, instant respawn |
| **Retake** | 3v3 | CT retakes planted bomb sites |

## 🏆 Competitive Rules

- **Round Format**: First to 16 rounds wins
- **Round Time**: 1:55 per round
- **Bomb Timer**: 45 seconds
- **Buy Time**: 15 seconds
- **Freeze Time**: 5 seconds
- **Side Swap**: After round 15

## 💰 Economy Quick Reference

| Action | Reward |
|--------|--------|
| Round Win | $3250 |
| Round Loss | $1400 (+$500/loss) |
| Kill (Rifle) | $300 |
| Kill (AWP) | $100 |
| Kill (Knife) | $1500 |
| Bomb Plant | $800 |
| Bomb Defuse | $3500 |

## 🔧 Troubleshooting

### Common Issues

**Game Won't Load**
- Check Ruby version: `ruby --version` (need 3.2+)
- Install WEBrick: `gem install webrick`
- Check port 9292 is free

**Performance Issues**
- Close other browser tabs
- Enable hardware acceleration
- Use Chrome or Safari
- Reduce visual quality in settings

**Control Problems**
- Click game window to focus
- Check keyboard layout (US recommended)
- Disable browser extensions
- Try different browser

## 📊 System Requirements

### Minimum
- **OS**: Windows 10, macOS 10.15, Linux
- **Browser**: Chrome 90+, Safari 14+, Firefox 88+
- **RAM**: 2GB
- **Network**: Stable connection for multiplayer

### Recommended
- **OS**: macOS 12+ with touchpad
- **Browser**: Latest Chrome/Safari
- **RAM**: 4GB+
- **Display**: 1920x1080
- **Input**: Mechanical keyboard + gaming mouse

## 🚀 Advanced Features

### Mac Touchpad Gestures
- **Two-finger swipe**: Precise aiming
- **Two-finger tap**: Alternative fire
- **Pinch**: Zoom tactical view
- **Three-finger swipe**: Quick weapon switch

### Keyboard Shortcuts
- **F11**: Fullscreen toggle
- **H**: Show/hide help
- **M**: Toggle map overview
- **Tab**: Scoreboard
- **~**: Console (dev mode)

## 📈 Performance Metrics

Monitor your gameplay stats:
- **K/D Ratio**: Kills/Deaths
- **ADR**: Average Damage per Round
- **HS%**: Headshot percentage
- **KAST**: Rounds with Kill/Assist/Survived/Traded
- **Rating 2.0**: Overall performance score

## 🎯 Training Recommendations

### Daily Practice (20 min)
1. **Aim Training** (5 min)
   - 100 kills on aim map
   - Focus on headshot placement

2. **Movement** (5 min)
   - Practice strafing
   - Learn jump spots

3. **Utility** (5 min)
   - Smoke lineups
   - Flash timings

4. **Deathmatch** (5 min)
   - Real combat practice
   - Work on positioning

## 🌐 Community

### Join Us
- **Discord**: [CS2D Community](#)
- **Reddit**: [r/CS2D](#)
- **Twitter**: [@CS2DGame](#)

### Contribute
- Report bugs on [GitHub Issues](#)
- Submit pull requests
- Share strategies and guides
- Create custom maps

## 📝 License

CS2D is open source under the MIT License. See [LICENSE](../../../LICENSE.md) for details.

## 🙏 Credits

- **Framework**: Lively (Ruby)
- **Inspiration**: Counter-Strike 1.6
- **Optimization**: Mac touchpad support
- **Community**: All our players and contributors

---

**Need Help?** Start with the [Quick Start Guide](./QUICK_START.md) or dive into the [Complete Gameplay Guide](./GAMEPLAY_GUIDE.md).

**Ready to Play?** Launch your server and visit `http://localhost:9292` 🎮