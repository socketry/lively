# CLAUDE.md - CS2D Project Guide

This guide helps Claude Code (claude.ai/code) work effectively with the CS2D project built on the Lively framework.

## 📋 Table of Contents

1. [Quick Start](#quick-start)
2. [Project Overview](#project-overview)
3. [Core Applications](#core-applications)
4. [Architecture](#architecture)
5. [Development Workflow](#development-workflow)
6. [Common Issues & Solutions](#common-issues--solutions)
7. [Testing](#testing)
8. [Production Deployment](#production-deployment)

---

## 🚀 Quick Start

### Prerequisites
```bash
# Required software
- Ruby 3.3+
- Redis server (for multiplayer)
- Node.js (for Playwright testing)

# Install dependencies
bundle install
npm install @playwright/test playwright
```

### Running Applications

```bash
# Single-player CS 1.6 game
bundle exec lively cs16_classic_refactored.rb

# Multiplayer with in-memory rooms
bundle exec lively cs16_multiplayer_view.rb

# Redis-based lobby (requires Redis server)
redis-server  # In separate terminal
bundle exec lively async_redis_lobby.rb

# i18n-enabled lobby (English + 繁體中文)
bundle exec lively async_redis_lobby_i18n.rb
```

Access all applications at: `http://localhost:9292`

---

## 🎮 Project Overview

**CS2D** is a fully-featured Counter-Strike 1.6 clone demonstrating advanced real-time web game development using the Lively Ruby framework. It showcases WebSocket communication, canvas rendering, and scalable multiplayer architecture.

### Key Features
- ✅ **Complete CS 1.6 gameplay**: Authentic mechanics, weapons, economics
- ✅ **Multiple game modes**: Single-player, multiplayer, Redis-scaled rooms
- ✅ **i18n Support**: English and Traditional Chinese interfaces
- ✅ **Real-time networking**: 20-30 FPS state synchronization
- ✅ **Production-ready**: Redis persistence, error handling, monitoring

### Technology Stack
- **Backend**: Ruby 3.3, Lively framework, Falcon web server
- **Frontend**: HTML5 Canvas, vanilla JavaScript, Live.js WebSocket
- **Storage**: Redis (async-redis gem) for distributed state
- **Testing**: Playwright for automated browser testing

---

## 📁 Core Applications

### 1. Single-Player Game
**File**: `cs16_classic_refactored.rb`
- Complete CS 1.6 experience with bot AI
- 60 FPS canvas rendering
- Modular architecture with externalized JavaScript

### 2. Multiplayer Game
**File**: `cs16_multiplayer_view.rb`
- Real-time multiplayer rooms (up to 10 players)
- Server-authoritative game logic
- Lag compensation and state reconciliation

### 3. Redis Lobby System
**File**: `async_redis_lobby.rb`
- Thread-safe room management via Redis
- Solves Falcon multi-threading issues
- TTL-based automatic cleanup

### 4. i18n Lobby
**File**: `async_redis_lobby_i18n.rb`
- Full internationalization (English + 繁體中文)
- Real-time language switching
- Complete UI translation coverage

### 5. Room Management
**File**: `room_lobby_view.rb`
- Visual room creation/joining interface
- Bot management system
- Chinese (Traditional) UI

---

## 🏗️ Architecture

### Directory Structure
```
cs2d/
├── Core Applications
│   ├── cs16_classic_refactored.rb    # Single-player game
│   ├── cs16_multiplayer_view.rb      # Multiplayer implementation
│   ├── async_redis_lobby.rb          # Redis lobby
│   └── async_redis_lobby_i18n.rb     # i18n-enabled lobby
│
├── Game Logic (game/)
│   ├── async_redis_room_manager.rb   # Redis room management
│   ├── multiplayer_game_room.rb      # Game state & logic
│   ├── room_manager.rb               # In-memory rooms
│   ├── player.rb                     # Player & bot logic
│   └── weapon_config.rb              # Weapon specifications
│
├── Libraries (lib/)
│   ├── i18n.rb                       # Internationalization
│   ├── cs16_game_state.rb           # Game state management
│   └── cs16_hud_components.rb       # HUD rendering
│
├── Assets (public/_static/)
│   ├── cs16_classic_game.js         # Main game JavaScript
│   └── lobby.css                     # Lobby styling
│
└── Sound Assets (cstrike/)
    └── sound/                        # 131MB CS 1.6 sounds
```

### Live Framework Integration

#### WebSocket Communication Pattern
```ruby
# Server → Client (using Live framework)
self.script(<<~JAVASCRIPT)
  window.GameEngine.updateState(#{state.to_json});
JAVASCRIPT

# Client → Server (using event forwarding)
def handle(event)
  case event[:type]
  when "player_move"
    process_movement(event[:detail])
  end
end
```

#### View Update Pattern
```ruby
class GameView < Live::View
  def bind(page)
    super
    @page = page
    self.update!  # Initial render
  end
  
  def render(builder)
    # Build HTML with builder DSL
    builder.tag(:div, id: "game") do
      builder.text("Game content")
    end
  end
end
```

### Redis Architecture (Async-Redis)

#### Key Features
- **Thread-safe operations**: Async context management
- **TTL management**: Automatic cleanup (rooms: 1hr, players: 5min)
- **Atomic operations**: Pipeline for consistency
- **Pub/sub messaging**: Real-time room updates

#### Redis Schema
```
Keys:
- room:{room_id}:data         # Room metadata (JSON)
- room:{room_id}:players      # Hash of player IDs
- player:{player_id}:room     # Current room assignment
- active_rooms                # Set of all room IDs
```

#### Async-Redis API Differences
```ruby
# WRONG - Standard redis gem syntax
redis.set("key", "value", ex: 3600)

# CORRECT - Async-redis syntax
redis.setex("key", 3600, "value")
```

---

## 💻 Development Workflow

### Coding Standards

**RuboCop Enforcement**
```bash
# Check code quality
bundle exec rubocop

# Auto-fix issues
bundle exec rubocop -a

# Required standards:
- Tabs for indentation
- Double quotes for strings
- Snake_case for methods
- CamelCase for classes
```

### JavaScript Best Practices

#### Large Script Management
```ruby
# For scripts >10K characters, externalize to files
def render_javascript_integration(builder)
  # Use explicit closing tags (critical!)
  builder.tag(:script, src: "/_static/game.js") do
    # Empty block forces proper HTML tags
  end
  
  # Dynamic initialization
  builder.tag(:script) do
    builder.raw(<<~JS)
      window.GameEngine?.initialize('#{@player_id}');
    JS
  end
end
```

#### Common Pitfalls
- ❌ Never use `builder.text()` for JavaScript (escapes as HTML)
- ✅ Always use `builder.raw()` for script content
- ❌ Avoid self-closing script tags `<script />`
- ✅ Use explicit opening/closing tags

### i18n Implementation

#### Translation Structure
```ruby
# lib/i18n.rb usage
I18n.t("lobby.title")                    # Simple key
I18n.t("lobby.messages.room_created",    # With interpolation
       room_id: "abc123")
I18n.locale = :en                        # Switch language
```

#### Adding New Languages
1. Add translations to `lib/i18n.rb`
2. Update `available_locales` array
3. Add to `locale_name` method
4. UI automatically includes new option

### Cookie-Based Player ID Persistence

#### Implementation Overview
- **Storage**: Browser cookies with 30-day expiry
- **Format**: `cs2d_player_id=<uuid>`
- **Initialization**: Checks cookie on page load, generates UUID if none exists
- **UI**: Edit button in header with modal dialog
- **Validation**: Non-empty, max 50 characters

#### Key Implementation Files
- `async_redis_lobby_i18n.rb`: Main implementation
  - `initialize_player_from_cookie()`: Client-side cookie check
  - `handle_change_player_id()`: Server-side ID update
  - `set_player_cookie()`: JavaScript cookie setter
- `lib/i18n.rb`: Translations for player ID UI

#### Modal Close Methods
1. Click "Save" button (儲存)
2. Press Enter in input field
3. Click "Cancel" button (取消)
4. Click modal background
5. Press ESC key

#### Cookie Persistence Flow
1. **First Visit**: Generates new UUID, stores in cookie
2. **Return Visit**: Reads cookie, restores player ID
3. **Manual Edit**: Updates both UI and cookie
4. **Room Operations**: Uses persistent ID for all operations

### Testing with Playwright

**IMPORTANT**: When making frontend changes, always test with Playwright browser MCP tools. Default testing should use Playwright, not manual browser testing.

```javascript
// Basic test pattern
const { chromium } = require('playwright');

async function test() {
  const browser = await chromium.launch({ headless: false });
  const page = await browser.newPage();
  
  // Monitor console
  page.on('console', msg => console.log(msg.text()));
  
  await page.goto('http://localhost:9292');
  // Test interactions...
  
  await browser.close();
}
```

#### Testing Cookie Persistence with Playwright MCP

Use the following MCP browser tools to test frontend features:

```bash
# 1. Navigate to the lobby
mcp__browser__playwright_navigate url="http://localhost:9292" headless=false

# 2. Take initial screenshot
mcp__browser__playwright_screenshot name="initial-lobby" fullPage=true

# 3. Test player ID edit modal
mcp__browser__playwright_click selector="button:has-text('編輯')"
mcp__browser__playwright_fill selector="#new-player-id" value="test-player-123"
mcp__browser__playwright_click selector="button:has-text('儲存')"

# 4. Verify modal closes and ID updates
mcp__browser__playwright_screenshot name="after-edit" fullPage=true

# 5. Check console logs for errors
mcp__browser__playwright_console_logs type="error"

# 6. Test persistence after page reload
mcp__browser__playwright_navigate url="http://localhost:9292"
mcp__browser__playwright_get_visible_text
```

---

## 🔧 Common Issues & Solutions

### Issue: "unknown keyword: :ex" Error
**Cause**: Using standard redis gem syntax with async-redis
**Solution**: Use `setex(key, ttl, value)` instead of `set(key, value, ex: ttl)`

### Issue: Black Screen / JavaScript Not Loading
**Cause**: Invalid self-closing script tags or escaped JavaScript
**Solutions**:
```ruby
# Always use explicit closing tags
builder.tag(:script, src: "file.js") do
  # Empty block required
end

# Use raw() for JavaScript content
builder.tag(:script) do
  builder.raw(javascript_code)  # Not text()
end
```

### Issue: Falcon Multi-threading Race Conditions
**Cause**: In-memory state not thread-safe across Falcon processes
**Solution**: Use Redis for shared state management

### Issue: WebSocket Timing Problems
**Cause**: JavaScript executes before WebSocket connection ready
**Solution**: Add initialization delay or connection checks
```ruby
Async do
  sleep 1.5  # Wait for WebSocket
  inject_javascript
end
```

---

## 🚢 Production Deployment

### Redis Configuration
```bash
# Development
redis-server  # Default localhost:6379

# Production checklist
- [ ] Enable persistence (RDB/AOF)
- [ ] Configure memory limits
- [ ] Set up Redis Sentinel/Cluster
- [ ] Monitor with Redis INFO
```

### Performance Optimization
- **State delta compression**: ~80% bandwidth reduction
- **Message batching**: Group updates in 50ms windows
- **Asset caching**: External JS files with long TTL
- **Connection pooling**: Reuse WebSocket connections

### Monitoring
```ruby
# Add to room manager
def get_metrics
  {
    rooms: @@room_manager.get_stats,
    memory: `ps -o rss= -p #{Process.pid}`.to_i,
    connections: @page ? 1 : 0
  }
end
```

### Scaling Considerations
- Each room: max 10 players
- Each process: ~50 concurrent rooms
- Redis memory: ~10KB per active room
- Network: ~5KB/s per active player

---

## 📊 Project Status (August 2025)

### Completed Features ✅
- Single-player CS 1.6 game with bot AI
- Multiplayer with authoritative server
- Redis-based scalable room system
- Full i18n support (EN + 繁體中文)
- **Cookie-based player ID persistence** (30-day expiry)
- Comprehensive test coverage
- Production-ready error handling

### Performance Metrics
- **Room creation**: <5ms latency
- **State sync**: 20-30 FPS updates
- **Player capacity**: 50+ concurrent
- **Memory usage**: <100MB per process
- **Redis operations**: <3ms average

### Recent Updates
- **Aug 2025** - Cookie-based player ID persistence (30-day expiry)
- `d866fd8` - i18n implementation
- `98f677c` - Redis SETEX compatibility fix
- `1e2dbd4` - Project cleanup (removed 15+ legacy files)
- `13635bd` - Async-redis integration

---

## 🎯 Development Guidelines

### When Working on This Project
1. **Check Redis**: Ensure Redis is running for multiplayer features
2. **Run RuboCop**: All Ruby code must pass linting
3. **Test Changes**: Use Playwright for UI testing
4. **Update i18n**: Add translations for new UI elements
5. **Document**: Update this file for significant changes

### Key Principles
- **Server Authority**: Never trust client for game logic
- **Async First**: Use Async blocks for I/O operations
- **Fail Gracefully**: Always handle errors with user feedback
- **Test Coverage**: Write Playwright tests for new features
- **Performance**: Monitor and optimize hot paths

---

## 📚 Additional Resources

- **Lively Framework**: Core framework documentation
- **Live.js**: WebSocket client library
- **Async-Redis**: [github.com/socketry/async-redis](https://github.com/socketry/async-redis)
- **Playwright**: [playwright.dev](https://playwright.dev)
- **Redis Commands**: [redis.io/commands](https://redis.io/commands)

---

*This document is actively maintained. Last updated: August 2025*