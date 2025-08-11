# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

Lively is a Ruby framework for building interactive web applications for creative coding. It provides real-time communication between client and server using WebSockets through the Live gem, and runs on the Falcon web server.

## Coding Standards

**IMPORTANT: This project enforces strict coding standards using RuboCop.**

When writing or modifying Ruby code:
1. **Always run RuboCop** after making changes: `bundle exec rubocop -a path/to/file.rb`
2. **Use tabs for indentation** (not spaces) - enforced by `.rubocop.yml`
3. **Use double quotes** for strings: `"string"` not `'string'`
4. **Follow Ruby conventions**: snake_case for methods/variables, CamelCase for classes
5. **All code must pass RuboCop** without offenses before being considered complete

**Recent RuboCop Compliance Update (August 2025):**
- ✅ **30+ Ruby files** now pass RuboCop checks without violations
- ✅ **String literals** converted from single to double quotes
- ✅ **Indentation** standardized to tabs across all files  
- ✅ **Development workflow** enhanced with consistent coding standards

## Key Commands

### Dependencies
```bash
# Install Ruby dependencies
bundle install

# Install Node dependencies (for client-side Live.js)
npm install
```

### Running Applications
```bash
# Run the main application
bundle exec lively lib/lively/application.rb

# Run examples (from example directory)
cd examples/hello-world
bundle exec lively application.rb

# Use the lively executable with absolute paths (recommended)
./bin/lively /full/path/to/application.rb

# Example: CS2D game
./bin/lively /Users/jimmy/jimmy_side_projects/lively/examples/cs2d/cs16_classic_refactored.rb
```

### Testing
```bash
# Run tests with Sus test framework
bundle exec sus

# Run a specific test file
bundle exec sus test/lively.rb
```

### Code Quality
```bash
# Run RuboCop for linting
bundle exec rubocop

# Run RuboCop with auto-fix
bundle exec rubocop -a

# Run RuboCop on specific file
bundle exec rubocop path/to/file.rb
```


## Architecture

### Core Components

**Lively::Application** (`lib/lively/application.rb`)
- Base class for Lively applications, extends `Protocol::HTTP::Middleware`
- Handles WebSocket connections at `/live` endpoint
- Factory method `Application[ViewClass]` creates application instances for specific view classes
- Manages Live::Page instances for real-time updates

**Live::View Pattern**
- Views inherit from `Live::View` and implement `render(builder)` method
- Views bind to pages and can trigger updates with `update!`
- Builder provides HTML generation methods

**Asset Pipeline** (`lib/lively/assets.rb`)
- Serves static files from `public/` directories
- Client-side JavaScript components in `public/_components/`
- Includes morphdom for DOM diffing and @socketry/live for WebSocket handling

### Application Structure

```
application.rb    # Defines Application class with View
gems.rb          # Dependencies (points to main gem)
public/          # Static assets
  _static/       # CSS, images, audio files
```

### WebSocket Communication
- Live updates happen through WebSocket connections to `/live`
- Live::Page manages the connection between server views and client DOM
- Uses Live::Resolver to control which classes can be instantiated on the client

### Running Examples
Each example is self-contained with its own `application.rb` that:
1. Defines view classes extending `Live::View`
2. Creates an Application using `Lively::Application[ViewClass]`
3. Can be run with `bundle exec lively application.rb`

## Development Patterns

### Creating Applications
```ruby
class MyView < Live::View
  def render(builder)
    # Build HTML using builder methods
  end
end

Application = Lively::Application[MyView]
```

### View Updates & Assets
- Views trigger updates via `update!` (sends new HTML over WebSocket)
- App-specific assets: `./public/_static/`
- Framework assets: gem's `public/` directory

### Modular Architecture
For complex applications, organize code using focused Ruby modules:

```ruby
# Focused modules by responsibility
module GameState
  def initialize_game_state
    # Game state management
  end
end

module PlayerManager  
  def create_player(id, team)
    # Player creation logic
  end
end

# Main view includes modules
class GameView < Live::View
  include GameState
  include PlayerManager
  
  def render(builder)
    render_game_container(builder)
    render_javascript_integration(builder)
  end
end
```

