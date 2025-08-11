# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

Lively is a Ruby framework for building interactive web applications for creative coding. It provides real-time communication between client and server using WebSockets through the Live gem, and runs on the Falcon web server.

## Coding Standards

**IMPORTANT: This project enforces strict coding standards using RuboCop.**

When writing or modifying Ruby code:
1. **Always run RuboCop** after making changes: `bundle exec rubocop -a path/to/file.rb`
2. **Use tabs for indentation** (not spaces) - this is enforced by the `.rubocop.yml` configuration
3. **Use double quotes** for strings: `"string"` not `'string'`
4. **Follow Ruby conventions** for naming: snake_case for methods/variables, CamelCase for classes
5. **All code must pass RuboCop** without offenses before being considered complete

The project's `.rubocop.yml` file defines the exact style rules. When in doubt, run RuboCop and follow its suggestions.

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

# Alternative: use the lively executable directly
./bin/lively examples/hello-world/application.rb
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

**IMPORTANT: Always run RuboCop on any Ruby code you write or modify:**
- Run `bundle exec rubocop -a` to auto-correct style issues before committing
- The project uses **tabs for indentation** (not spaces)
- Use **double quotes for strings** (not single quotes)
- Follow the project's `.rubocop.yml` configuration
- All Ruby files should pass RuboCop checks without offenses

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

## Key Patterns

### Creating a New Application
```ruby
class MyView < Live::View
  def render(builder)
    # Build HTML using builder methods
  end
end

Application = Lively::Application[MyView]
```

### View Updates
Views can trigger client updates by calling `update!` which sends the new rendered HTML over the WebSocket connection.

### Static Asset Organization
- Application-specific assets go in `./public/_static/`
- Shared framework assets are in the gem's `public/` directory
- Both are automatically served by the Assets middleware

### Modular Architecture Pattern (NEW)
For complex applications, use Ruby modules to organize code by responsibility:

```ruby
# Extract components into focused modules
module GameState
  def initialize_game_state
    # Game state management
  end
end

module PlayerManager
  def create_player(id, team)
    # Player creation and management
  end
end

module HudComponents
  def render_classic_hud(builder)
    # HUD rendering logic
  end
end

# Main view class includes modules
class GameView < Live::View
  include GameState
  include PlayerManager
  include HudComponents
  
  def render(builder)
    render_game_container(builder)
    render_javascript_integration(builder)
  end
end
```

### JavaScript Externalization Pattern
For large JavaScript applications (>10K characters), externalize to separate files:

```ruby
def render_javascript_integration(builder)
  # Include external JavaScript file
  builder.tag(:script, src: "/_static/game_logic.js", type: "text/javascript")
  
  # Initialize with Ruby data
  builder.tag(:script, type: "text/javascript") do
    builder.raw(<<~JAVASCRIPT)
      document.addEventListener('DOMContentLoaded', function() {
        if (typeof window.GameEngine !== 'undefined') {
          window.GameEngine.initialize('#{@player_id}');
        }
      });
    JAVASCRIPT
  end
end
```

**Benefits:**
- **Maintainability**: Each component has single responsibility
- **Performance**: JavaScript can be cached and optimized separately
- **Debugging**: Easier to isolate and fix issues
- **Reusability**: Modules can be shared across different views
- **Testing**: Components can be tested in isolation

## Common Issues and Solutions

### JavaScript Execution Issues
When building complex web applications with JavaScript in Lively, you may encounter execution blocking issues:

#### Issue 1: Black Screen with HTML Script Tags
**Problem**: Using `builder.text()` for JavaScript code escapes the content as HTML entities, preventing execution.

**Solution**: Use `builder.raw()` instead of `builder.text()` when outputting JavaScript or HTML that should not be escaped.

```ruby
# WRONG - causes black screen
builder.tag(:script) do
  builder.text(javascript_code)  # This escapes < > & etc.
end

# CORRECT - JavaScript executes properly
builder.tag(:script) do
  builder.raw(javascript_code)   # This outputs raw JavaScript
end
```

#### Issue 2: WebSocket Script Injection Failures
**Problem**: Using `self.script()` for large JavaScript injections may fail silently, especially for complex applications with 40K+ characters of JavaScript.

**Solution**: For complex applications, use HTML-based JavaScript inclusion instead of WebSocket injection:

