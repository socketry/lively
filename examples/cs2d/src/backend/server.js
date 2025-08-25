/**
 * CS2D Enhanced Multiplayer Backend Server
 * Comprehensive server architecture with authentication, matchmaking, and anti-cheat
 */

const express = require('express');
const http = require('http');
const { Server } = require('socket.io');
const cors = require('cors');
const helmet = require('helmet');
const compression = require('compression');
const rateLimit = require('express-rate-limit');
const { RateLimiterRedis } = require('rate-limiter-flexible');
const Redis = require('ioredis');
const jwt = require('jsonwebtoken');
require('dotenv').config();

// Import route factories
const createAuthRoutes = require('./routes/auth');
const createApiRoutes = require('./routes/api');
const createAdminRoutes = require('./routes/admin');
const { AuthService } = require('./services/AuthService');
const { MatchmakingService } = require('./services/MatchmakingService');
const { AntiCheatService } = require('./services/AntiCheatService');
const { GameServerManager } = require('./services/GameServerManager');
const { DatabaseManager } = require('./database/DatabaseManager');
const { SocketManager } = require('./socket/SocketManager');

class CS2DServer {
  constructor() {
    this.app = express();
    this.server = http.createServer(this.app);
    this.io = new Server(this.server, {
      cors: {
        origin: process.env.CLIENT_URL || "http://localhost:5174",
        methods: ["GET", "POST"],
        credentials: true
      },
      transports: ['websocket', 'polling'],
      pingTimeout: 60000,
      pingInterval: 25000
    });

    this.port = process.env.PORT || 3001;
    this.redis = new Redis({
      host: process.env.REDIS_HOST || 'localhost',
      port: process.env.REDIS_PORT || 6379,
      password: process.env.REDIS_PASSWORD,
      retryDelayOnFailover: 100,
      maxRetriesPerRequest: 3
    });

    // Initialize services
    this.dbManager = new DatabaseManager();
    this.authService = new AuthService(this.redis, this.dbManager);
    this.matchmakingService = new MatchmakingService(this.redis, this.io, this.dbManager);
    this.antiCheatService = new AntiCheatService(this.redis, this.dbManager);
    this.gameServerManager = new GameServerManager(this.io, this.antiCheatService);
    this.socketManager = new SocketManager(this.io, {
      authService: this.authService,
      matchmakingService: this.matchmakingService,
      antiCheatService: this.antiCheatService,
      gameServerManager: this.gameServerManager
    });

    this.setupMiddleware();
    this.setupRoutes();
    this.setupSocketHandlers();
    this.setupErrorHandlers();
  }

  setupMiddleware() {
    // Security middleware
    this.app.use(helmet({
      contentSecurityPolicy: false,
      crossOriginEmbedderPolicy: false
    }));
    
    this.app.use(cors({
      origin: process.env.CLIENT_URL || "http://localhost:5174",
      credentials: true,
      optionsSuccessStatus: 200
    }));

    this.app.use(compression());
    this.app.use(express.json({ limit: '10mb' }));
    this.app.use(express.urlencoded({ extended: true }));

    // Rate limiting
    const generalLimiter = rateLimit({
      windowMs: 15 * 60 * 1000, // 15 minutes
      max: 1000, // limit each IP to 1000 requests per windowMs
      message: 'Too many requests from this IP',
      standardHeaders: true,
      legacyHeaders: false
    });

    const authLimiter = rateLimit({
      windowMs: 15 * 60 * 1000,
      max: 20, // limit auth requests
      message: 'Too many authentication attempts'
    });

    this.app.use('/api/', generalLimiter);
    this.app.use('/api/auth/', authLimiter);

    // Advanced rate limiting with Redis
    const redisLimiter = new RateLimiterRedis({
      storeClient: this.redis,
      keyPrefix: 'rl',
      points: 100, // Number of requests
      duration: 60, // Per 60 seconds
      blockDuration: 60 * 10 // Block for 10 minutes if exceeded
    });

    this.app.use(async (req, res, next) => {
      try {
        await redisLimiter.consume(req.ip);
        next();
      } catch (rejRes) {
        res.status(429).json({
          error: 'Rate limit exceeded',
          retryAfter: Math.round(rejRes.msBeforeNext) || 1000
        });
      }
    });
  }

