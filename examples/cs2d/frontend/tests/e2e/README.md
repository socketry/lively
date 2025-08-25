# CS2D End-to-End Tests with Playwright

Comprehensive end-to-end testing suite for the CS2D game using Playwright.

## 📋 Test Coverage

### 1. **Game Flow Tests** (`game-flow.spec.ts`)
- Complete user journey from landing to gameplay
- Single player flow testing
- Multiplayer flow with multiple browser instances
- WebSocket connection handling
- Performance and load testing

### 2. **Lobby and Room Management** (`lobby-room.spec.ts`)
- Room creation with custom settings
- Joining public and private rooms
- Ready status management
- Team selection
- Room chat functionality
- Player kick functionality
- Quick join feature

### 3. **Game Mechanics** (`game-mechanics.spec.ts`)
- Player movement (WASD + modifiers)
- Weapon switching and shooting
- Ammo management and reloading
- Health and damage system
- Scoreboard functionality
- In-game chat
- Settings management
- HUD elements
- Buy menu (in appropriate modes)
- Spectator mode

### 4. **Multiplayer & WebSocket** (`multiplayer-websocket.spec.ts`)
- WebSocket connection establishment
- Connection loss and recovery
- State synchronization between clients
- Player movement sync
- Combat sync (shooting/damage)
- Chat message sync
- Concurrent actions handling
- Spectator mode for multiple viewers
- Performance under load (8+ players)

## 🚀 Running Tests

### Prerequisites
```bash
# Install Playwright and dependencies
npm install --save-dev @playwright/test

# Install browsers
npx playwright install
```

### Run All Tests
```bash
# Run all e2e tests
npm run test:e2e

# Run with UI mode for debugging
npm run test:e2e:ui

# Run specific test file
npx playwright test tests/e2e/game-flow.spec.ts

# Run specific test suite
npx playwright test tests/e2e/lobby-room.spec.ts
```

### Run with Different Options
```bash
# Run in headed mode (see browser)
npx playwright test --headed

# Run with specific browser
npx playwright test --project=chromium
npx playwright test --project=firefox
npx playwright test --project=webkit

# Run with trace for debugging
npx playwright test --trace on

# Run with video recording
npx playwright test --video on

# Run specific test by name
npx playwright test -g "should create a new room"
```

### Debug Tests
```bash
# Debug mode with Playwright Inspector
npx playwright test --debug

# Debug specific test
npx playwright test tests/e2e/game-flow.spec.ts --debug

# UI mode for interactive debugging
npx playwright test --ui
```

## 🔧 Test Helpers and Fixtures

### GameHelpers (`helpers/game-helpers.ts`)
Helper functions for in-game actions:
- `waitForGameLoad()` - Wait for game to fully initialize
- `movePlayer()` - Move player in direction
- `shootAt()` - Shoot at coordinates
- `switchWeapon()` - Switch weapon slots
- `reloadWeapon()` - Reload current weapon
- `openScoreboard()` - Display scoreboard
- `sendChatMessage()` - Send in-game chat
- `changeSetting()` - Modify game settings
- `getCurrentFPS()` - Measure current FPS

### LobbyHelpers (`helpers/lobby-helpers.ts`)
Helper functions for lobby and room management:
- `goToLobby()` - Navigate to lobby
- `createRoom()` - Create new room with config
- `joinRoom()` - Join specific room
- `getAvailableRooms()` - List all rooms
- `toggleReady()` - Toggle ready status
- `startGame()` - Start game (host only)
- `changeRoomSettings()` - Modify room config
- `switchTeam()` - Change team assignment

### Custom Fixtures (`fixtures/game-fixtures.ts`)
Reusable test fixtures:
- `gameHelpers` - GameHelpers instance
- `lobbyHelpers` - LobbyHelpers instance
- `authenticatedPage` - Auto-authenticated page
- `gameRoom` - Auto-created room fixture

### Utility Functions
- `createMultiplePlayers()` - Create multiple player instances
- `simulateNetworkConditions()` - Simulate network conditions
- `measurePerformance()` - Collect performance metrics
- `waitForGameState()` - Wait for specific game state
- `captureGameState()` - Snapshot current game state

## 📊 Test Reports

### Generate HTML Report
```bash
# Run tests with HTML reporter
npx playwright test --reporter=html

# Open report
npx playwright show-report
```

### Generate JSON Report
```bash
# Run with JSON reporter
npx playwright test --reporter=json > test-results.json
```

