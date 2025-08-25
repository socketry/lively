# CS2D Enhanced Multiplayer Backend

A comprehensive, production-ready multiplayer backend system for CS2D with advanced features including authentication, matchmaking, anti-cheat, and server administration.

## 🚀 Features

### Core Systems
- **Express.js API Server** with comprehensive REST endpoints
- **Socket.IO WebSocket System** with reliable messaging and lag compensation
- **PostgreSQL Database** with optimized schema and indexing
- **Redis Caching** for session management and real-time data
- **JWT Authentication** with Steam OAuth integration

### Authentication & User Management
- ✅ User registration and login with validation
- ✅ Steam OAuth integration for seamless authentication
- ✅ Email verification and password reset functionality
- ✅ Guest account system with limitations
- ✅ Multi-device session management
- ✅ Trust factor and reputation system

### Matchmaking System
- ✅ Skill-based matchmaking (SBMM) with ELO ratings
- ✅ Queue management with estimated wait times
- ✅ Region-based server selection
- ✅ Party system for playing with friends
- ✅ Map voting and game mode selection
- ✅ Balanced team creation algorithms

### Anti-Cheat System
- ✅ Server-authoritative movement validation
- ✅ Shot validation and impossible action detection
- ✅ Abnormal behavior analysis
- ✅ Hardware ID tracking and banning
- ✅ Trust factor adjustment based on behavior
- ✅ Automated violation detection and response

### Real-time Communication
- ✅ Reliable message delivery with acknowledgments
- ✅ Lag compensation and client-side prediction
- ✅ State synchronization with delta compression
- ✅ Voice chat WebRTC signaling
- ✅ In-game chat with rate limiting

### Server Administration
- ✅ Comprehensive admin dashboard
- ✅ User management (ban/unban, view stats)
- ✅ Match monitoring and management
- ✅ Anti-cheat violation review system
- ✅ Server metrics and health monitoring
- ✅ Admin action logging

### Additional Features
- ✅ Player statistics and leaderboards
- ✅ Friends system and social features
- ✅ Achievement system
- ✅ Tournament support (basic structure)
- ✅ Clan/Team system
- ✅ Match replay system (metadata)

## 📋 Prerequisites

- **Node.js** 18+ 
- **PostgreSQL** 12+
- **Redis** 6+
- **Steam API Key** (optional, for Steam OAuth)
- **SMTP Server** (optional, for email features)

## 🛠 Installation

### 1. Install Dependencies
```bash
npm install
```

### 2. Database Setup
```bash
# Create PostgreSQL database
createdb cs2d_enhanced

# Run migrations
npm run db:migrate
```

### 3. Redis Setup
```bash
# Start Redis server
redis-server

# Or using Docker
docker run -d -p 6379:6379 redis:alpine
```

### 4. Environment Configuration
```bash
# Copy example environment file
cp src/backend/.env.example src/backend/.env

# Edit configuration
nano src/backend/.env
```

### 5. Start the Server
```bash
# Development mode
npm run server:dev

# Production mode
npm run server
```

## ⚙️ Configuration

### Environment Variables

#### Server Configuration
- `NODE_ENV` - Environment (development/production)
- `PORT` - Server port (default: 3001)
- `SERVER_URL` - Public server URL
- `CLIENT_URL` - Frontend URL for CORS

#### Database Configuration
- `DB_HOST` - PostgreSQL host
- `DB_PORT` - PostgreSQL port
- `DB_NAME` - Database name
- `DB_USER` - Database username
- `DB_PASSWORD` - Database password

#### Redis Configuration
- `REDIS_HOST` - Redis host
- `REDIS_PORT` - Redis port
- `REDIS_PASSWORD` - Redis password (if required)

#### Authentication
- `JWT_SECRET` - JWT signing secret (required)
- `STEAM_API_KEY` - Steam Web API key (optional)

#### Email (Optional)
- `SMTP_HOST` - SMTP server host
- `SMTP_USER` - Email username
- `SMTP_PASS` - Email password

## 🏗 Architecture

### Service Layer
```
├── AuthService - Authentication and user management
├── MatchmakingService - Queue management and match creation
├── AntiCheatService - Cheat detection and prevention
├── GameServerManager - Server instance management
└── SocketManager - WebSocket connection handling
```

### Database Schema
```sql
users              - User accounts and profiles
player_stats       - Game statistics and ELO ratings
matches            - Match records and results
match_players      - Player participation in matches
friends            - Friend relationships
inventory          - Player items and skins
achievements       - Achievement definitions
user_achievements  - Player achievement progress
cheat_violations   - Anti-cheat violation records
cheat_reports      - Player reports
game_servers       - Server instance registry
```

### API Endpoints

