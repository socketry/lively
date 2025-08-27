# 🎮 CS2D TypeScript SPA - Developer Guide

## Architecture
**Pure TypeScript/React SPA** - No Ruby backend dependencies
- **Frontend**: React 18 + TypeScript + Vite
- **Styling**: TailwindCSS + CSS Modules
- **Game Engine**: Canvas API with WebSocket multiplayer
- **State Management**: React Context API
- **Testing**: Playwright E2E + Vitest unit tests

## Quick Start

```bash
cd frontend
npm install
npm run dev
# Open http://localhost:3000
```

## Available Scripts

```bash
npm run dev        # Start dev server (port 3000)
npm run build      # Production build
npm run preview    # Preview production build
npm run test       # Run unit tests
npm run test:e2e   # Run Playwright E2E tests
npm run lint       # ESLint + Prettier check
npm run typecheck  # TypeScript type checking
```

## Project Structure

```
frontend/
├── src/
│   ├── components/    # React components
│   ├── contexts/      # React contexts
│   ├── views/         # Page components
│   ├── services/      # WebSocket, API services
│   ├── types/         # TypeScript types
│   └── utils/         # Helper functions
├── tests/
│   ├── e2e/          # Playwright E2E tests
│   └── unit/         # Vitest unit tests
└── public/           # Static assets
```

## Testing

### E2E Tests
```bash
# Run all tests
npm run test:e2e

# Run specific test
npm run test:e2e -- tests/e2e/game-flow.spec.ts

# Debug mode
npm run test:e2e:debug

# UI mode
npm run test:e2e:ui
```

### Unit Tests
```bash
# Run with watch mode
npm run test

# Coverage report
npm run test:coverage
```

## Performance Targets

- **Frame Rate**: 60 FPS (game), 120 FPS (UI)
- **Bundle Size**: < 500KB gzipped
- **Load Time**: < 2s on 3G
- **Memory**: < 50MB during gameplay
- **Lighthouse Score**: 95+ on all metrics

## Game Controls

| Action | Key |
|--------|-----|
| Move | WASD |
| Jump | Space |
| Shoot | Mouse Click |
| Reload | R |
| Switch Weapon | 1-5 |
| Buy Menu | B |
| Scoreboard | Tab |
| Plant Bomb | E |

## UI/UX Optimization

### Implemented Features
- Dark mode with theme persistence
- Responsive design (mobile-first)
- Keyboard navigation support
- ARIA labels for accessibility
- Haptic feedback on mobile
- 60 FPS animations

### Planned Improvements
- 3D card animations for room selection
- Real-time player avatars
- Voice chat integration
- Replay system
- Spectator mode enhancements

## Migration from Ruby Backend

### Cleanup Scripts

**Standard Cleanup** - Removes Ruby files while keeping structure:
```bash
./cleanup-old-files.sh
```

**Deep Cleanup** - Minimal TypeScript-only project:
```bash
./deep-cleanup.sh
```

### What Gets Removed
- All Ruby backend code (`*.rb` files)
- Old static HTML pages
- Legacy JavaScript files
- Ruby test suites
- Migration scripts

### What Gets Preserved
- Complete TypeScript/React frontend
- E2E test suite
- Docker configurations
- Documentation

## WebSocket Protocol

### Message Types
```typescript
interface GameMessage {
  type: 'move' | 'shoot' | 'reload' | 'buy' | 'plant';
  playerId: string;
  data: any;
  timestamp: number;
}
```

### Connection Management
```typescript
// Auto-reconnect with exponential backoff
const ws = new ReconnectingWebSocket(WS_URL, {
  maxReconnectDelay: 10000,
  minReconnectDelay: 1000,
  reconnectDecayRate: 1.5
});
```

## Deployment

### Development
```bash
npm run dev
```

### Production Build
```bash
npm run build
npm run preview
```

### Docker
```bash
docker build -t cs2d-spa .
docker run -p 3000:3000 cs2d-spa
```

### Environment Variables
```env
VITE_WS_URL=ws://localhost:8080
VITE_API_URL=http://localhost:3001
VITE_PUBLIC_URL=/
```

## Code Quality

### Pre-commit Hooks
```bash
# Auto-runs on commit:
- TypeScript type check
- ESLint/Prettier
- Unit tests
```

### VSCode Settings
```json
{
  "editor.formatOnSave": true,
  "editor.codeActionsOnSave": {
    "source.fixAll.eslint": true
  }
}
```

## Troubleshooting

| Issue | Solution |
|-------|----------|
| Port 3000 in use | `lsof -ti:3000 \| xargs kill -9` |
| TypeScript errors | `npm run typecheck` to identify |
| Slow hot reload | Clear `.vite` cache folder |
| Test timeouts | Increase timeout in `playwright.config.ts` |
| Memory leaks | Use Chrome DevTools Memory Profiler |

## Performance Optimization

### Bundle Optimization
- Code splitting by route
- Lazy loading for game assets
- Tree shaking unused imports
- WebP images with fallbacks

### Runtime Optimization
- Virtual scrolling for long lists
- Web Workers for game physics
- RequestAnimationFrame for animations
- Canvas layer compositing

## Roadmap

### Phase 1 (Current)
- [x] TypeScript migration
- [x] React SPA architecture
- [x] E2E test coverage
- [x] Cleanup scripts

### Phase 2 (Next)
- [ ] PWA support
- [ ] Offline gameplay
- [ ] Cloud save sync
- [ ] Mobile app (React Native)

### Phase 3 (Future)
- [ ] WebRTC voice chat
- [ ] Tournament system
- [ ] Custom map editor
- [ ] Steam integration

## Contributing

1. Fork the repository
2. Create feature branch (`git checkout -b feature/amazing`)
3. Commit changes (`git commit -m 'feat: add amazing feature'`)
4. Push to branch (`git push origin feature/amazing`)
5. Open Pull Request

## Resources

- [React Documentation](https://react.dev)
- [TypeScript Handbook](https://www.typescriptlang.org/docs/)
- [Vite Guide](https://vitejs.dev/guide/)
- [Playwright Docs](https://playwright.dev)
- [TailwindCSS](https://tailwindcss.com)

---

*Last updated: 2025-08-19 - Refactored for TypeScript SPA-only architecture*