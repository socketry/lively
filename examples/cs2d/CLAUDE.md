# CS2D - TypeScript Counter-Strike 2D Game

## Project Overview

CS2D is a browser-based 2D reimplementation of Counter-Strike featuring authentic CS 1.6 audio, multiplayer support, and bot AI. Built with TypeScript, React, and modern web technologies.

## Architecture

### Core Systems

#### 1. GameCore Engine (`src/game/GameCore.ts`)
- Main game loop and entity management
- Physics simulation and collision detection
- Player and bot AI management
- Weapon system integration
- State synchronization for multiplayer

Key features:
- 60 FPS game loop with delta time compensation
- Entity Component System (ECS) pattern for game objects
- Authentic CS 1.6 movement physics
- Surface-based movement sounds

#### 2. CS 1.6 Authentic Audio System (`src/game/audio/`)
- **CS16AudioManager**: Main audio controller with 3D positional audio
- **CS16SoundPreloader**: Async sound loading with caching (464 authentic sounds)
- **CS16BotVoiceSystem**: Bot personality-based voice lines and radio commands
- **CS16AmbientSystem**: Dynamic ambient sounds based on map location

Sound categories:
- Weapon sounds (fire, reload, empty clip)
- Player sounds (footsteps, damage, death)
- Radio commands (Z/X/C menus)
- Ambient map sounds
- UI feedback sounds

#### 3. Multiplayer State Management

##### GameStateManager (`src/game/GameStateManager.ts`)
- Network event synchronization
- State snapshot creation and application
- Event throttling for performance
- Audio event broadcasting
- Offline/online mode switching

Network events handled:
- `player_move`, `weapon_fire`, `weapon_reload`
- `player_damage`, `player_death`
- `radio_command`, `footstep`
- `bomb_plant`, `bomb_defuse`
- `round_start`, `round_end`

##### WebSocketGameBridge (`src/game/WebSocketGameBridge.ts`)
- Bridges GameCore with WebSocket multiplayer
- Room management (join/leave/create)
- Host/client architecture
- Event throttling (20 events/sec per type)
- Positional audio synchronization

Configuration:
```typescript
{
  enableVoiceChat: true,
  enablePositionalAudio: true,
  maxPlayersPerRoom: 10,
  tickRate: 64
}
```

### Frontend Architecture

#### React Components (`frontend/src/components/`)
- **EnhancedModernLobby**: Main game lobby with room browser
- **GameCanvas**: Game rendering and HUD overlay
- **EnhancedWaitingRoom**: Pre-game room management
- **LanguageSwitcher**: i18n support

#### Context Providers (`frontend/src/contexts/`)
- **AppContext**: Global app state
- **AuthContext**: Player authentication
- **WebSocketContext**: Real-time communication
- **GameContext**: Game state management
- **I18nContext**: Internationalization

## Development Setup

### Prerequisites
```bash
# Node.js 18+ and npm 9+
node --version  # Should be >= 18.0.0
npm --version   # Should be >= 9.0.0
```

### Installation
```bash
# Install dependencies
npm install
cd frontend && npm install && cd ..

# Install Playwright browsers for testing
npx playwright install chromium
```

### Running the Game

#### Development Mode
```bash
# Run frontend dev server (React app)
cd frontend && npm run dev
# Opens at http://localhost:5174 or next available port

# Run backend WebSocket server (optional, for multiplayer)
npm run server
```

#### Production Build
```bash
# Build frontend
cd frontend && npm run build

# Build complete project
npm run build
```

## Testing

### Manual Testing Checklist
1. **Lobby System**
   - [ ] Room creation with bot configuration
   - [ ] Room joining and leaving
   - [ ] Quick play with bots
   - [ ] Room filtering and search

2. **Game Engine**
   - [ ] Player movement (WASD)
   - [ ] Mouse aim and shooting
   - [ ] Weapon switching and reloading
   - [ ] Bot AI behavior

3. **Audio System**
   - [ ] Weapon sounds play correctly
   - [ ] Footsteps match surface type
   - [ ] Radio commands work (Z/X/C/V keys)
   - [ ] 3D positional audio

4. **Multiplayer** (when WebSocket server running)
   - [ ] Room synchronization
   - [ ] Player state updates
   - [ ] Network event handling
   - [ ] Lag compensation