#### Authentication (`/api/auth/`)
- `POST /register` - User registration
- `POST /login` - User login
- `POST /logout` - User logout
- `GET /steam` - Steam OAuth login
- `POST /guest` - Guest account creation
- `GET /verify` - Token verification
- `POST /forgot-password` - Password reset request
- `POST /reset-password` - Password reset
- `GET /profile` - User profile
- `PATCH /profile` - Update profile

#### Game API (`/api/`)
- `GET /stats/:userId` - Player statistics
- `GET /leaderboard` - Global leaderboards
- `GET /matches/history` - Match history
- `GET /matches/:matchId` - Match details
- `GET /friends` - Friends list
- `POST /friends/invite` - Send friend request
- `POST /reports` - Report player
- `GET /achievements/:userId` - Player achievements
- `GET /servers/browse` - Server browser
- `GET /status` - System status

#### Admin API (`/api/admin/`)
- `GET /dashboard` - Admin dashboard data
- `GET /users` - User management
- `POST /users/:id/ban` - Ban user
- `GET /matches` - Match management
- `GET /anticheat/violations` - Violation review
- `GET /system/metrics` - System monitoring
- `GET /logs/admin` - Admin action logs

### WebSocket Events

#### Connection Management
- `connection:established` - Connection confirmed
- `ping`/`pong` - Latency measurement

#### Matchmaking
- `matchmaking:join_queue` - Join matchmaking queue
- `matchmaking:leave_queue` - Leave queue
- `matchmaking:match_found` - Match found
- `matchmaking:match_starting` - Match starting

#### Game State
- `game:state_update` - Player state update
- `game:input` - Game input
- `game:player_update` - Other player updates

#### Communication
- `chat:message` - In-game chat
- `voice:start`/`voice:data`/`voice:stop` - Voice chat

## 🔒 Security Features

### Authentication Security
- Password hashing with bcrypt (12 rounds)
- JWT tokens with expiration
- Session invalidation on logout
- Multi-device session tracking
- Rate limiting on auth endpoints

### Anti-Cheat Measures
- Server-authoritative validation
- Movement and shooting validation
- Impossible action detection
- Statistical analysis of player behavior
- Hardware ID tracking
- Trust factor system

### API Security
- Helmet.js security headers
- CORS configuration
- Rate limiting with Redis
- Input validation and sanitization
- SQL injection prevention
- XSS protection

## 📊 Monitoring & Metrics

### Performance Metrics
- Active connections count
- Average latency measurements
- Messages per second
- Database query performance
- Redis hit/miss ratios

### Anti-Cheat Metrics
- Violation detection rates
- False positive analysis
- Player trust factor distribution
- Automated action effectiveness

### System Health
- Server uptime and status
- Database connection health
- Redis availability
- Memory and CPU usage
- Error rates and logging

## 🚀 Deployment

### Docker Deployment
```bash
# Build and run with Docker Compose
docker-compose up -d
```

### Production Checklist
- [ ] Set strong JWT secret
- [ ] Configure production database
- [ ] Set up SSL/TLS certificates
- [ ] Configure firewall rules
- [ ] Set up monitoring and logging
- [ ] Configure backup systems
- [ ] Test fail-over procedures

## 🐛 Development

### Running Tests
```bash
# Run all tests
npm test

# Run specific test suite
npm run test:auth
npm run test:matchmaking
npm run test:anticheat
```

### Debug Mode
```bash
# Enable debug logging
DEBUG=cs2d:* npm run server:dev
```

### Database Management
```bash
# Run migrations
npm run db:migrate

# Seed test data
npm run db:seed

# Reset database
npm run db:reset
```

## 📝 API Documentation

Complete API documentation is available at `/api/docs` when the server is running in development mode.

### Example API Usage

#### User Registration
```javascript
const response = await fetch('/api/auth/register', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({
    username: 'player123',
    email: 'player@example.com',
    password: 'SecurePass123',
    displayName: 'Pro Player'
  })
});
```

#### Join Matchmaking Queue
```javascript
const response = await fetch('/api/matchmaking/queue', {
  method: 'POST',
  headers: { 
    'Content-Type': 'application/json',
    'Authorization': `Bearer ${token}`
  },
  body: JSON.stringify({
    gameMode: 'competitive',
    region: 'na-east'
  })
});
```

## 🤝 Contributing

1. Fork the repository
2. Create a feature branch
3. Make your changes
4. Add tests for new functionality
5. Submit a pull request

## 📄 License

MIT License - see LICENSE file for details.

## 🆘 Support

For issues and support:
1. Check the troubleshooting section
2. Review existing GitHub issues
3. Create a new issue with detailed information

---

**Status**: ✅ **Production Ready**
**Version**: 2.0.0 - Enhanced Multiplayer Backend
**Last Updated**: 2025-08-25