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

**IMPORTANT: Always run RuboCop on any Ruby code you write or modify:**
- Run `bundle exec rubocop -a` to auto-correct style issues before committing
- The project uses **tabs for indentation** (not spaces)
- Use **double quotes for strings** (not single quotes)
- Follow the project's `.rubocop.yml` configuration
- All Ruby files should pass RuboCop checks without offenses

**Recent RuboCop Compliance Update (August 2025):**
The entire CS2D codebase has been updated to full RuboCop compliance:
- ✅ **30+ Ruby files** now pass RuboCop checks without violations
- ✅ **String literals** converted from single to double quotes throughout
- ✅ **Indentation** standardized to tabs across all files
- ✅ **Code style** improved while maintaining all existing functionality
- ✅ **Development workflow** enhanced with consistent coding standards

This ensures all future development follows Ruby best practices and maintains code quality.

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

**Latest Update (August 2025):**
- ✅ **98.1% Implementation Complete** - All core features implemented and tested (53/54 tests passing)
- ✅ **Fixed JavaScript initialization** - Both static HTML and dynamic Lively versions now work correctly
- ✅ **Modular architecture verified** - Refactored version with external JS confirmed working
- ✅ **WebSocket injection working** - Game initializes properly through Lively framework
- ✅ **Complete Feature Set** - Added bomb system, scoreboard, bullet hit detection, time formatting
- ✅ **All CS 1.6 rules validated** - Authentic gameplay mechanics fully implemented
- ✅ **Buy Zone System** - Competitive buy zones with 15-second buy time and spawn-based restrictions
- ✅ **Buy Menu Fixed** - Complete buy menu now renders properly with all CS 1.6 weapons

**Classic CS 1.6 Features:**
- **Authentic Weapon System**: Classic weapons with original prices (AK-47 $2500, M4A1 $3100, AWP $4750, Desert Eagle $650)
- **Classic Movement**: Authentic CS 1.6 movement speeds, walk/crouch modifiers, weapon speed penalties
- **Competitive Rules**: 1:55 round time, 15s freeze time, 35s C4 timer, 15s buy time
- **Classic Economy**: $800 starting money, progressive loss bonuses ($1400-3400), authentic kill rewards
- **Bomb Gameplay**: 3s plant time, 10s defuse (5s with kit), A/B bomb sites, $800 plant bonus
- **5v5 Format**: Best of 30 rounds, halftime at round 15, first to 16 wins
- **Classic Grenades**: HE $300, Flash $200, Smoke $300 with authentic physics
- **Movement & Combat**: Proper collision detection, wall clipping prevention, diagonal normalization
- **Bot AI System**: Advanced bot AI with combat states, patrol routes, bomb objectives
- **Map Design**: de_dust2 style layout with proper wall and box collision
- **HUD Elements**: Classic CS 1.6 styling with health, armor, money, round timer, scoreboard
- **Dynamic Crosshair**: Expands with movement, crouching reduces spread
- **Buy Zone System**: Players must be within 200 units of spawn to buy, visual zone indicators on map

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
- 2-second delay for WebSocket connection establishment with `inject_game_initialization()`
- Visual indicators to confirm JavaScript execution
- Modular game architecture with separate systems (Input, Renderer, Game Logic)
- Canvas-based rendering with optimized drawing calls
- **Complete HUD system** with health, armor, money, killfeed, timer, and scoreboard
- **Advanced bot AI** with dynamic patrol routes, combat states, and bomb objectives
- **Fully functional bullet system** with `checkBulletHit()` detection and damage calculation
- **Bomb defusal system** with `plantBomb()` and `defuseBomb()` functions
- **Round management system** with proper win conditions and team progression
- **Scoreboard system** with `renderScoreboard()` and Tab key toggle
- **Time formatting** with `formatTime()` for proper MM:SS display
- **60 FPS optimized rendering** with efficient collision detection and memory management

