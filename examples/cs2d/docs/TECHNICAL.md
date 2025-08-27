# CS2D Technical Documentation

## Architecture Overview

CS2D is built using a client-server architecture with real-time WebSocket communication for multiplayer gameplay.

```
┌─────────────┐         WebSocket          ┌─────────────┐
│   Browser   │◄──────────────────────────►│ Ruby Server │
│   (Canvas)  │         JSON Events         │  (WEBrick)  │
└─────────────┘                            └─────────────┘
       │                                           │
       ▼                                           ▼
┌─────────────┐                            ┌─────────────┐
│  Game Loop  │                            │ Game State  │
│   30 FPS    │                            │   Manager   │
└─────────────┘                            └─────────────┘
```

## Technology Stack

### Backend

- **Language**: Ruby 3.2+
- **Framework**: Lively (WebSocket + Live Views)
- **Server**: WEBrick HTTP Server
- **Protocol**: WebSocket for real-time communication

### Frontend

- **Rendering**: HTML5 Canvas 2D Context
- **Language**: Vanilla JavaScript ES6+
- **Physics**: Custom 2D physics engine
- **Audio**: Web Audio API (planned)

## Network Protocol

### WebSocket Events

#### Client → Server

```javascript
// Player Input Event
{
  "type": "player_input",
  "data": {
    "move": { "x": 1, "y": 0, "shift": false },
    "shoot": true,
    "angle": 1.57,
    "reload": false,
    "use": false
  }
}

// Buy Weapon Event
{
  "type": "buy_weapon",
  "weapon": "ak47"
}

// Chat Message
{
  "type": "chat",
  "message": "Rush B!"
}

// Bomb Actions
{
  "type": "plant_bomb" | "defuse_bomb"
}
```

#### Server → Client

```javascript
// Game State Update (30Hz)
{
  "type": "game_state",
  "data": {
    "players": { /* player data */ },
    "bullets": [ /* bullet array */ ],
    "round": { /* round info */ },
    "bomb": { /* bomb state */ },
    "map": { /* map data */ }
  }
}

// Event Notification
{
  "type": "event",
  "event": "player_killed" | "bomb_planted" | "round_end",
  "data": { /* event details */ }
}
```

## Game State Management

### State Structure

```ruby
class GameState
  attr_accessor :players,     # Hash of Player objects
                :bullets,     # Array of active bullets
                :round,       # RoundManager instance
                :bomb,        # BombSystem instance
                :map,         # Map instance
                :economy      # Economy manager
end
```

### Player State

```ruby
class Player
  # Identity
  attr_accessor :id, :name, :team

  # Position & Physics
  attr_accessor :x, :y, :vx, :vy, :angle

  # Combat Stats
  attr_accessor :health, :armor, :alive

  # Weapons & Equipment
  attr_accessor :weapons, :current_weapon, :ammo

  # Economy
  attr_accessor :money, :kills, :deaths

  # Network
  attr_accessor :ping, :packet_loss
end
```

### Update Loop

```ruby
# Server-side game loop (30 Hz)
def game_loop
  loop do
    delta_time = 1.0 / 30.0

    # 1. Process input queue
    process_player_inputs

    # 2. Update physics
    update_physics(delta_time)

    # 3. Check collisions
    check_collisions

    # 4. Update game logic
    update_game_logic(delta_time)

    # 5. Broadcast state
    broadcast_game_state

    sleep(delta_time)
  end
end
```

## Physics Engine

### Movement System

```javascript
// Client-side prediction
class MovementSystem {
  constructor() {
    this.position = { x: 0, y: 0 };
    this.velocity = { x: 0, y: 0 };
    this.acceleration = { x: 0, y: 0 };
  }

  update(deltaTime) {
    // Apply acceleration
    this.velocity.x += this.acceleration.x * deltaTime;
    this.velocity.y += this.acceleration.y * deltaTime;

    // Apply friction
    this.velocity.x *= 0.9;
    this.velocity.y *= 0.9;

    // Update position
    this.position.x += this.velocity.x * deltaTime;
    this.position.y += this.velocity.y * deltaTime;

    // Collision detection
    this.checkCollisions();
  }
}
```

### Collision Detection

```javascript
// AABB Collision
function checkAABB(a, b) {
  return a.x < b.x + b.width && a.x + a.width > b.x && a.y < b.y + b.height && a.y + a.height > b.y;
}

// Circle Collision
function checkCircle(a, b) {
  const dx = a.x - b.x;
  const dy = a.y - b.y;
  const distance = Math.sqrt(dx * dx + dy * dy);
  return distance < a.radius + b.radius;
}

// Line-Circle Intersection (for bullets)
function lineCircleIntersection(line, circle) {
  // Implementation for hitscan weapons
}
```