### JavaScript Externalization
For large JavaScript (>10K characters), use separate files:

```ruby
def render_javascript_integration(builder)
  builder.tag(:script, src: "/_static/game_logic.js")
  builder.tag(:script, type: "text/javascript") do
    builder.raw(<<~JAVASCRIPT)
      if (typeof window.GameEngine !== 'undefined') {
        window.GameEngine.initialize('#{@player_id}');
      }
    JAVASCRIPT
  end
end
```

**Benefits**: Maintainability, performance (caching), easier debugging

## Common Issues and Solutions

### JavaScript Integration Issues

#### Black Screen with Script Tags
**Problem**: Using `builder.text()` escapes JavaScript as HTML entities.
**Solution**: Use `builder.raw()` for JavaScript output:

```ruby
# WRONG - causes black screen
builder.tag(:script) { builder.text(javascript_code) }

# CORRECT - JavaScript executes
builder.tag(:script) { builder.raw(javascript_code) }
```

#### Large Script Injection Failures
**Problem**: `self.script()` may fail for large JavaScript (>40K characters).
**Solution**: Use HTML-based inclusion for large scripts:

```ruby
# Instead of: self.script(large_javascript_code)
def render(builder)
  render_game_container(builder)
  builder.tag(:script) { builder.raw(complete_javascript_code) }
end
```

#### WebSocket Timing Issues
**Problem**: JavaScript may execute before WebSocket connection established.
**Solution**: Add delays for initialization:

```ruby
Async do
  sleep 1.5  # Wait for WebSocket
  inject_game_javascript
end
```

#### Script Tag Syntax Issues
**Problem**: Self-closing script tags `<script src="..."/>` prevent subsequent scripts from executing.
**Solution**: Always use proper HTML syntax with explicit closing tags:

```ruby
# WRONG - causes subsequent scripts to fail
builder.tag(:script, src: "/static/game.js", type: "text/javascript")

# CORRECT - ensures all scripts execute
builder.tag(:script, src: "/static/game.js", type: "text/javascript") do
  # Empty content but forces proper opening/closing tags
end
```

**Critical Bug Pattern**: Invalid self-closing script tags can cause complete JavaScript initialization failure, resulting in black screens even when external files load correctly.

**Best Practices:**
- **HTML inclusion**: Large JavaScript (>10K chars)
- **WebSocket injection**: Small, dynamic updates
- **Mixed approach**: HTML for initial code, WebSocket for state updates
- **Script tag syntax**: Always use explicit closing tags for proper HTML parsing

## Example Applications

### CS 1.6 Classic (`examples/cs2d/`)
A fully-featured Counter-Strike 1.6 clone demonstrating real-time game development with Lively.

**Status (August 2025):** 98.1% complete with all core features implemented.

**Key Features:**
- Authentic CS 1.6 gameplay (weapons, movement, economics, 5v5 format)
- Advanced bot AI with combat states and bomb objectives  
- Complete HUD system, buy menu, scoreboard
- 60 FPS canvas rendering with collision detection
- Modular Ruby architecture with externalized JavaScript

**Running the Game:**
```bash
# Recommended: Refactored modular version
cd examples/cs2d && bundle exec lively ./application.rb

# Alternative: Direct execution
./bin/lively examples/cs2d/cs16_classic_refactored.rb
```

**Architecture:**
```
cs16_classic_refactored.rb     # Main view (338 lines)
lib/cs16_*.rb                  # Game modules  
public/_static/cs16_classic_game.js  # External JavaScript (1800+ lines)
```

## Debugging Complex Games

### Canvas Game Development
**Camera System**: Use `ctx.save()/translate()/restore()` for player-centered view
**Input Handling**: Use `document.addEventListener` with `e.code` for consistent keys
**Collision Detection**: Implement wall collision checking to prevent clipping

```javascript
// Camera follow pattern
ctx.save();
ctx.translate(canvas.width/2 - player.x, canvas.height/2 - player.y);
// Render world elements
ctx.restore();
// Render UI elements
```

