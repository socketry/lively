/**
 * Enhanced Socket Manager for CS2D Enhanced Backend
 * Handles reliable messaging, lag compensation, and real-time synchronization
 */

const { v4: uuidv4 } = require('uuid');

class SocketManager {
  constructor(socketIO, services) {
    this.io = socketIO;
    this.authService = services.authService;
    this.matchmakingService = services.matchmakingService;
    this.antiCheatService = services.antiCheatService;
    this.gameServerManager = services.gameServerManager;
    
    // Connection tracking
    this.connections = new Map(); // socketId -> connection data
    this.userSockets = new Map(); // userId -> Set of socketIds
    this.gameRooms = new Map(); // roomId -> room data
    
    // Message reliability
    this.pendingMessages = new Map(); // messageId -> message data
    this.messageSequence = new Map(); // userId -> sequence number
    
    // Lag compensation
    this.clientStates = new Map(); // userId -> client state history
    this.serverStates = new Map(); // roomId -> server state history
    
    // Performance tracking
    this.metrics = {
      connectionsPerSecond: 0,
      messagesPerSecond: 0,
      averageLatency: 0,
      activeConnections: 0
    };
    
    this.setupPerformanceTracking();
  }

  setupHandlers() {
    this.io.on('connection', (socket) => {
      this.handleConnection(socket);
    });
  }

  handleConnection(socket) {
    const userId = socket.userId;
    const user = socket.user;
    
    console.log(`User ${user.username} connected with socket ${socket.id}`);
    
    // Track connection
    const connectionData = {
      socketId: socket.id,
      userId: userId,
      username: user.username,
      connectedAt: Date.now(),
      lastActivity: Date.now(),
      latency: 0,
      packetLoss: 0,
      clientState: {
        position: { x: 0, y: 0 },
        velocity: { x: 0, y: 0 },
        health: 100,
        alive: true,
        tick: 0
      }
    };
    
    this.connections.set(socket.id, connectionData);
    
    // Track user sockets (user can have multiple connections)
    if (!this.userSockets.has(userId)) {
      this.userSockets.set(userId, new Set());
    }
    this.userSockets.get(userId).add(socket.id);
    
    // Initialize client state history for lag compensation
    this.initializeClientStateHistory(userId);
    
    // Initialize anti-cheat tracking
    this.antiCheatService.initializePlayer(userId, null, {
      hardwareId: user.hardware_id,
      userAgent: socket.handshake.headers['user-agent']
    });
    
    this.metrics.activeConnections++;
    
    // Setup socket event handlers
    this.setupSocketEvents(socket);
    
    // Send initial data
    socket.emit('connection:established', {
      serverId: process.env.SERVER_ID || 'cs2d-server-1',
      serverTime: Date.now(),
      tickRate: 64,
      features: {
        lagCompensation: true,
        reliableMessaging: true,
        antiCheat: true
      }
    });
  }

  setupSocketEvents(socket) {
    const userId = socket.userId;
    const connection = this.connections.get(socket.id);
    
    // Heartbeat and latency measurement
    socket.on('ping', (timestamp) => {
      const latency = Date.now() - timestamp;
      connection.latency = latency;
      socket.emit('pong', { timestamp, serverTime: Date.now() });
    });
    
    // Reliable messaging
    socket.on('message:reliable', (data) => {
      this.handleReliableMessage(socket, data);
    });
    
    socket.on('message:ack', (messageId) => {
      this.handleMessageAck(socket, messageId);
    });
    
    // Game state updates
    socket.on('game:state_update', (data) => {
      this.handleGameStateUpdate(socket, data);
    });
    
    socket.on('game:input', (data) => {
      this.handleGameInput(socket, data);
    });
    
    // Room management
    socket.on('room:join', (data) => {
      this.handleJoinRoom(socket, data);
    });
    
    socket.on('room:leave', () => {
      this.handleLeaveRoom(socket);
    });
    
    // Chat system
    socket.on('chat:message', (data) => {
      this.handleChatMessage(socket, data);
    });
    
    // Voice chat
    socket.on('voice:start', () => {
      this.handleVoiceStart(socket);
    });
    
    socket.on('voice:data', (data) => {
      this.handleVoiceData(socket, data);
    });
    
    socket.on('voice:stop', () => {
      this.handleVoiceStop(socket);
    });
    
    // Disconnect handling
    socket.on('disconnect', (reason) => {
      this.handleDisconnection(socket, reason);
    });
    
    // Update activity
    socket.onAny(() => {
      connection.lastActivity = Date.now();
    });
  }

