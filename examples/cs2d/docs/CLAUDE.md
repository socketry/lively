# 🎮 CLAUDE.md — CS2D Developer Guide (SPA-first)

This document contains comprehensive guidance for CS2D development, testing, and performance optimization.

## Overview
- **Architecture**: React SPA for UI; Lively provides sockets/backend only
- **SPA dev server**: Vite on port 5174
- **Backend services**:
  - API Bridge (WEBrick): http://localhost:9294
  - Lively/Falcon (WS + lobby): http://localhost:9292
- **Testing**: Comprehensive Playwright test suite with self-improving iterations
- **Performance**: 57-58 FPS average, 10MB memory usage, 90%+ test pass rate

## Run (SPA)
From `examples/cs2d/frontend`:

```bash
npm ci
npx playwright install
npm run dev -- --port=5174
# Open: http://localhost:5174
```

Routes:
- `/` or `/lobby` — Lobby
- `/room/:id` — Waiting room
- `/game` or `/game/:id` — Game canvas
- `/pixel` — Pixel UI demo

## E2E Tests (Comprehensive Suite)

### Test Suites
1. **Core Game Flow Tests** (`tests/e2e/cs2d-game-flow.spec.ts`)
   - 15 comprehensive tests covering initialization, controls, collision, weapons, networking
   - 100% pass rate with performance metrics
   
2. **Self-Improving Test Suite** (`tests/e2e/cs2d-enhanced-flow.spec.ts`)
   - 6 iterative improvement cycles with automatic optimization suggestions
   - Real-time performance monitoring and baseline establishment
   - Memory leak detection and frame rate consistency validation

3. **Debug Utilities**
   - `check-app.spec.ts`: React app mounting validation
   - `debug-page.spec.ts`: Page content inspection tools

### Running Tests

From project root:
```bash
# Run all CS2D tests
npx playwright test tests/e2e/cs2d-game-flow.spec.ts tests/e2e/cs2d-enhanced-flow.spec.ts

# Run basic test suite only
npx playwright test tests/e2e/cs2d-game-flow.spec.ts

# Run enhanced self-improving tests
npx playwright test tests/e2e/cs2d-enhanced-flow.spec.ts

# Run in headed mode for debugging
npx playwright test --headed

# Generate HTML report
npx playwright show-report
```

### Test Infrastructure
- Auto-starts: Vite (5174), API Bridge (9294), Lively/Falcon (9292)
- Performance monitoring: FPS, memory usage, load times
- Self-improvement: Automatic optimization suggestions
- Coverage: Game mechanics, multiplayer, networking, error handling

## Services
- Vite dev server (SPA): 5174
- API Bridge (WEBrick): 9294 (`ruby ../src/servers/api_bridge_server.rb 9294`)
- Lively/Falcon (WS): 9292 (`ruby ../src/servers/start_server.rb`)

## Internationalization
- 3 languages supported: English, 繁體中文, 日本語.
- Language switching via `useI18n()`; translations in `src/i18n/translations.ts`.

## Performance & Quality Metrics
- **Target Performance**: 57-58 FPS average, <20MB memory usage
- **Load Time**: ~370ms with first paint at 316ms
- **Test Pass Rate**: 90%+ (19/21 tests passing consistently)
- **Self-Improvement**: Automatic performance baseline establishment
- **Monitoring**: Real-time FPS, memory leak detection, frame consistency

### Quality Gates
- All core functionality tests must pass (15/15)
- Frame rate must stay above 30 FPS average
- Memory usage should not exceed 20MB growth during gameplay
- No critical JavaScript errors in console

## Gameplay (Basics)
- **Movement**: WASD, Jump: Space, Reload: R
- **Weapons**: switch keys 1–5; click canvas to shoot
- **Buy Menu**: B key (with money/buy time restrictions)
- **HUD**: Health, ammo, weapon display
- **Scoreboard**: Tab key to show/hide
- **Advanced**: Bomb planting (E key), spectator mode

## Conventions
- SPA-first: avoid static `room.html`/`game.html` in new work.
- Use relative paths in tests; rely on Playwright `baseURL`.
- Run SPA tests from `examples/cs2d/frontend` to avoid mixed dependencies.

## Troubleshooting

### Common Issues
- **"test.describe called here"** → Ensure single Playwright version (use SPA's)
- **Port in use** → Change Vite port in `playwright.config.js` 
- **Overcommit hooks blocking commit** → Install gem or set `OVERCOMMIT_DISABLE=1`
- **TypeScript errors in frontend** → Run `npm install @types/react @types/react-dom @testing-library/react`
- **Tests failing with "ERR_EMPTY_RESPONSE"** → Ensure frontend dev server is running on port 5174

### Testing Issues
- **React components not mounting** → Check for missing TypeScript types
- **Canvas not found** → Wait for `networkidle` state before testing
- **Performance tests failing** → Check if target FPS (30+) and memory (<20MB) are met
- **WebSocket tests failing** → Verify backend services are running (9292, 9294)

### Performance Debugging
- **Low FPS** → Check for infinite render loops or multiple canvas elements
- **High memory usage** → Run tests with memory leak detection enabled
- **Slow load times** → Review bundle size and script count

## Reports & Documentation
- **TEST_REPORT.md**: Comprehensive testing results and improvement recommendations
- **Performance baselines**: Established through self-improving test iterations
- **Coverage metrics**: Available in Playwright HTML reports

---

*Last updated: 2025-08-19 - Updated with comprehensive testing suite and performance metrics*