  setupRoutes() {
    // Health check
    this.app.get('/health', (req, res) => {
      res.json({
        status: 'healthy',
        timestamp: new Date().toISOString(),
        uptime: process.uptime(),
        memory: process.memoryUsage(),
        redis: this.redis.status,
        version: process.env.npm_package_version || '1.0.0'
      });
    });

    // API routes
    this.app.use('/api/auth', createAuthRoutes(this.authService, this.dbManager));
    this.app.use('/api', createApiRoutes(this.authService, this.dbManager, this.matchmakingService, this.antiCheatService, this.socketManager));
    this.app.use('/api/admin', createAdminRoutes(this.authService, this.dbManager, this.socketManager, this.antiCheatService, this.matchmakingService));

    // Game server status
    this.app.get('/api/servers', async (req, res) => {
      try {
        const servers = await this.gameServerManager.getServerList();
        res.json({ servers });
      } catch (error) {
        console.error('Server list error:', error);
        res.status(500).json({ error: 'Failed to fetch server list' });
      }
    });

    // Matchmaking endpoints
    this.app.post('/api/matchmaking/queue', async (req, res) => {
      try {
        const { userId, gameMode, region } = req.body;
        const result = await this.matchmakingService.joinQueue(userId, {
          gameMode,
          region,
          skillLevel: req.body.skillLevel || 1000
        });
        res.json(result);
      } catch (error) {
        console.error('Matchmaking queue error:', error);
        res.status(500).json({ error: 'Failed to join matchmaking queue' });
      }
    });

    this.app.delete('/api/matchmaking/queue/:userId', async (req, res) => {
      try {
        await this.matchmakingService.leaveQueue(req.params.userId);
        res.json({ success: true });
      } catch (error) {
        console.error('Leave queue error:', error);
        res.status(500).json({ error: 'Failed to leave queue' });
      }
    });

    // Fallback route
    this.app.use('*', (req, res) => {
      res.status(404).json({
        error: 'Endpoint not found',
        path: req.originalUrl,
        method: req.method
      });
    });
  }

  setupSocketHandlers() {
    this.io.use(async (socket, next) => {
      try {
        const token = socket.handshake.auth.token || socket.handshake.query.token;
        if (!token) {
          return next(new Error('No token provided'));
        }

        const decoded = jwt.verify(token, process.env.JWT_SECRET);
        const user = await this.authService.getUserById(decoded.userId);
        if (!user) {
          return next(new Error('User not found'));
        }

        socket.userId = user.id;
        socket.user = user;
        next();
      } catch (error) {
        next(new Error('Authentication failed'));
      }
    });

    this.socketManager.setupHandlers();
  }

  setupErrorHandlers() {
    // Graceful error handling
    this.app.use((err, req, res, next) => {
      console.error('Unhandled error:', err);
      res.status(500).json({
        error: 'Internal server error',
        message: process.env.NODE_ENV === 'development' ? err.message : 'Something went wrong'
      });
    });

    // Graceful shutdown
    process.on('SIGTERM', () => this.shutdown('SIGTERM'));
    process.on('SIGINT', () => this.shutdown('SIGINT'));
  }

  async start() {
    try {
      // Initialize database
      await this.dbManager.initialize();
      console.log('✅ Database initialized');

      // Test Redis connection
      await this.redis.ping();
      console.log('✅ Redis connected');

      // Start server
      this.server.listen(this.port, () => {
        console.log(`🚀 CS2D Enhanced Server running on port ${this.port}`);
        console.log(`📊 Environment: ${process.env.NODE_ENV || 'development'}`);
        console.log(`🌐 Client URL: ${process.env.CLIENT_URL || 'http://localhost:5174'}`);
      });

      // Start game server management
      await this.gameServerManager.initialize();
      console.log('✅ Game server manager initialized');

      // Start matchmaking service
      this.matchmakingService.startMatchmaking();
      console.log('✅ Matchmaking service started');

    } catch (error) {
      console.error('❌ Failed to start server:', error);
      process.exit(1);
    }
  }

  async shutdown(signal) {
    console.log(`📴 Received ${signal}, shutting down gracefully...`);
    
    try {
      // Close server
      this.server.close(() => {
        console.log('✅ HTTP server closed');
      });

      // Close socket connections
      this.io.close(() => {
        console.log('✅ WebSocket server closed');
      });

      // Close database connections
      await this.dbManager.close();
      console.log('✅ Database connections closed');

      // Close Redis connection
      this.redis.disconnect();
      console.log('✅ Redis connection closed');

      process.exit(0);
    } catch (error) {
      console.error('❌ Error during shutdown:', error);
      process.exit(1);
    }
  }
}

// Start server if this file is run directly
if (require.main === module) {
  const server = new CS2DServer();
  server.start();
}

module.exports = { CS2DServer };