  // Reliable messaging system
  handleReliableMessage(socket, data) {
    const { messageId, type, payload, sequenceNumber } = data;
    const userId = socket.userId;
    
    // Check sequence number for ordering
    const expectedSequence = this.messageSequence.get(userId) || 0;
    if (sequenceNumber < expectedSequence) {
      // Duplicate or old message, ignore
      return;
    }
    
    this.messageSequence.set(userId, sequenceNumber + 1);
    
    // Process message based on type
    switch (type) {
      case 'game:movement':
        this.processMovementMessage(socket, payload);
        break;
      case 'game:action':
        this.processActionMessage(socket, payload);
        break;
      case 'game:weapon_fire':
        this.processWeaponFireMessage(socket, payload);
        break;
      default:
        console.log(`Unknown reliable message type: ${type}`);
    }
    
    // Send acknowledgment
    socket.emit('message:ack', { messageId, processed: true });
  }

  handleMessageAck(socket, messageId) {
    // Remove from pending messages
    this.pendingMessages.delete(messageId);
  }

  sendReliableMessage(socketId, type, payload) {
    const socket = this.io.sockets.sockets.get(socketId);
    if (!socket) return;
    
    const messageId = uuidv4();
    const userId = socket.userId;
    const sequenceNumber = (this.messageSequence.get(userId) || 0) + 1;
    
    const message = {
      messageId,
      type,
      payload,
      sequenceNumber,
      timestamp: Date.now()
    };
    
    // Store for retry if no ack
    this.pendingMessages.set(messageId, {
      ...message,
      socketId,
      retries: 0,
      maxRetries: 3
    });
    
    socket.emit('message:reliable', message);
    
    // Set retry timeout
    setTimeout(() => {
      this.retryMessage(messageId);
    }, 1000);
    
    this.messageSequence.set(userId, sequenceNumber);
  }

  retryMessage(messageId) {
    const message = this.pendingMessages.get(messageId);
    if (!message) return;
    
    if (message.retries >= message.maxRetries) {
      console.log(`Message ${messageId} failed after ${message.retries} retries`);
      this.pendingMessages.delete(messageId);
      return;
    }
    
    const socket = this.io.sockets.sockets.get(message.socketId);
    if (!socket) {
      this.pendingMessages.delete(messageId);
      return;
    }
    
    message.retries++;
    socket.emit('message:reliable', message);
    
    // Set next retry
    setTimeout(() => {
      this.retryMessage(messageId);
    }, 1000 * message.retries);
  }

  // Game state synchronization with lag compensation
  handleGameStateUpdate(socket, data) {
    const userId = socket.userId;
    const { clientTick, position, velocity, viewAngle, timestamp } = data;
    
    // Validate with anti-cheat
    const movementValid = this.antiCheatService.validateMovement(userId, {
      position,
      velocity,
      timestamp
    });
    
    if (!movementValid.valid) {
      socket.emit('game:validation_failed', {
        type: 'movement',
        reason: movementValid.reason
      });
      return;
    }
    
    const aimValid = this.antiCheatService.validateAim(userId, {
      viewAngle,
      timestamp
    });
    
    if (!aimValid.valid) {
      socket.emit('game:validation_failed', {
        type: 'aim',
        reason: aimValid.reason
      });
      return;
    }
    
    // Update client state history for lag compensation
    this.updateClientStateHistory(userId, {
      tick: clientTick,
      timestamp,
      position,
      velocity,
      viewAngle,
      latency: this.connections.get(socket.id)?.latency || 0
    });
    
    // Broadcast to other players in the same room
    const connection = this.connections.get(socket.id);
    if (connection?.roomId) {
      socket.to(connection.roomId).emit('game:player_update', {
        playerId: userId,
        position,
        velocity,
        viewAngle,
        timestamp: Date.now() // Server timestamp
      });
    }
  }