### Automated Testing
```bash
# Run all tests
npm test

# Run Playwright E2E tests
npm run test:e2e

# Run with UI mode
npm run test:e2e:ui
```

## Common Issues & Solutions

### Issue: Game canvas is black
**Solution**: The renderer needs sprites/textures to load. Check browser console for asset loading errors.

### Issue: "Cannot find module '@vitejs/plugin-react'"
**Solution**: Install the React plugin:
```bash
npm install -D @vitejs/plugin-react
```

### Issue: WebSocket connection errors
**Solution**: The WebSocket server is optional for single-player. Errors can be ignored for offline play.

### Issue: Audio not playing
**Solution**: 
1. Check browser autoplay policies
2. Ensure user interaction before audio playback
3. Verify sound files exist in `public/cstrike/sound/`

### Issue: Poor performance
**Solution**:
1. Check FPS counter (should be 50-60)
2. Reduce number of bots
3. Disable some visual effects
4. Check browser dev tools Performance tab

## Project Structure

```
cs2d/
├── frontend/                 # React frontend application
│   ├── src/
│   │   ├── components/      # React components
│   │   ├── contexts/        # React contexts
│   │   ├── services/        # API and WebSocket services
│   │   ├── styles/          # SCSS styles
│   │   └── main.tsx         # React entry point
│   └── vite.config.ts       # Frontend Vite config
├── src/
│   ├── game/                # Game engine code
│   │   ├── audio/          # CS 1.6 audio system
│   │   ├── maps/           # Map system
│   │   ├── physics/        # Physics engine
│   │   ├── renderer/       # Canvas renderer
│   │   ├── weapons/        # Weapon system
│   │   ├── GameCore.ts     # Main game engine
│   │   ├── GameStateManager.ts  # State sync
│   │   └── WebSocketGameBridge.ts  # Multiplayer bridge
│   └── types/              # TypeScript type definitions
├── public/                  # Static assets
│   └── cstrike/            # CS 1.6 assets
│       └── sound/          # Audio files
├── tests/                   # Test files
│   └── e2e/                # Playwright E2E tests
├── index.html              # Main HTML entry
├── vite.config.ts          # Root Vite config
├── package.json            # Project dependencies
└── tsconfig.json           # TypeScript config
```

## Key Features Implemented

### ✅ Completed
- CS 1.6 authentic audio system with 464 sounds
- GameCore engine with ECS architecture
- Multiplayer state management and synchronization
- WebSocket game bridge for real-time multiplayer
- Bot AI with personality system
- React frontend with modern UI/UX
- Room management and lobby system
- i18n support for multiple languages
- Accessibility features (ARIA labels, keyboard nav)

### 🚧 In Progress
- Map rendering and collision detection
- Full weapon system implementation
- Advanced bot AI behaviors
- Voice chat integration
- Spectator mode

### 📋 Planned
- Competitive matchmaking
- Player statistics and leaderboards
- Custom map editor
- Replay system
- Steam authentication

## Performance Optimizations

1. **Event Throttling**: Network events limited to 20/sec per type
2. **Sound Caching**: LRU cache with 50MB limit for audio
3. **Lazy Loading**: Components and assets loaded on demand
4. **Canvas Optimization**: Hardware acceleration and layer management
5. **State Batching**: Multiple updates combined into single render

## Contributing

### Code Style
- TypeScript strict mode enabled
- ESLint and Prettier configured
- Functional components with hooks
- Immutable state updates

### Git Workflow
```bash
# Create feature branch
git checkout -b feature/your-feature

# Make changes and test
npm test

# Commit with conventional commits
git commit -m "feat(game): add new feature"

# Push and create PR
git push origin feature/your-feature
```

### Commit Convention
- `feat`: New feature
- `fix`: Bug fix
- `docs`: Documentation
- `style`: Code style
- `refactor`: Code refactoring
- `test`: Testing
- `chore`: Maintenance

## Resources

- [Project Repository](https://github.com/yourusername/cs2d)
- [CS 1.6 Sound Reference](https://www.sounds-resource.com/pc_computer/counterstrike/)
- [React Documentation](https://react.dev)
- [TypeScript Documentation](https://www.typescriptlang.org)
- [Vite Documentation](https://vitejs.dev)

## License

MIT License - See LICENSE file for details

---

Last Updated: 2025-08-22
Version: 0.2.0