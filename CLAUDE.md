# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

Lively is a Ruby framework for building interactive web applications for creative coding. It provides real-time communication between client and server using WebSockets through the Live gem, and runs on the Falcon web server.

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

### CS 1.6 Game (`examples/cs2d/`)
A fully-featured Counter-Strike 1.6 clone built with Lively demonstrating real-time game development:

**Features:**
- **Complete Weapon System**: 15+ weapons including M4A1, AK-47, AWP, Desert Eagle, Glock, USP, MP5, P90, Scout with realistic stats
- **Movement Mechanics**: Walk (Shift), crouch (Ctrl), normal speed with proper physics and diagonal normalization
- **Combat System**: Fire rates, recoil, bullet spread, damage falloff, headshots, armor penetration
- **Bomb Gameplay**: Plant/defuse mechanics with 35-second timer, A/B bomb sites, defuse kits
- **Grenades**: Flashbang (G), smoke (F), HE grenade (4) with realistic physics and effects
- **Economy System**: Buy menu (B key), weapon prices, round bonuses, money management
- **Round System**: Best of 30 rounds, freeze time, round timer, proper win conditions
- **Bot AI**: 7 bots (3 CT, 4 T) with combat AI, movement patterns, shooting mechanics
- **Map Design**: de_dust2 style layout with walls, boxes, bomb sites, spawn areas
- **HUD Elements**: Health, armor, ammo counter, weapon name, money, scores, round timer
- **Dynamic Crosshair**: Expands with movement, affected by shooting, walking, crouching

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

**Running CS 1.6:**
```bash
# From project root
./bin/lively examples/cs2d/application.rb

# Alternative with full implementation
./bin/lively examples/cs2d/cs16_full.rb
```

**Key Implementation Patterns:**
- **JavaScript Structure**: Separate `render_game_javascript` method for HTML-based inclusion
- **WebSocket vs HTML**: Use `self.script()` for small scripts (<10K), HTML inclusion for large game code
- **Timing Management**: Add `Async` delays for WebSocket readiness before JavaScript injection
- **Visual Debugging**: Always include status indicators and console logging
- **Game State**: Centralized gameState object for all game data
- **Input Handling**: Event-driven input system with proper preventDefault calls
- **Rendering Pipeline**: Clear → Map → Entities → Effects → UI → Crosshair

**Technical Lessons Learned:**
- **Large JavaScript Applications**: Always use HTML-based inclusion for game code >10K characters
- **Builder Methods**: Use `builder.raw()` for JavaScript/HTML, `builder.text()` for user content
- **WebSocket Timing**: Add 1.5+ second delays before `self.script()` calls in `bind` method
- **Error Prevention**: Add nil checks for all instance variables in render methods
- **Canvas Context**: Always verify canvas and context exist before drawing operations
- **Game Loop**: Use `requestAnimationFrame` for smooth 60 FPS rendering
- **Delta Time**: Calculate deltaTime for frame-independent movement

**Debugging JavaScript Execution Issues:**
If you encounter black screen or JavaScript execution problems:
1. **Check HTML inclusion**: Verify JavaScript is properly included via `builder.raw()`
2. **Add visual indicators**: Create DOM elements to confirm JavaScript execution
3. **Test canvas access**: Verify `canvas.getContext('2d')` works before complex rendering
4. **Use console logging**: Add extensive `console.log()` statements throughout initialization
5. **Validate timing**: Ensure WebSocket connections are established before script injection

#### Issue 4: Server Startup Errors
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