  handleGameInput(socket, data) {
    const userId = socket.userId;
    const { input, timestamp, clientTick } = data;
    
    // Process input with lag compensation
    const compensatedTime = timestamp - (this.connections.get(socket.id)?.latency || 0);
    
    // Get historical state for validation
    const historicalState = this.getHistoricalClientState(userId, compensatedTime);
    
    if (input.type === 'weapon_fire') {
      const shotValid = this.antiCheatService.validateShot(userId, {
        weaponId: input.weapon,
        timestamp: compensatedTime,
        targetPosition: input.target,
        hit: input.hit,
        headshot: input.headshot,
        damage: input.damage
      });
      
      if (shotValid.valid) {
        this.processWeaponFire(socket, {
          ...input,
          timestamp: compensatedTime,
          historicalState
        });
      }
    }
  }

  // Lag compensation system
  initializeClientStateHistory(userId) {
    this.clientStates.set(userId, {
      states: [], // Array of historical states
      maxHistory: 1000, // Keep 1 second at 64 tick
      tickRate: 64
    });
  }

  updateClientStateHistory(userId, state) {
    const history = this.clientStates.get(userId);
    if (!history) return;
    
    history.states.push(state);
    
    // Keep only recent states
    const cutoffTime = Date.now() - 1000; // 1 second
    history.states = history.states.filter(s => s.timestamp > cutoffTime);
  }

  getHistoricalClientState(userId, targetTime) {
    const history = this.clientStates.get(userId);
    if (!history) return null;
    
    const states = history.states;
    if (states.length < 2) return states[0] || null;
    
    // Find the two states that bracket the target time
    let before = null;
    let after = null;
    
    for (let i = 0; i < states.length; i++) {
      const state = states[i];
      if (state.timestamp <= targetTime) {
        before = state;
      } else {
        after = state;
        break;
      }
    }
    
    if (!before) return after;
    if (!after) return before;
    
    // Interpolate between the two states
    const timeDiff = after.timestamp - before.timestamp;
    const targetDiff = targetTime - before.timestamp;
    const ratio = timeDiff > 0 ? targetDiff / timeDiff : 0;
    
    return {
      timestamp: targetTime,
      position: {
        x: before.position.x + (after.position.x - before.position.x) * ratio,
        y: before.position.y + (after.position.y - before.position.y) * ratio
      },
      velocity: {
        x: before.velocity.x + (after.velocity.x - before.velocity.x) * ratio,
        y: before.velocity.y + (after.velocity.y - before.velocity.y) * ratio
      },
      viewAngle: before.viewAngle + (after.viewAngle - before.viewAngle) * ratio
    };
  }

  // Room management
  handleJoinRoom(socket, data) {
    const { roomId, roomType = 'game' } = data;
    const userId = socket.userId;
    const connection = this.connections.get(socket.id);
    
    if (!connection) return;
    
    // Leave current room if any
    if (connection.roomId) {
      this.handleLeaveRoom(socket);
    }
    
    // Join new room
    socket.join(roomId);
    connection.roomId = roomId;
    
    // Track room
    if (!this.gameRooms.has(roomId)) {
      this.gameRooms.set(roomId, {
        id: roomId,
        type: roomType,
        players: new Map(),
        createdAt: Date.now(),
        gameState: null
      });
    }
    
    const room = this.gameRooms.get(roomId);
    room.players.set(userId, {
      userId,
      username: socket.user.username,
      socketId: socket.id,
      joinedAt: Date.now(),
      position: { x: 0, y: 0 },
      health: 100,
      alive: true
    });
    
    console.log(`User ${socket.user.username} joined room ${roomId}`);
    
    // Notify other players
    socket.to(roomId).emit('room:player_joined', {
      playerId: userId,
      username: socket.user.username,
      playerCount: room.players.size
    });
    
    // Send room info to joining player
    socket.emit('room:joined', {
      roomId,
      playerCount: room.players.size,
      players: Array.from(room.players.values()).map(p => ({
        userId: p.userId,
        username: p.username
      }))
    });
  }

  handleLeaveRoom(socket) {
    const connection = this.connections.get(socket.id);
    if (!connection?.roomId) return;
    
    const roomId = connection.roomId;
    const userId = socket.userId;
    
    socket.leave(roomId);
    connection.roomId = null;
    
    const room = this.gameRooms.get(roomId);
    if (room) {
      room.players.delete(userId);
      
      // Notify other players
      socket.to(roomId).emit('room:player_left', {
        playerId: userId,
        username: socket.user.username,
        playerCount: room.players.size
      });
      
      // Clean up empty rooms
      if (room.players.size === 0) {
        this.gameRooms.delete(roomId);
      }
    }
    
    console.log(`User ${socket.user.username} left room ${roomId}`);
  }