```ruby
# Instead of WebSocket injection via self.script()
def inject_game_javascript
  self.script(large_javascript_code)  # May fail silently
end

# Use HTML-based inclusion in render method
def render(builder)
  render_game_container(builder)
  render_complete_game_scripts(builder)  # Direct HTML inclusion
end

def render_complete_game_scripts(builder)
  builder.tag(:script, type: "text/javascript") do
    builder.raw(complete_javascript_code)
  end
end
```

#### Issue 3: Live.js Timing Dependencies
**Problem**: JavaScript initialization may fail if executed before Live.js WebSocket connection is established.

**Solution**: Implement proper timing and fallbacks:

```ruby
# Add delays and error handling for WebSocket connections
Async do
  sleep 1.5  # Wait for WebSocket connection
  Console.info(self, "Attempting JavaScript injection after delay...")
  inject_game_javascript
  broadcast_game_state
end
```

**When to use each approach:**
- **HTML-based inclusion**: For large, complex JavaScript applications (>10K characters)
- **WebSocket injection**: For small, dynamic script updates and real-time interactions
- **Mixed approach**: HTML for initial game code, WebSocket for state updates

## Example Applications

### CS 1.6 Classic (`examples/cs2d/`)
A fully-featured Counter-Strike 1.6 clone built with Lively demonstrating real-time game development with **authentic competitive rules**:

**Classic CS 1.6 Features:**
- **Authentic Weapon System**: Classic weapons with original prices (AK-47 $2500, M4A1 $3100, AWP $4750, Desert Eagle $650)
- **Classic Movement**: Authentic CS 1.6 movement speeds, walk/crouch modifiers, weapon speed penalties
- **Competitive Rules**: 1:55 round time, 15s freeze time, 35s C4 timer, 90s buy time
- **Classic Economy**: $800 starting money, progressive loss bonuses ($1400-3400), authentic kill rewards
- **Bomb Gameplay**: 3s plant time, 10s defuse (5s with kit), A/B bomb sites, $800 plant bonus
- **5v5 Format**: Best of 30 rounds, halftime at round 15, first to 16 wins
- **Classic Grenades**: HE $300, Flash $200, Smoke $300 with authentic physics
- **Movement & Combat**: Proper collision detection, wall clipping prevention, diagonal normalization
- **Bot AI System**: Advanced bot AI with combat states, patrol routes, bomb objectives
- **Map Design**: de_dust2 style layout with proper wall and box collision
- **HUD Elements**: Classic CS 1.6 styling with health, armor, money, round timer, scoreboard
- **Dynamic Crosshair**: Expands with movement, crouching reduces spread

**Controls:**
- **WASD**: Movement
- **Mouse**: Aim
- **Left Click**: Shoot
- **Right Click**: Scope (AWP/Scout)
- **R**: Reload
- **B**: Buy Menu
- **TAB**: Scoreboard (hold)
- **E**: Plant/Defuse bomb
- **G**: Flashbang
- **F**: Smoke grenade
- **4**: HE grenade
- **Shift**: Walk (silent)
- **Ctrl**: Crouch

**Technical Highlights:**
- Uses `Async` blocks for game loop without blocking WebSocket events
- HTML-based JavaScript inclusion for large game code (avoiding WebSocket injection issues)
- Proper use of `builder.raw()` instead of `builder.text()` to prevent HTML escaping
- 1.5-second delay for WebSocket connection establishment
- Visual indicators to confirm JavaScript execution
- Modular game architecture with separate systems (Input, Renderer, Game Logic)
- Canvas-based rendering with optimized drawing calls

**Running CS 1.6 Classic:**
```bash
# From project root - runs CS16ClassicView with authentic rules
cd examples/cs2d
bundle exec lively ./application.rb

# Run original monolithic version (2227 lines)
./bin/lively examples/cs2d/cs16_classic_rules.rb

# Run refactored modular version (recommended)
./bin/lively examples/cs2d/cs16_classic_refactored.rb
```

**Refactored Modular Architecture:**
The CS2D example has been refactored from a single 2227-line file into a clean modular structure:

```
cs16_classic_refactored.rb     # Main view (338 lines, 85% reduction)
lib/
  cs16_game_state.rb           # Game state management
  cs16_player_manager.rb       # Player creation and management  
  cs16_hud_components.rb       # HUD rendering components
public/_static/
  cs16_classic_game.js         # Externalized JavaScript (1645+ lines)
```