## Networking

### Lag Compensation

```javascript
// Client-side prediction
class ClientPrediction {
  constructor() {
    this.stateBuffer = [];
    this.inputBuffer = [];
    this.sequenceNumber = 0;
  }

  predictMovement(input) {
    // Apply input immediately
    this.applyInput(input);

    // Store for reconciliation
    this.inputBuffer.push({
      input: input,
      sequence: this.sequenceNumber++,
      timestamp: Date.now(),
    });
  }

  reconcile(serverState) {
    // Find matching state
    const matchingInput = this.inputBuffer.find(
      (i) => i.sequence === serverState.lastProcessedInput,
    );

    if (matchingInput) {
      // Replay inputs from that point
      this.replayInputs(matchingInput.sequence);
    }
  }
}
```

### Interpolation

```javascript
// Entity interpolation for smooth movement
class Interpolator {
  constructor() {
    this.buffer = [];
    this.renderDelay = 100; // 100ms behind
  }

  addState(state) {
    this.buffer.push({
      state: state,
      timestamp: Date.now(),
    });

    // Keep only last 1 second
    const cutoff = Date.now() - 1000;
    this.buffer = this.buffer.filter((s) => s.timestamp > cutoff);
  }

  getInterpolatedState() {
    const renderTime = Date.now() - this.renderDelay;

    // Find surrounding states
    let before = null,
      after = null;
    for (let i = 0; i < this.buffer.length - 1; i++) {
      if (this.buffer[i].timestamp <= renderTime && this.buffer[i + 1].timestamp >= renderTime) {
        before = this.buffer[i];
        after = this.buffer[i + 1];
        break;
      }
    }

    if (before && after) {
      // Linear interpolation
      const t = (renderTime - before.timestamp) / (after.timestamp - before.timestamp);
      return this.lerp(before.state, after.state, t);
    }

    return this.buffer[this.buffer.length - 1]?.state;
  }
}
```

## Performance Optimization

### Rendering Pipeline

```javascript
class RenderOptimizer {
  constructor(canvas) {
    this.canvas = canvas;
    this.ctx = canvas.getContext('2d', {
      alpha: false, // No transparency
      desynchronized: true, // Reduce latency
    });

    // Object pooling
    this.bulletPool = new ObjectPool(Bullet, 1000);
    this.particlePool = new ObjectPool(Particle, 500);
  }

  render(gameState) {
    // Frustum culling
    const visibleEntities = this.frustumCull(gameState.entities);

    // Batch rendering
    this.batchRender(visibleEntities);

    // Level of detail
    this.applyLOD(visibleEntities);
  }

  frustumCull(entities) {
    const camera = this.camera;
    return entities.filter((e) => {
      return (
        e.x > camera.left - 50 &&
        e.x < camera.right + 50 &&
        e.y > camera.top - 50 &&
        e.y < camera.bottom + 50
      );
    });
  }
}
```

### Memory Management

```javascript
// Object pooling to reduce garbage collection
class ObjectPool {
  constructor(Type, size) {
    this.Type = Type;
    this.pool = [];
    this.active = [];

    // Pre-allocate objects
    for (let i = 0; i < size; i++) {
      this.pool.push(new Type());
    }
  }

  acquire() {
    if (this.pool.length > 0) {
      const obj = this.pool.pop();
      this.active.push(obj);
      return obj;
    }
    return new this.Type();
  }

  release(obj) {
    const index = this.active.indexOf(obj);
    if (index !== -1) {
      this.active.splice(index, 1);
      obj.reset();
      this.pool.push(obj);
    }
  }
}
```

## Data Structures

### Spatial Indexing

```javascript
// Quadtree for efficient collision detection
class Quadtree {
  constructor(bounds, maxObjects = 10, maxLevels = 5, level = 0) {
    this.bounds = bounds;
    this.maxObjects = maxObjects;
    this.maxLevels = maxLevels;
    this.level = level;
    this.objects = [];
    this.nodes = [];
  }

  insert(object) {
    if (this.nodes.length > 0) {
      const index = this.getIndex(object);
      if (index !== -1) {
        this.nodes[index].insert(object);
        return;
      }
    }

    this.objects.push(object);

    if (this.objects.length > this.maxObjects && this.level < this.maxLevels) {
      if (this.nodes.length === 0) {
        this.split();
      }

      let i = 0;
      while (i < this.objects.length) {
        const index = this.getIndex(this.objects[i]);
        if (index !== -1) {
          this.nodes[index].insert(this.objects.splice(i, 1)[0]);
        } else {
          i++;
        }
      }
    }
  }

  retrieve(object) {
    const index = this.getIndex(object);
    let returnObjects = this.objects;

    if (this.nodes.length > 0) {
      if (index !== -1) {
        returnObjects = returnObjects.concat(this.nodes[index].retrieve(object));
      } else {
        for (let node of this.nodes) {
          returnObjects = returnObjects.concat(node.retrieve(object));
        }
      }
    }

    return returnObjects;
  }
}
```