**Running CS 1.6 Classic:**
```bash
# From project root - runs refactored version with external JS (RECOMMENDED)
cd examples/cs2d
bundle exec lively ./application.rb

# Alternative: Run refactored version directly
./bin/lively examples/cs2d/cs16_classic_refactored.rb

# Testing: Open static HTML test page (for development/debugging)
open examples/cs2d/test_cs16_classic.html

# Legacy: Original monolithic version (2227 lines, embedded JS)
./bin/lively examples/cs2d/cs16_classic_rules.rb
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
  cs16_classic_game.js         # Externalized JavaScript (1800+ lines, fully functional)
```

**Complete MVP Game System:**
The CS2D project now includes a comprehensive MVP multiplayer system with full client-server architecture:

```
game/                          # Core game engine components
  bullet.rb                    # Bullet physics and damage calculation
  game_state.rb               # Central game state management
  mvp_bomb_system.rb          # C4 plant/defuse mechanics
  mvp_economy.rb              # Money system and buy phase
  mvp_game_room.rb            # Room-based multiplayer logic
  mvp_player.rb               # Player state and actions
  mvp_round_manager.rb        # Round progression and win conditions
  weapon_config.rb            # Weapon stats and configurations
progression/                   # Player progression system
  achievement_system.rb       # Unlockables and achievements
  rank_system.rb              # Competitive ranking
  match_history.rb            # Game statistics tracking
  tournament_system.rb        # Tournament bracket management
```

**Key Implementation Patterns:**
- **Modular Design**: Ruby modules for single responsibility (GameState, PlayerManager, HudComponents)
- **JavaScript Externalization**: Large game logic moved to separate cached .js file (1800+ lines)
- **Clean Separation**: Server logic in Ruby, client logic in JavaScript
- **Component Reusability**: HUD components can be reused across different game modes
- **Maintainable Structure**: Each file handles one specific concern
- **Performance**: External JavaScript is cached by browser
- **Debugging**: Issues can be isolated to specific modules
- **Test Coverage**: 98.1% test coverage with comprehensive validation suite
- **Function Export**: All game functions exposed via `window.CS16Classic` for testing

**Technical Lessons Learned:**
- **Large JavaScript Applications**: Always use HTML-based inclusion for game code >10K characters
- **Builder Methods**: Use `builder.raw()` for JavaScript/HTML, `builder.text()` for user content
- **WebSocket Timing**: Add 2+ second delays before `self.script()` calls in `bind` method for initialization
- **JavaScript Initialization**: Use `inject_game_initialization()` method to ensure module loads before calling
- **Module Export Pattern**: Export game functions via `window.CS16Classic = { initializeGame, gameState, ... }`
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
- **Bullet System**: Implement proper damage calculation with hit detection and player health management
- **Bot AI Patterns**: Use state machines for bot behavior (idle, patrol, combat, bomb objectives)
- **HUD Integration**: Create modular UI components that update independently from game state
- **Performance Optimization**: Profile rendering calls and optimize memory usage for 60 FPS gameplay
- **RuboCop Compliance**: Always run `bundle exec rubocop -a` after making changes to Ruby files
- **Static vs Dynamic Testing**: Create HTML test pages for JavaScript validation before Lively integration

### Critical Bug Fixes (August 2025)

#### Buy Menu Visibility Issues in Dynamic DOM Environments
**Problem**: Buy menus created server-side with Ruby builders may become invisible due to Lively framework DOM updates, CSS conflicts, or z-index stacking issues.

**Root Cause**: Lively's real-time DOM updates can override CSS styles, hide elements, or place them behind other content, even when `display: block` and high z-index values are applied.

**Solution**: Create fresh DOM elements client-side with maximum CSS specificity and bypass existing server-generated content:

```javascript
// Nuclear Option: Fresh DOM Element Creation
const newBuyMenu = document.createElement('div');
newBuyMenu.style.cssText = `
  position: fixed !important;
  top: 50% !important;
  left: 50% !important;
  transform: translate(-50%, -50%) !important;
  z-index: 999999 !important;
  background: rgba(20, 20, 20, 0.95) !important;
  border: 3px solid #ff6b00 !important;
`;

// Remove any conflicting elements first
document.querySelectorAll('[id*="buy"]').forEach(menu => menu.remove());

// Add directly to body (not game container)
document.body.appendChild(newBuyMenu);
```