**Key Implementation Patterns:**
- **Modular Design**: Ruby modules for single responsibility (GameState, PlayerManager, HudComponents)
- **JavaScript Externalization**: Large game logic moved to separate cached .js file
- **Clean Separation**: Server logic in Ruby, client logic in JavaScript
- **Component Reusability**: HUD components can be reused across different game modes
- **Maintainable Structure**: Each file handles one specific concern
- **Performance**: External JavaScript is cached by browser
- **Debugging**: Issues can be isolated to specific modules

**Technical Lessons Learned:**
- **Large JavaScript Applications**: Always use HTML-based inclusion for game code >10K characters
- **Builder Methods**: Use `builder.raw()` for JavaScript/HTML, `builder.text()` for user content
- **WebSocket Timing**: Add 1.5+ second delays before `self.script()` calls in `bind` method
- **Error Prevention**: Add nil checks for all instance variables in render methods
- **Canvas Context**: Always verify canvas and context exist before drawing operations
- **Game Loop**: Use `requestAnimationFrame` for smooth 60 FPS rendering
- **Delta Time**: Calculate deltaTime for frame-independent movement
- **Camera System**: Implement proper canvas translation for player-centered views using save/restore
- **Aim Calculation**: With camera follow, calculate angle from screen center to mouse position
- **Rendering Order**: Apply camera transforms only to world elements, not UI elements
- **Debug Visualization**: Add visual aim lines and coordinate displays for debugging game mechanics
- **Movement System**: Use `document.addEventListener` for reliable keyboard input, not canvas events
- **Key Handling**: Use `e.code` for consistent key codes, not `e.key` which varies by case
- **Collision Detection**: Implement proper wall/box collision to prevent walking through solid objects
- **State Initialization**: Always initialize game state in constructor to prevent nil reference errors

**Debugging JavaScript Execution Issues:**
If you encounter black screen or JavaScript execution problems:
1. **Check HTML inclusion**: Verify JavaScript is properly included via `builder.raw()`
2. **Add visual indicators**: Create DOM elements to confirm JavaScript execution
3. **Test canvas access**: Verify `canvas.getContext('2d')` works before complex rendering
4. **Use console logging**: Add extensive `console.log()` statements throughout initialization
5. **Validate timing**: Ensure WebSocket connections are established before script injection

#### Issue 4: Canvas-Based Game Development Patterns
**Problem**: Incorrect camera implementation and coordinate systems can break game mechanics like aiming.

**Key Implementation Patterns:**

1. **Camera Follow System**: Always implement proper camera translation for player-centered views
```javascript
// Save context before applying camera transform
ctx.save();

// Center camera on player
const cameraX = canvas.width / 2 - player.x;
const cameraY = canvas.height / 2 - player.y;
ctx.translate(cameraX, cameraY);

// Draw world elements here

// Restore context for UI rendering
ctx.restore();

// Draw UI elements (unaffected by camera)
```

2. **Aim System Calculation**: Calculate angle from screen center (where player is rendered) to mouse
```javascript
// With camera follow, player is always at screen center
const screenCenterX = canvas.width / 2;
const screenCenterY = canvas.height / 2;

// Calculate aim angle
const mouseOffsetX = mouse.x - screenCenterX;
const mouseOffsetY = mouse.y - screenCenterY;
player.angle = Math.atan2(mouseOffsetY, mouseOffsetX);
```

3. **Rendering Pipeline Order**:
   - Clear canvas
   - Save context
   - Apply camera transform
   - Render world elements (map, players, bullets)
   - Restore context
   - Render UI elements (crosshair, HUD, debug info)

4. **Debug Visualization**: Always add visual debugging aids
```javascript
// Aim line for debugging
ctx.strokeStyle = 'rgba(255, 0, 0, 0.2)';
ctx.setLineDash([5, 5]);
ctx.beginPath();
ctx.moveTo(player.x, player.y);
ctx.lineTo(player.x + Math.cos(player.angle) * 200, 
           player.y + Math.sin(player.angle) * 200);
ctx.stroke();
```

5. **Mouse Input Handling**: Get mouse coordinates relative to canvas
```javascript
canvas.addEventListener('mousemove', e => {
  const rect = canvas.getBoundingClientRect();
  mouse.x = e.clientX - rect.left;
  mouse.y = e.clientY - rect.top;
});
```

#### Issue 6: Movement System and Collision Detection
**Problem**: Player movement may not work due to incorrect keyboard event handling or missing collision detection.

**Common Movement Issues and Solutions:**