## Security

### Anti-Cheat Measures

```ruby
class AntiCheat
  def validate_input(player, input)
    # Movement speed check
    return false if input[:move] &&
                    calculate_speed(input[:move]) > MAX_SPEED

    # Fire rate check
    return false if input[:shoot] &&
                    !can_shoot?(player)

    # Position validation
    return false if input[:position] &&
                    !valid_position?(input[:position])

    # Aim angle validation
    return false if input[:angle] &&
                    (input[:angle] < 0 || input[:angle] > 2 * Math::PI)

    true
  end

  def validate_state(player)
    # Health bounds
    return false if player.health < 0 || player.health > 100

    # Money bounds
    return false if player.money < 0 || player.money > 16000

    # Ammo bounds
    return false if player.ammo[:clip] < 0 ||
                    player.ammo[:clip] > player.weapon[:clip_size]

    true
  end
end
```

### Input Sanitization

```javascript
// Client-side input validation
function sanitizeInput(input) {
  const sanitized = {};

  // Movement
  if (input.move) {
    sanitized.move = {
      x: Math.max(-1, Math.min(1, input.move.x || 0)),
      y: Math.max(-1, Math.min(1, input.move.y || 0)),
      shift: Boolean(input.move.shift),
    };
  }

  // Shooting
  if (input.shoot !== undefined) {
    sanitized.shoot = Boolean(input.shoot);
  }

  // Angle
  if (input.angle !== undefined) {
    sanitized.angle = Math.max(0, Math.min(2 * Math.PI, input.angle));
  }

  return sanitized;
}
```

## Configuration

### Server Configuration

```yaml
# config/server.yml
server:
  port: 9292
  host: 0.0.0.0
  max_players: 10
  tick_rate: 30

game:
  round_time: 115
  freeze_time: 5
  buy_time: 15
  bomb_timer: 45
  max_rounds: 30

network:
  timeout: 30000
  max_packet_size: 1024
  compression: true

performance:
  max_bullets: 1000
  max_entities: 500
  view_distance: 1000
```

### Client Configuration

```javascript
// config/client.js
const CONFIG = {
  graphics: {
    fps: 60,
    resolution: 'auto',
    shadows: true,
    particles: true,
    antialiasing: true,
  },

  controls: {
    sensitivity: 2.5,
    autoAim: false,
    invertY: false,
    toggleCrouch: false,
  },

  audio: {
    master: 1.0,
    effects: 0.8,
    music: 0.5,
    voice: 1.0,
  },

  network: {
    interpolation: 100,
    extrapolation: true,
    prediction: true,
  },
};
```

## API Reference

### REST Endpoints

```
GET  /api/status        # Server status
GET  /api/players       # Active players list
GET  /api/rooms         # Available game rooms
POST /api/rooms         # Create new room
GET  /api/stats/:id     # Player statistics
```

### WebSocket Commands

```javascript
// Join game
ws.send(
  JSON.stringify({
    type: 'join',
    data: { name: 'Player', team: 'auto' },
  }),
);

// Leave game
ws.send(
  JSON.stringify({
    type: 'leave',
  }),
);

// Team change
ws.send(
  JSON.stringify({
    type: 'change_team',
    team: 'ct' | 't',
  }),
);

// Vote
ws.send(
  JSON.stringify({
    type: 'vote',
    vote: 'kick' | 'map' | 'restart',
    target: 'player_id' | 'map_name',
  }),
);
```

## Development

### Building from Source

```bash
# Clone repository
git clone https://github.com/yourusername/cs2d.git
cd cs2d

# Install dependencies
bundle install
npm install

# Run development server
bundle exec ruby cs16_server.rb

# Run tests
bundle exec rspec
npm test

# Build for production
rake build
```

### Contributing

Please read [CONTRIBUTING.md](../CONTRIBUTING.md) for details on our code of conduct and the process for submitting pull requests.

## License

This project is licensed under the MIT License - see the [LICENSE](../LICENSE) file for details.