  // Chat system
  handleChatMessage(socket, data) {
    const { message, type = 'all' } = data;
    const userId = socket.userId;
    const connection = this.connections.get(socket.id);
    
    if (!connection?.roomId) return;
    
    // Rate limiting for chat
    const now = Date.now();
    if (!connection.lastChatTime) connection.lastChatTime = 0;
    if (now - connection.lastChatTime < 1000) { // 1 second cooldown
      socket.emit('chat:rate_limited');
      return;
    }
    connection.lastChatTime = now;
    
    // Validate message
    if (!message || message.length > 200) {
      socket.emit('chat:invalid_message');
      return;
    }
    
    const chatData = {
      playerId: userId,
      username: socket.user.username,
      message: message,
      type: type,
      timestamp: now
    };
    
    // Broadcast based on type
    if (type === 'team') {
      // Team chat - would need team info
      socket.to(connection.roomId).emit('chat:message', chatData);
    } else {
      // All chat
      socket.to(connection.roomId).emit('chat:message', chatData);
    }
    
    // Echo back to sender
    socket.emit('chat:message', chatData);
  }

  // Voice chat (simplified WebRTC signaling)
  handleVoiceStart(socket) {
    const connection = this.connections.get(socket.id);
    if (!connection?.roomId) return;
    
    socket.to(connection.roomId).emit('voice:player_speaking', {
      playerId: socket.userId
    });
  }

  handleVoiceData(socket, data) {
    const connection = this.connections.get(socket.id);
    if (!connection?.roomId) return;
    
    // Forward voice data to other players (simplified)
    socket.to(connection.roomId).emit('voice:data', {
      playerId: socket.userId,
      audioData: data
    });
  }

  handleVoiceStop(socket) {
    const connection = this.connections.get(socket.id);
    if (!connection?.roomId) return;
    
    socket.to(connection.roomId).emit('voice:player_stopped', {
      playerId: socket.userId
    });
  }

  // Disconnection handling
  handleDisconnection(socket, reason) {
    const userId = socket.userId;
    const connection = this.connections.get(socket.id);
    
    console.log(`User ${socket.user.username} disconnected: ${reason}`);
    
    // Leave room
    this.handleLeaveRoom(socket);
    
    // Remove from tracking
    this.connections.delete(socket.id);
    
    const userSockets = this.userSockets.get(userId);
    if (userSockets) {
      userSockets.delete(socket.id);
      if (userSockets.size === 0) {
        this.userSockets.delete(userId);
        // User completely disconnected
        this.antiCheatService.removePlayer(userId);
        this.clientStates.delete(userId);
      }
    }
    
    this.metrics.activeConnections--;
  }

  // Performance tracking
  setupPerformanceTracking() {
    setInterval(() => {
      this.updateMetrics();
    }, 5000); // Update every 5 seconds
  }

  updateMetrics() {
    const connections = Array.from(this.connections.values());
    
    this.metrics.activeConnections = connections.length;
    
    // Calculate average latency
    if (connections.length > 0) {
      const totalLatency = connections.reduce((sum, conn) => sum + conn.latency, 0);
      this.metrics.averageLatency = totalLatency / connections.length;
    }
    
    // Emit metrics to monitoring
    this.io.emit('server:metrics', this.metrics);
  }

  // Public methods for other services
  broadcastToRoom(roomId, event, data) {
    this.io.to(roomId).emit(event, data);
  }

  sendToUser(userId, event, data) {
    const userSockets = this.userSockets.get(userId);
    if (userSockets) {
      for (const socketId of userSockets) {
        const socket = this.io.sockets.sockets.get(socketId);
        if (socket) {
          socket.emit(event, data);
        }
      }
    }
  }

  getRoomInfo(roomId) {
    return this.gameRooms.get(roomId);
  }

  getConnectionStats() {
    return {
      totalConnections: this.connections.size,
      uniqueUsers: this.userSockets.size,
      activeRooms: this.gameRooms.size,
      metrics: this.metrics
    };
  }
}

module.exports = { SocketManager };