1. **Keyboard Events Not Working**:
   ```javascript
   // WRONG - Canvas doesn't reliably receive keyboard events
   canvas.addEventListener('keydown', e => {
     input.keys[e.key] = true; // Also e.key is inconsistent
   });

   // CORRECT - Use document for reliable keyboard input
   document.addEventListener('keydown', e => {
     input.keys[e.code] = true; // e.code is consistent ('KeyW', 'KeyS', etc.)
   });
   ```

2. **Key Code Mismatches**:
   ```javascript
   // WRONG - Checking different key format than stored
   if (input.keys['w']) player.y -= speed; // Won't work with e.code

   // CORRECT - Match the stored format
   if (input.keys['KeyW']) player.y -= speed; // Works with e.code
   ```

3. **Missing Collision Detection**:
   ```javascript
   // Add collision detection to prevent walking through walls
   function checkWallCollision(x, y) {
     const playerRadius = 16;
     // Define walls and boxes based on map layout
     const walls = [
       { x1: 50, y1: 100, x2: 70, y2: 300 }, // Example wall
       // Add more walls...
     ];
     
     for (const wall of walls) {
       if (x + playerRadius > wall.x1 && x - playerRadius < wall.x2 &&
           y + playerRadius > wall.y1 && y - playerRadius < wall.y2) {
         return true; // Collision detected
       }
     }
     return false;
   }

   // Apply collision checking to movement
   const newX = player.x + dx * speed * deltaTime;
   const newY = player.y + dy * speed * deltaTime;
   
   if (!checkWallCollision(newX, player.y)) {
     player.x = newX;
   }
   if (!checkWallCollision(player.x, newY)) {
     player.y = newY;
   }
   ```

4. **Modifier Keys Not Working**:
   ```javascript
   // WRONG - Single key check
   if (input.keys['Shift']) speed *= 0.4; // May not work

   // CORRECT - Check both left and right modifiers
   if (input.keys['ShiftLeft'] || input.keys['ShiftRight']) {
     speed *= 0.4; // Walking speed
   }
   ```

#### Issue 5: Player Initialization and Game State Issues
**Problem**: Null reference errors occur when game logic attempts to access player data before initialization is complete.

**Common Issues and Solutions:**
1. **Player initialization order**: Initialize local player immediately after gameState definition
   ```javascript
   // Initialize gameState
   const gameState = { localPlayerId: '...', players: {}, ... };
   
   // IMMEDIATELY initialize local player to prevent null errors
   gameState.players[gameState.localPlayerId] = {
     id: gameState.localPlayerId,
     name: 'You',
     team: 'ct',
     x: 200, y: 360,
     // ... all required properties
   };
   ```

2. **Bot player integration**: Ensure bot initialization happens in proper function structure
   ```javascript
   function initializeBotPlayers() {
     // Create complete player objects with all required properties
     for (let i = 0; i < 4; i++) {
       const botId = `bot_ct_${i}`;
       gameState.players[botId] = {
         id: botId,
         name: `CT Bot ${i + 1}`,
         team: 'ct',
         grenades: { he: 0, flash: 1, smoke: 0 },
         // ... complete property set matching local player
       };
     }
   }
   ```

3. **AI system integration**: Update game loop to include bot AI processing
   ```javascript
   function updateGame(deltaTime) {
     updatePlayerMovement(deltaTime);
     updateBotAI(deltaTime);  // Add bot AI updates
     // ... other updates
   }
   ```

#### Issue 6: Server Startup Errors
**Problem**: Ruby syntax errors or missing modules can prevent the server from starting.

**Common Errors and Solutions:**
1. **NoMethodError for Console.info**: The Console module may not be available in all contexts
   - Solution: Comment out or remove Console.info calls, or ensure the Console module is properly required
   
2. **Nil reference errors**: Accessing properties on nil objects (e.g., `@player_id[0..7]` when @player_id is nil)
   - Solution: Add conditional checks: `@player_id ? @player_id[0..7] : "default"`

3. **File corruption**: Null bytes or invalid characters in Ruby files
   - Solution: Check file encoding, recreate file if corrupted, use `file` command to verify file type