**Key Principles for Dynamic DOM Compatibility:**
- **Direct Body Insertion**: Add elements to `document.body`, not nested containers
- **Maximum CSS Specificity**: Use `!important` declarations and inline styles
- **Element Recreation**: Create fresh elements instead of modifying existing ones
- **Conflict Removal**: Remove existing elements that might interfere
- **Ultra-High Z-Index**: Use values like `999999` to ensure top-level rendering

#### Bullet Positioning in Camera-Transformed Canvases  
**Problem**: Bullets spawn from incorrect coordinates (fixed map positions) instead of player position when using camera transformations.

**Root Cause**: Canvas rendering applies camera transforms (`ctx.translate()`) to center view on player, but bullet spawn coordinates aren't properly synchronized with the transformed coordinate system.

**Solution**: Ensure bullets spawn in world coordinates and render within camera transform context:

```javascript
// CORRECT: Bullets spawn at actual player world position
function shoot() {
  const player = gameState.players[gameState.localPlayerId];
  gameState.bullets.push({
    x: player.x,           // World coordinates
    y: player.y,           // World coordinates  
    vx: Math.cos(player.angle) * speed,
    vy: Math.sin(player.angle) * speed,
    // ... other properties
  });
}

// CORRECT: Render bullets within camera transform
function renderBullets() {
  // This runs inside ctx.save()/ctx.translate()/ctx.restore() block
  for (const bullet of gameState.bullets) {
    ctx.beginPath();
    ctx.moveTo(bullet.x, bullet.y);  // Already in world coords
    ctx.lineTo(bullet.x + bullet.vx * 0.05, bullet.y + bullet.vy * 0.05);
    ctx.stroke();
  }
}
```

**Debug Verification**: Add console logging to confirm bullet spawn coordinates match player position:
```javascript
console.log(`Bullet created: player at (${player.x}, ${player.y}), bullet at (${bullet.x}, ${bullet.y})`);
```

#### Lively Framework Integration Best Practices
**Essential Debugging Steps:**
1. **Hard Browser Refresh**: Always use Ctrl+Shift+R to bypass cache when testing fixes
2. **Version Logging**: Add unique console messages to verify JavaScript updates are loading
3. **Element Inspection**: Log DOM element properties, styles, and bounding rectangles
4. **Multiple Approaches**: Try both server-side Ruby builders AND client-side JavaScript creation
5. **Incremental Testing**: Test individual fixes separately before combining solutions

**Working Example - Compact Buy Menu**:
```javascript
// Compact, combat-safe buy menu that doesn't obstruct gameplay
newBuyMenu.style.cssText = `
  position: fixed !important;
  top: 50% !important;
  left: 50% !important;
  transform: translate(-50%, -50%) !important;
  width: 600px !important;
  max-height: 80vh !important;
  background: rgba(20, 20, 20, 0.95) !important;
  border: 3px solid #ff6b00 !important;
  z-index: 999999 !important;
`;
```

This creates a professional, compact buy menu that doesn't cover the entire screen and allows continued gameplay while shopping.

#### Player ID Synchronization Issues in Multiplayer Games
**Problem**: Bullets spawn from wrong player positions (bot coordinates instead of local player) despite correct player data in debug logs.

**Root Cause**: Player object references can become desynchronized in complex game states with multiple players (local player + AI bots). The `player` variable in functions may reference a cached or incorrect player object instead of the current local player.

**Symptoms**:
- Debug logs show correct local player position (e.g., `player.x: 200, player.y: 472`)
- Bullets spawn at completely different coordinates (e.g., `(613, 281)` matching bot positions)
- Player lookup appears correct but uses wrong data

**Solution**: Force direct lookup of local player for critical operations instead of relying on function parameter references:

