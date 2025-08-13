# CS2D Routing Solution Guide

## Problem: Lively Framework Routing Limitation

The CS2D application requires navigation between three distinct views:
1. **Lobby** (`/`) - Room creation and joining
2. **Room Waiting** (`/room`) - Pre-game waiting area  
3. **Game** (`/game`) - Active gameplay

**Issue**: Lively is designed as a single-page application framework and doesn't support native routing between different view classes.

## Root Cause

Lively's architecture:
- Each `Lively::Application` expects to handle the entire page lifecycle
- WebSocket connections are tied to a single view instance
- No built-in router to delegate requests to different views
- Middleware stack incompatible with Rack::URLMap routing

## Solution: Multi-Server Architecture

### Option 1: Development Setup (Quick Start)

Run the provided script to start all servers:

```bash
chmod +x start_all_servers.sh
./start_all_servers.sh
```

This starts:
- Lobby on http://localhost:9292
- Room on http://localhost:9293  
- Game on http://localhost:9294

### Option 2: Production Setup (Nginx Reverse Proxy)

1. **Start each application on different ports:**

```bash
# Terminal 1 - Lobby
PORT=9292 bundle exec lively async_redis_lobby_i18n.rb

# Terminal 2 - Room Waiting
PORT=9293 bundle exec lively room_waiting_view.rb  

# Terminal 3 - Game
PORT=9294 bundle exec lively cs16_multiplayer_view.rb
```

2. **Configure Nginx reverse proxy:**

```nginx
server {
    listen 80;
    server_name cs2d.example.com;

    # Lobby (default)
    location / {
        proxy_pass http://localhost:9292;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection "upgrade";
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
    }

    # Room Waiting
    location /room {
        proxy_pass http://localhost:9293;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection "upgrade";
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
    }

    # Game
    location /game {
        proxy_pass http://localhost:9294;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection "upgrade";
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
    }
}
```

### Option 3: Process Manager (PM2/Supervisor)

**PM2 ecosystem.config.js:**
```javascript
module.exports = {
  apps: [
    {
      name: "cs2d-lobby",
      script: "ruby",
      args: "-I../../lib -I. ../../bin/lively async_redis_lobby_i18n.rb",
      env: { PORT: 9292 },
      cwd: "/path/to/cs2d"
    },
    {
      name: "cs2d-room",
      script: "ruby",
      args: "-I../../lib -I. ../../bin/lively room_waiting_view.rb",
      env: { PORT: 9293 },
      cwd: "/path/to/cs2d"
    },
    {
      name: "cs2d-game",
      script: "ruby",
      args: "-I../../lib -I. ../../bin/lively cs16_multiplayer_view.rb",
      env: { PORT: 9294 },
      cwd: "/path/to/cs2d"
    }
  ]
};
```

## Implementation Details

### 1. Modify Navigation URLs

In `async_redis_lobby_i18n.rb`, update redirect URLs:

```javascript
// Development (multi-port)
window.location.href = 'http://localhost:9293/room?id=' + roomId;

// Production (reverse proxy)
window.location.href = '/room?id=' + roomId;
```

### 2. Share State via Redis

All three applications use the same Redis instance:
- Room data: `room:{room_id}:data`
- Player data: `player:{player_id}:room`
- Active rooms: `active_rooms`

### 3. Pass Context via URL Parameters

```javascript
// From lobby to room
window.location.href = `/room?id=${roomId}&player=${playerId}`;

// From room to game
window.location.href = `/game?room=${roomId}&player=${playerId}`;
```

### 4. Handle WebSocket Reconnection

Each view must establish its own WebSocket connection:

```ruby
def bind(page)
  super
  @page = page
  
  # Parse URL parameters
  room_id = parse_query_param('id')
  player_id = parse_query_param('player')
  
  # Restore state from Redis
  restore_room_state(room_id, player_id)
  
  # Initialize WebSocket
  initialize_websocket_connection
end
```

## Testing the Solution

1. **Verify all servers are running:**
```bash
curl -I http://localhost:9292  # Should return 200
curl -I http://localhost:9293  # Should return 200
curl -I http://localhost:9294  # Should return 200
```

2. **Test complete flow:**
```javascript
// Use Playwright MCP tools
mcp__browser__playwright_navigate url="http://localhost:9292"
// Create room
// Should redirect to :9293/room
// Start game
// Should redirect to :9294/game
```

3. **Monitor Redis state:**
```bash
redis-cli MONITOR
# Watch for room and player operations
```

## Alternative: Single-Page Redesign

If multi-server complexity is undesirable, consider redesigning as a true SPA:

```ruby
class UnifiedGameView < Live::View
  def initialize
    @current_view = :lobby
  end
  
  def render(builder)
    case @current_view
    when :lobby
      render_lobby(builder)
    when :room
      render_room_waiting(builder)
    when :game
      render_game(builder)
    end
  end
  
  def handle(event)
    case event[:type]
    when "navigate"
      @current_view = event[:detail][:view].to_sym
      self.update!
    end
  end
end
```

## Pros and Cons

### Multi-Server Approach
**Pros:**
- Clean separation of concerns
- Independent scaling
- Easier debugging
- Can use different technologies per component

**Cons:**
- Complex deployment
- Multiple processes to manage
- Requires reverse proxy setup
- Higher resource usage

### Single-Page Approach
**Pros:**
- Single process to manage
- Native Lively architecture
- Lower resource usage
- Simpler deployment

**Cons:**
- Complex view management
- Larger codebase in single file
- Harder to debug
- All components share same memory space

## Conclusion

The multi-server architecture with reverse proxy is the recommended solution for CS2D given:
1. The application is already split into distinct view files
2. Redis provides shared state management
3. Each view has complex, independent logic
4. Production scalability requirements

Use the `start_all_servers.sh` script for development and Nginx reverse proxy for production deployment.