**Minimal Working CS2D Example:**
```ruby
#!/usr/bin/env lively
require 'securerandom'
require 'json'

class CS2DView < Live::View
  def bind(page)
    super
    @player_id = SecureRandom.uuid
    @game_state = { players: {}, phase: 'waiting', round_time: 30 }
    self.update!
    initialize_game_javascript
  end

  def render(builder)
    builder.tag(:div, id: "cs2d-container", data: { live: @id }) do
      builder.tag(:canvas, id: "game-canvas", width: 1280, height: 720)
      builder.tag(:div) do
        builder.text(@player_id ? "Player: #{@player_id[0..7]}" : "CS2D Game")
      end
    end
  end

  def initialize_game_javascript
    # Use self.script() for WebSocket injection of small scripts
    self.script(<<~JAVASCRIPT)
      console.log('CS2D: WebSocket JavaScript injection working!');
      const canvas = document.getElementById('game-canvas');
      if (canvas) {
        const ctx = canvas.getContext('2d');
        ctx.fillStyle = '#1a3d1a';
        ctx.fillRect(0, 0, canvas.width, canvas.height);
        ctx.fillStyle = '#00FF00';
        ctx.font = 'bold 48px Arial';
        ctx.textAlign = 'center';
        ctx.fillText('CS2D Game Ready!', canvas.width/2, canvas.height/2);
      }
    JAVASCRIPT
  end

  def close
    # Cleanup when view closes
  end
end

Application = Lively::Application[CS2DView]
```

## Code Refactoring Best Practices

### When to Refactor Large Lively Applications

**Refactor when files exceed these thresholds:**
- **Ruby View Files**: >500 lines (extract into modules)
- **JavaScript Blocks**: >100 lines (externalize to .js files)  
- **Combined Files**: >1000 lines (apply full modular architecture)
- **Repeated Patterns**: >3 similar code blocks (extract into modules/functions)

### Refactoring Strategy

1. **Identify Concerns**: Group related functionality (UI, game state, player management)
2. **Extract Modules**: Create focused Ruby modules with single responsibility
3. **Externalize JavaScript**: Move large JavaScript to separate cached files
4. **Clean Integration**: Use clean interfaces between components
5. **Test Iteratively**: Verify functionality after each refactoring step

### Module Extraction Pattern

```ruby
# Before: Monolithic view (2227 lines)
class LargeGameView < Live::View
  def initialize
    # 50+ lines of game state initialization
  end
  
  def create_player(id, team)  
    # 100+ lines of player creation
  end
  
  def render_hud(builder)
    # 300+ lines of HUD rendering
  end
  
  def render(builder)
    # 1500+ lines of JavaScript mixed with HTML
  end
end

# After: Modular architecture (338 lines main + focused modules)
class RefactoredGameView < Live::View
  include GameStateModule      # Handles game state (extracted)
  include PlayerManagerModule  # Handles players (extracted)
  include HudComponentsModule  # Handles UI rendering (extracted)
  
  def render(builder)
    render_game_container(builder)           # Clean HTML structure
    render_javascript_integration(builder)  # External JS integration
  end
end
```

### JavaScript Externalization Best Practices

1. **Create Module Export Pattern**:
```javascript
// public/_static/game_engine.js
window.GameEngine = {
  initialize: function(playerId) {
    // Game initialization
  },
  
  getGameState: function() {
    return gameState;
  }
};
```

2. **Clean Ruby Integration**:
```ruby
def render_javascript_integration(builder)
  builder.tag(:script, src: "/_static/game_engine.js")
  builder.tag(:script, type: "text/javascript") do
    builder.raw(<<~JAVASCRIPT)
      document.addEventListener('DOMContentLoaded', function() {
        if (typeof window.GameEngine !== 'undefined') {
          window.GameEngine.initialize('#{@player_id}');
        } else {
          console.error('GameEngine not loaded');
        }
      });
    JAVASCRIPT
  end
end
```

### Refactoring Checklist

**Before Starting:**
- [ ] File exceeds recommended size thresholds
- [ ] Multiple concerns mixed in single file
- [ ] Repeated code patterns identified
- [ ] JavaScript embedded in Ruby exceeds 100 lines

**During Refactoring:**
- [ ] Extract one module/concern at a time
- [ ] Maintain all original functionality
- [ ] Test each extraction step
- [ ] Use consistent naming conventions
- [ ] Add clear module documentation

**After Completion:**
- [ ] All Ruby files pass RuboCop checks
- [ ] External JavaScript loads correctly  
- [ ] No functionality regressions
- [ ] Improved maintainability and readability
- [ ] Performance improved (JS caching)

**File Size Targets After Refactoring:**
- Main view file: <400 lines
- Individual modules: <300 lines each
- External JavaScript: No size limit (cached)
- Total complexity: Significantly reduced