### DOM Integration Issues
**Buy Menu Visibility**: Create fresh DOM elements client-side for Lively compatibility
**Event Delegation**: Attach events to `document` to survive DOM updates
**State Synchronization**: Use direct player lookup for critical operations

```javascript
// Ensure bullets spawn from correct player
gameState.bullets.push({
  x: gameState.players[gameState.localPlayerId].x,  // Direct lookup
  y: gameState.players[gameState.localPlayerId].y
});
```

### Essential Debug Patterns
- Add visual indicators to confirm JavaScript execution
- Use `Ctrl+Shift+R` to bypass cache when testing fixes
- Initialize players immediately after gameState creation
- Verify canvas context exists before drawing operations

### Systematic JavaScript Debugging with Playwright
For complex JavaScript loading issues, use automated browser testing for efficient debugging:

**Debug Script Pattern:**
```javascript
const { chromium } = require('playwright');

(async () => {
  const browser = await chromium.launch({ headless: false, devtools: true });
  const page = await browser.newPage();
  
  // Monitor console logs for initialization sequence
  page.on('console', msg => console.log('BROWSER:', msg.text()));
  
  await page.goto('http://localhost:9292');
  await page.waitForTimeout(3000);
  
  // Check final state and take screenshot
  const state = await page.evaluate(() => ({
    gameLoaded: typeof window.GameEngine !== 'undefined',
    canvasReady: !!document.getElementById('game-canvas')
  }));
  
  await page.screenshot({ path: 'debug.png' });
  await browser.close();
})();
```

**Critical Debugging Steps:**
1. **Playwright setup**: Install with `npm install @playwright/test && npx playwright install`
2. **Console monitoring**: Capture all browser logs to trace execution flow
3. **State inspection**: Check object availability and DOM element existence
4. **Visual confirmation**: Screenshots reveal actual rendering vs expected output
5. **Script execution tracking**: Verify all initialization scripts actually run

## Code Refactoring

### When to Refactor
**Thresholds for refactoring:**
- Ruby view files: >500 lines → extract modules
- JavaScript blocks: >100 lines → externalize to .js files
- Combined files: >1000 lines → full modular architecture
- Repeated patterns: >3 similar blocks → extract functions/modules

### Refactoring Strategy
1. **Identify concerns**: Group related functionality
2. **Extract modules**: Single responsibility Ruby modules  
3. **Externalize JavaScript**: Move large JS to cached files
4. **Test iteratively**: Verify functionality after each step

### Example: Modular Architecture
```ruby
# Before: Monolithic 2227-line view
class LargeGameView < Live::View
  # Mixed concerns in one massive file
end

# After: Clean modular structure (338 lines + modules)
class RefactoredGameView < Live::View
  include GameStateModule      # Game state management
  include PlayerManagerModule  # Player operations  
  include HudComponentsModule  # UI rendering
  
  def render(builder)
    render_game_container(builder)
    render_javascript_integration(builder)  # External JS
  end
end
```

### JavaScript Integration Pattern
```ruby
# External JS file with module export - CRITICAL: Use proper closing tags
def render_javascript_integration(builder)
  # WRONG: Self-closing tag breaks subsequent scripts
  # builder.tag(:script, src: "/_static/game_engine.js", type: "text/javascript")
  
  # CORRECT: Explicit closing tag ensures proper HTML parsing
  builder.tag(:script, src: "/_static/game_engine.js", type: "text/javascript") do
    # Empty content but forces proper opening/closing tags
  end
  
  builder.tag(:script, type: "text/javascript") do
    builder.raw(<<~JAVASCRIPT)
      if (typeof window.GameEngine !== 'undefined') {
        window.GameEngine.initialize('#{@player_id}');
      }
    JAVASCRIPT
  end
end
```

**Recent Critical Fix (August 2025):**
Fixed game initialization failure caused by invalid self-closing script tag syntax. The bug prevented initialization scripts from executing, causing black screens despite successful external JavaScript loading.

**File size targets after refactoring:**
- Main view: <400 lines
- Individual modules: <300 lines each  
- External JavaScript: unlimited (cached)