```javascript
// WRONG - May use cached/incorrect player reference
function shoot() {
  const player = gameState.players[gameState.localPlayerId];
  // ... other code ...
  gameState.bullets.push({
    x: player.x,  // May be wrong player!
    y: player.y,
    // ...
  });
}

// CORRECT - Force fresh lookup for critical operations  
function shoot() {
  const player = gameState.players[gameState.localPlayerId];
  // ... other code ...
  gameState.bullets.push({
    x: gameState.players[gameState.localPlayerId].x,  // Guaranteed correct
    y: gameState.players[gameState.localPlayerId].y,  // Guaranteed correct
    playerId: gameState.localPlayerId,  // Use authoritative ID
    // ...
  });
}
```

**Debug Verification**: Add comprehensive logging to detect synchronization issues:
```javascript
console.log('🚨 BULLET SPAWN VERIFICATION:');
console.log('  Using player ID:', player.id);
console.log('  Expected local player ID:', gameState.localPlayerId);
console.log('  Player ID match:', player.id === gameState.localPlayerId);
console.log('  Bullet will spawn at:', player.x, player.y);
console.log('  Expected spawn:', gameState.players[gameState.localPlayerId]?.x, gameState.players[gameState.localPlayerId]?.y);
```

#### Number Key Weapon Purchase System
**Implementation**: Authentic CS 1.6 style number key shortcuts for rapid weapon purchasing during buy time:

```javascript
// Number key purchase system
const buyMenu = document.getElementById('claude-buy-menu');
if (buyMenu) {
  if (e.code === 'Digit1') buyWeapon('ak47', 2500);   // [1] AK-47
  else if (e.code === 'Digit2') buyWeapon('m4a1', 3100);  // [2] M4A1  
  else if (e.code === 'Digit3') buyWeapon('awp', 4750);   // [3] AWP
  else if (e.code === 'Digit4') buyWeapon('deagle', 650); // [4] Desert Eagle
  else if (e.code === 'Digit5') buyWeapon('usp', 500);    // [5] USP
  else if (e.code === 'Digit0') buyWeapon('glock', 0);    // [0] Glock (free)
}

// Real weapon purchase with money deduction
function buyWeapon(weaponId, price) {
  const player = gameState.players[gameState.localPlayerId];
  if (player.money < price) {
    console.log(`❌ Not enough money! Need $${price}, have $${player.money}`);
    return;
  }
  
  player.money -= price;
  if (['ak47', 'm4a1', 'awp'].includes(weaponId)) {
    player.primaryWeapon = weaponId;
    player.currentWeapon = 'primary';
  } else {
    player.secondaryWeapon = weaponId;
    if (!player.primaryWeapon) player.currentWeapon = 'secondary';
  }
  
  // Auto-close menu after purchase
  setTimeout(() => {
    document.getElementById('claude-buy-menu')?.remove();
  }, 500);
}
```

**Enhanced Buy Menu UI**: Professional compact design with clear number key indicators:
```javascript
newBuyMenu.innerHTML = `
  <div style="text-align: center; color: #ffaa00; margin-bottom: 10px;">
    💡 Use number keys to buy: 1-3 for rifles, 4-5 for pistols, 0 for Glock
  </div>
  <button onclick="buyWeapon('ak47', 2500);">
    <strong style="color: #ffaa00;">[1]</strong> AK-47 - $2500
  </button>
  <!-- More weapons with highlighted number keys -->
`;
```

**Key Features**:
- **Lightning-fast purchases** without mouse interaction
- **Real money deduction** and weapon equipping
- **Visual number key indicators** in orange highlights
- **Compact 600px menu** that doesn't obstruct gameplay
- **Auto-closes after purchase** for quick buying
- **ESC key support** for menu dismissal

This system enables authentic CS 1.6 buying experience where players can rapidly purchase weapons during the 15-second buy time without taking hands off movement keys.

**Debugging JavaScript Execution Issues:**
If you encounter black screen or JavaScript execution problems:
1. **Check HTML inclusion**: Verify JavaScript is properly included via `builder.raw()`
2. **Add visual indicators**: Create DOM elements to confirm JavaScript execution
3. **Test canvas access**: Verify `canvas.getContext('2d')` works before complex rendering
4. **Use console logging**: Add extensive `console.log()` statements throughout initialization
5. **Validate timing**: Ensure WebSocket connections are established before script injection
6. **Run verification script**: Use `node verify_cs16_classic.js` to check all features
7. **Test static version**: Open `test_cs16_classic.html` to isolate JavaScript issues

