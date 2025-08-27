/**
 * CS2D Simple Backend Server
 * Minimal server for development - works without database
 */

const express = require('express');
const http = require('http');
const { Server } = require('socket.io');
const cors = require('cors');
require('dotenv').config();

const app = express();
const server = http.createServer(app);
const io = new Server(server, {
  cors: {
    origin: process.env.CLIENT_URL || "http://localhost:5174",
    methods: ["GET", "POST"],
    credentials: true
  },
  transports: ['websocket', 'polling']
});

const PORT = process.env.PORT || 3001;

// Middleware
app.use(cors({
  origin: process.env.CLIENT_URL || "http://localhost:5174",
  credentials: true
}));
app.use(express.json());

// In-memory storage for development
const rooms = new Map();
const players = new Map();

// Health check endpoint
app.get('/api/status', (req, res) => {
  res.json({
    status: 'online',
    mode: 'development',
    timestamp: new Date().toISOString(),
    rooms: rooms.size,
    players: players.size
  });
});

// Basic API endpoints
app.get('/api/rooms', (req, res) => {
  const roomList = Array.from(rooms.values()).map(room => ({
    id: room.id,
    name: room.name,
    players: room.players.length,
    maxPlayers: room.maxPlayers,
    status: room.status,
    mode: room.mode,
    map: room.map
  }));
  res.json(roomList);
});

// WebSocket handling
io.on('connection', (socket) => {
  console.log('✅ Player connected:', socket.id);
  
  players.set(socket.id, {
    id: socket.id,
    name: `Player_${socket.id.slice(0, 6)}`,
    room: null
  });

  // Handle room creation
  socket.on('create_room', (data) => {
    const roomId = `room_${Date.now()}`;
    const room = {
      id: roomId,
      name: data.name || 'New Room',
      host: socket.id,
      players: [socket.id],
      maxPlayers: data.maxPlayers || 10,
      status: 'waiting',
      mode: data.mode || 'deathmatch',
      map: data.map || 'de_dust2'
    };
    
    rooms.set(roomId, room);
    socket.join(roomId);
    
    const player = players.get(socket.id);
    if (player) player.room = roomId;
    
    socket.emit('room_created', room);
    io.emit('rooms_updated', Array.from(rooms.values()));
    
    console.log(`📦 Room created: ${roomId} by ${socket.id}`);
  });

  // Handle room joining
  socket.on('join_room', (roomId) => {
    const room = rooms.get(roomId);
    if (room && room.players.length < room.maxPlayers) {
      room.players.push(socket.id);
      socket.join(roomId);
      
      const player = players.get(socket.id);
      if (player) player.room = roomId;
      
      io.to(roomId).emit('player_joined', {
        playerId: socket.id,
        playerName: player?.name,
        room: room
      });
      
      socket.emit('room_joined', room);
      io.emit('rooms_updated', Array.from(rooms.values()));
      
      console.log(`👤 Player ${socket.id} joined room ${roomId}`);
    }
  });

  // Handle game state updates
  socket.on('game_update', (data) => {
    const player = players.get(socket.id);
    if (player && player.room) {
      socket.to(player.room).emit('game_state', {
        playerId: socket.id,
        ...data
      });
    }
  });

  // Handle chat messages
  socket.on('chat_message', (data) => {
    const player = players.get(socket.id);
    if (player && player.room) {
      io.to(player.room).emit('chat_message', {
        playerId: socket.id,
        playerName: player.name,
        message: data.message,
        timestamp: Date.now()
      });
    }
  });

  // Handle disconnection
  socket.on('disconnect', () => {
    const player = players.get(socket.id);
    
    if (player && player.room) {
      const room = rooms.get(player.room);
      if (room) {
        room.players = room.players.filter(id => id !== socket.id);
        
        if (room.players.length === 0) {
          rooms.delete(player.room);
          console.log(`🗑️ Room ${player.room} deleted (empty)`);
        } else if (room.host === socket.id) {
          room.host = room.players[0];
          io.to(player.room).emit('host_changed', room.host);
        }
        
        io.to(player.room).emit('player_left', {
          playerId: socket.id,
          playerName: player.name
        });
        
        io.emit('rooms_updated', Array.from(rooms.values()));
      }
    }
    
    players.delete(socket.id);
    console.log('❌ Player disconnected:', socket.id);
  });
});

// Start server
server.listen(PORT, () => {
  console.log(`
🚀 CS2D Simple Backend Server Started
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
📡 Server: http://localhost:${PORT}
🔌 WebSocket: ws://localhost:${PORT}
📊 API: http://localhost:${PORT}/api
🎮 Mode: Development (No DB)
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
`);
});

// Graceful shutdown
process.on('SIGTERM', () => {
  console.log('SIGTERM received, shutting down gracefully...');
  server.close(() => {
    console.log('Server closed');
    process.exit(0);
  });
});