### Generate JUnit Report
```bash
# Run with JUnit reporter for CI
npx playwright test --reporter=junit > junit.xml
```

## 🎯 Environment Variables

Set these environment variables for testing:

```bash
# Test user credentials
TEST_USERNAME=testplayer
TEST_PASSWORD=testpass123
TEST_PLAYER_NAME=TestPlayer

# Test server
TEST_API_URL=http://localhost:9294/api
TEST_WS_URL=ws://localhost:9292

# Test configuration
TEST_HEADLESS=false  # Run with visible browser
TEST_SLOW_MO=100     # Slow down actions by 100ms
TEST_TIMEOUT=60000   # Test timeout in ms
```

## 🐛 Debugging Failed Tests

### View Test Artifacts
After running tests, artifacts are saved in:
- `test-results/` - Test results and traces
- `tests/e2e/screenshots/` - Screenshots
- `tests/e2e/recordings/` - Video recordings

### Use Trace Viewer
```bash
# View trace for failed test
npx playwright show-trace test-results/[test-name]/trace.zip
```

### Common Issues and Solutions

#### WebSocket Connection Fails
- Ensure backend servers are running
- Check WebSocket URL in environment variables
- Verify no firewall blocking WebSocket connections

#### Game Doesn't Load
- Check if static server is serving game files
- Verify Canvas/WebGL support in test browser
- Increase timeout for game load

#### Multiplayer Sync Issues
- Check network latency simulation settings
- Ensure Redis is running for room state
- Verify WebSocket message delivery

#### Performance Issues
- Reduce number of concurrent players
- Run tests in headless mode
- Use faster machine or CI environment

## 🔄 Continuous Integration

### GitHub Actions Example
```yaml
name: E2E Tests

on: [push, pull_request]

jobs:
  test:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v3
      
      - name: Setup Node
        uses: actions/setup-node@v3
        with:
          node-version: '18'
          
      - name: Install dependencies
        run: npm ci
        
      - name: Install Playwright
        run: npx playwright install --with-deps
        
      - name: Start servers
        run: |
          docker-compose up -d
          npm run dev &
          npx wait-on http://localhost:5173
          
      - name: Run E2E tests
        run: npm run test:e2e
        
      - name: Upload artifacts
        if: always()
        uses: actions/upload-artifact@v3
        with:
          name: playwright-report
          path: playwright-report/
          retention-days: 30
```

## 📈 Performance Benchmarks

Expected performance metrics:

| Metric | Target | Actual |
|--------|--------|--------|
| Page Load | < 3s | - |
| Game Start | < 5s | - |
| WebSocket Connect | < 1s | - |
| Room Join | < 2s | - |
| FPS (Average) | > 30 | - |
| FPS (Minimum) | > 20 | - |
| Network Latency | < 100ms | - |
| State Sync | < 500ms | - |

## 🎮 Test Game Scenarios

### Scenario 1: Quick Match
1. Land on homepage
2. Click "Quick Play"
3. Auto-join available room
4. Ready up
5. Play match
6. View results
7. Return to lobby

### Scenario 2: Create Private Match
1. Create private room
2. Set password
3. Configure game settings
4. Share room code
5. Wait for friends
6. Start match
7. Play full game

### Scenario 3: Tournament Mode
1. Join tournament lobby
2. Check in for match
3. Wait for bracket
4. Play elimination rounds
5. View tournament progress
6. Complete tournament

### Scenario 4: Stress Test
1. Create maximum player room
2. All players join simultaneously
3. Perform concurrent actions
4. Monitor performance
5. Check for degradation
6. Verify stability

## 🔗 Related Documentation

- [Playwright Documentation](https://playwright.dev/docs/intro)
- [CS2D Game Documentation](../../README.md)
- [WebSocket API Documentation](../../docs/websocket-api.md)
- [Game State Management](../../docs/game-state.md)

## 📝 Contributing

When adding new tests:

1. Follow existing test structure
2. Use helper functions for common actions
3. Add appropriate test tags/descriptions
4. Include performance assertions
5. Handle both success and failure cases
6. Document any new helpers or fixtures
7. Update this README with new coverage

## 📞 Support

For test-related issues:
- Check test artifacts in `test-results/`
- Review trace files with `npx playwright show-trace`
- Enable debug mode with `--debug` flag
- Join Discord for community support

---

**Last Updated**: Current
**Playwright Version**: 1.40+
**Test Coverage**: Comprehensive game flow, multiplayer, and WebSocket testing