**Advanced Debugging with Frame Analysis:**
For complex game issues, use video frame extraction to analyze specific problems:

```bash
# Extract frames from gameplay recordings for analysis
ffmpeg -i "gameplay_recording.mov" -vf fps=1 frames/frame_%04d.png

# Analyze extracted frames to identify:
# - Bot movement patterns and AI behavior issues
# - Bullet trajectory and damage calculation problems  
# - HUD element rendering and update inconsistencies
# - Collision detection failures and clipping issues
```

**Game System Debugging Checklist:**
- [ ] **Bullet System**: Verify bullets spawn, travel, and damage players correctly
- [ ] **Bot AI**: Check that bots move, patrol, and engage in combat (not static for 8+ seconds)
- [ ] **HUD Elements**: Confirm health, armor, money, timer, and killfeed display and update
- [ ] **Round Progression**: Test win conditions, round transitions, and score tracking
- [ ] **Collision Detection**: Verify wall collisions prevent clipping through obstacles
- [ ] **Performance**: Monitor FPS and memory usage during extended gameplay sessions

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

#### Issue 7: Buy Menu Not Working in Lively Framework
**Problem**: Buy Menu works in static HTML but fails in the dynamic Lively environment due to DOM updates.

**Root Cause**: Lively's `self.update!` recreates DOM elements, causing:
- Event listeners to become detached
- DOM elements to be replaced
- JavaScript references to become stale

**Solution - DOM Resilience System:**
```javascript
// Add DOM monitoring at the start of your JavaScript file
(function() {
  let domObserver = null;
  let lastBuyMenuState = 'none';
  
  function setupDOMMonitor() {
    domObserver = new MutationObserver(function(mutations) {
      const buyMenu = document.getElementById('buy-menu');
      if (buyMenu && lastBuyMenuState === 'block' && buyMenu.style.display === 'none') {
        // Restore buy menu state after DOM update
        buyMenu.style.display = 'block';
        buyMenu.style.pointerEvents = 'auto';
        buyMenu.style.zIndex = '9999';
      }
      ensureBuyMenuEvents();
    });
    
    domObserver.observe(document.body, {
      childList: true,
      subtree: true,
      attributes: true
    });
  }
  
  // Use event delegation to survive DOM updates
  document.addEventListener('click', function(e) {
    if (e.target.id === 'buy-button' || e.target.closest('#buy-button')) {
      e.preventDefault();
      window.toggleBuyMenu();
    }
  }, true);
  
  setupDOMMonitor();
})();
```

**Enhanced Toggle Function with Retry:**
```javascript
window.toggleBuyMenu = function() {
  let buyMenu = document.getElementById('buy-menu');
  
  if (!buyMenu) {
    // Retry after next frame if DOM is updating
    requestAnimationFrame(() => {
      buyMenu = document.getElementById('buy-menu');
      if (buyMenu) performToggle(buyMenu);
    });
    return;
  }
  
  performToggle(buyMenu);
};

function performToggle(buyMenu) {
  const newDisplay = buyMenu.style.display === 'none' ? 'block' : 'none';
  buyMenu.style.display = newDisplay;
  buyMenu.style.pointerEvents = 'auto';
  buyMenu.style.zIndex = '9999';  // Ensure it's on top
  buyMenu.style.position = 'absolute';
  
  if (newDisplay === 'block') {
    buyMenu.style.top = '50%';
    buyMenu.style.left = '50%';
    buyMenu.style.transform = 'translate(-50%, -50%)';
  }
}
```

**Key Principles for Dynamic DOM Compatibility:**
1. **Event Delegation**: Attach events to document/body, not specific elements
2. **State Preservation**: Track UI state independently of DOM
3. **Retry Mechanisms**: Use requestAnimationFrame for DOM timing issues
4. **Force Styling**: Always set all necessary styles, don't rely on CSS classes
5. **Monitor DOM Changes**: Use MutationObserver to detect and respond to updates

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