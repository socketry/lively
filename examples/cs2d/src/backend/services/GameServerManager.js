/**
 * Game Server Manager for CS2D Enhanced Backend
 * Manages dedicated game server instances and load balancing
 */

const { v4: uuidv4 } = require('uuid');
const EventEmitter = require('events');

class GameServerManager extends EventEmitter {
  constructor(socketIO, antiCheatService) {
    super();
    this.io = socketIO;
    this.antiCheatService = antiCheatService;
    
    // Server tracking
    this.servers = new Map(); // serverId -> server data
    this.activeMatches = new Map(); // matchId -> match data
    this.serverLoad = new Map(); // serverId -> load info
    
    // Configuration
    this.config = {
      heartbeatInterval: 30000, // 30 seconds
      serverTimeout: 90000, // 90 seconds
      maxPlayersPerServer: 32,
      regions: ['na-east', 'na-west', 'eu-west', 'eu-east', 'asia', 'oceania']
    };
    
    this.setupHeartbeatChecking();
  }

  async initialize() {
    // Load existing servers from database
    await this.loadServersFromDatabase();
    
    // Register virtual servers if none exist (for development)
    if (this.servers.size === 0) {
      await this.createVirtualServers();
    }
    
    console.log(`✅ Game server manager initialized with ${this.servers.size} servers`);
  }

  async loadServersFromDatabase() {
    try {
      const { DatabaseManager } = require('../database/DatabaseManager');
      const dbManager = new DatabaseManager();
      await dbManager.initialize();
      
      const result = await dbManager.query(`
        SELECT * FROM game_servers
        WHERE status != 'offline'
        ORDER BY region, name
      `);
      
      for (const serverData of result.rows) {
        this.servers.set(serverData.id, {
          id: serverData.id,
          name: serverData.name,
          region: serverData.region,
          ipAddress: serverData.ip_address,
          port: serverData.port,
          maxPlayers: serverData.max_players,
          currentPlayers: serverData.current_players || 0,
          status: 'online',
          lastHeartbeat: Date.now(),
          matches: new Set(),
          capabilities: {
            antiCheat: true,
            voiceChat: true,
            demos: true,
            customMaps: true
          }
        });
      }
      
      await dbManager.close();
      
    } catch (error) {
      console.error('Failed to load servers from database:', error);
    }
  }

  async createVirtualServers() {
    // Create virtual servers for development/testing
    const virtualServers = [
      { region: 'na-east', name: 'CS2D East 1', ip: '127.0.0.1', port: 27015 },
      { region: 'na-east', name: 'CS2D East 2', ip: '127.0.0.1', port: 27016 },
      { region: 'na-west', name: 'CS2D West 1', ip: '127.0.0.1', port: 27017 },
      { region: 'eu-west', name: 'CS2D EU 1', ip: '127.0.0.1', port: 27018 },
    ];
    
    for (const serverConfig of virtualServers) {
      const serverId = `virtual-${serverConfig.region}-${Date.now()}-${Math.random().toString(36).substring(2, 8)}`;
      
      const server = {
        id: serverId,
        name: serverConfig.name,
        region: serverConfig.region,
        ipAddress: serverConfig.ip,
        port: serverConfig.port,
        maxPlayers: 20,
        currentPlayers: 0,
        status: 'online',
        lastHeartbeat: Date.now(),
        matches: new Set(),
        virtual: true,
        capabilities: {
          antiCheat: true,
          voiceChat: true,
          demos: false,
          customMaps: false
        }
      };
      
      this.servers.set(serverId, server);
      this.serverLoad.set(serverId, {
        cpu: Math.random() * 30, // 0-30% CPU usage
        memory: Math.random() * 50, // 0-50% memory usage
        network: Math.random() * 20 // 0-20 Mbps
      });
    }
    
    console.log('✅ Created virtual servers for development');
  }

  setupHeartbeatChecking() {
    setInterval(() => {
      this.checkServerHeartbeats();
    }, this.config.heartbeatInterval);
  }

  checkServerHeartbeats() {
    const now = Date.now();
    
    for (const [serverId, server] of this.servers) {
      const timeSinceHeartbeat = now - server.lastHeartbeat;
      
      if (timeSinceHeartbeat > this.config.serverTimeout) {
        console.log(`Server ${server.name} (${serverId}) timed out`);
        server.status = 'offline';
        
        // Handle matches on offline server
        this.handleServerOffline(serverId);
      }
    }
  }

  handleServerOffline(serverId) {
    const server = this.servers.get(serverId);
    if (!server) return;
    
    // Find alternative servers for active matches
    for (const matchId of server.matches) {
      const match = this.activeMatches.get(matchId);
      if (match && match.status === 'live') {
        this.migrateMatch(matchId, serverId);
      }
    }
    
    server.matches.clear();
    server.currentPlayers = 0;
  }

  async migrateMatch(matchId, failedServerId) {
    const match = this.activeMatches.get(matchId);
    if (!match) return;
    
    console.log(`Migrating match ${matchId} from failed server ${failedServerId}`);
    
    // Find alternative server
    const alternativeServer = this.selectBestServer(match.gameMode, match.region);
    if (!alternativeServer) {
      // No alternative server available, end match
      this.endMatchDueToServerFailure(matchId);
      return;
    }
    
    // Update match server
    match.serverId = alternativeServer.id;
    alternativeServer.matches.add(matchId);
    
    // Notify players
    for (const playerId of match.players) {
      this.io.to(`user_${playerId}`).emit('match:server_migrated', {
        matchId,
        newServer: {
          id: alternativeServer.id,
          name: alternativeServer.name,
          ip: alternativeServer.ipAddress,
          port: alternativeServer.port
        }
      });
    }
  }

  selectBestServer(gameMode, region, requireEmpty = false) {
    const candidateServers = Array.from(this.servers.values())
      .filter(server => 
        server.status === 'online' &&
        server.region === region &&
        (!requireEmpty || server.currentPlayers === 0)
      );
    
    if (candidateServers.length === 0) {
      // Try other regions
      const otherRegionServers = Array.from(this.servers.values())
        .filter(server => 
          server.status === 'online' &&
          (!requireEmpty || server.currentPlayers === 0)
        );
      
      if (otherRegionServers.length === 0) {
        return null;
      }
      
      candidateServers.push(...otherRegionServers);
    }
    
    // Score servers based on load and capacity
    const scoredServers = candidateServers.map(server => {
      const load = this.serverLoad.get(server.id) || { cpu: 0, memory: 0, network: 0 };
      const playerRatio = server.currentPlayers / server.maxPlayers;
      
      // Lower score is better
      const score = (
        load.cpu * 0.3 +
        load.memory * 0.2 +
        load.network * 0.1 +
        playerRatio * 40 +
        (server.region !== region ? 20 : 0) // Penalty for wrong region
      );
      
      return { server, score };
    });
    
    // Sort by score (lowest first)
    scoredServers.sort((a, b) => a.score - b.score);
    
    return scoredServers[0]?.server || null;
  }

  async createMatch(matchData) {
    const { matchId, gameMode, region, players, map } = matchData;
    
    // Select best server
    const server = this.selectBestServer(gameMode, region, true);
    if (!server) {
      throw new Error(`No available servers in region ${region}`);
    }
    
    // Create match
    const match = {
      id: matchId,
      serverId: server.id,
      gameMode: gameMode,
      region: region,
      map: map,
      players: players.map(p => p.userId),
      status: 'starting',
      startTime: Date.now(),
      config: {
        maxRounds: gameMode === 'competitive' ? 30 : 16,
        roundTime: 115, // seconds
        freezeTime: 15,
        buyTime: 20
      }
    };
    
    this.activeMatches.set(matchId, match);
    server.matches.add(matchId);
    server.currentPlayers += players.length;
    
    // Initialize anti-cheat for all players
    for (const player of players) {
      this.antiCheatService.initializePlayer(player.userId, matchId, {
        serverId: server.id,
        gameMode: gameMode
      });
    }
    
    console.log(`Match ${matchId} created on server ${server.name} (${server.id})`);
    
    // Notify server (if real server)
    if (!server.virtual) {
      this.notifyServerOfMatch(server.id, match);
    }
    
    return {
      matchId,
      serverId: server.id,
      serverInfo: {
        name: server.name,
        ip: server.ipAddress,
        port: server.port
      }
    };
  }

  async notifyServerOfMatch(serverId, match) {
    // In a real implementation, this would send a message to the dedicated server
    // For now, we'll just emit an event
    this.emit('server:start_match', {
      serverId,
      matchId: match.id,
      config: match.config,
      players: match.players
    });
  }

  endMatch(matchId, result) {
    const match = this.activeMatches.get(matchId);
    if (!match) return;
    
    const server = this.servers.get(match.serverId);
    if (server) {
      server.matches.delete(matchId);
      server.currentPlayers -= match.players.length;
    }
    
    // Clean up anti-cheat tracking
    for (const playerId of match.players) {
      this.antiCheatService.removePlayer(playerId);
    }
    
    match.status = 'finished';
    match.endTime = Date.now();
    match.result = result;
    
    console.log(`Match ${matchId} ended on server ${server?.name || match.serverId}`);
    
    // Remove from active matches after a delay
    setTimeout(() => {
      this.activeMatches.delete(matchId);
    }, 60000); // Keep for 1 minute for cleanup
  }

  endMatchDueToServerFailure(matchId) {
    const match = this.activeMatches.get(matchId);
    if (!match) return;
    
    console.log(`Ending match ${matchId} due to server failure`);
    
    // Notify players
    for (const playerId of match.players) {
      this.io.to(`user_${playerId}`).emit('match:ended_server_failure', {
        matchId,
        reason: 'Server unavailable'
      });
    }
    
    this.endMatch(matchId, {
      reason: 'server_failure',
      winner: null,
      draw: true
    });
  }

  // Server management methods
  registerServer(serverData) {
    const {
      id,
      name,
      region,
      ipAddress,
      port,
      maxPlayers = 20,
      capabilities = {}
    } = serverData;
    
    const server = {
      id,
      name,
      region,
      ipAddress,
      port,
      maxPlayers,
      currentPlayers: 0,
      status: 'online',
      lastHeartbeat: Date.now(),
      matches: new Set(),
      capabilities: {
        antiCheat: true,
        voiceChat: true,
        demos: false,
        customMaps: false,
        ...capabilities
      }
    };
    
    this.servers.set(id, server);
    this.serverLoad.set(id, {
      cpu: 0,
      memory: 0,
      network: 0
    });
    
    console.log(`Server registered: ${name} (${id}) in ${region}`);
    
    return server;
  }

  updateServerHeartbeat(serverId, loadData = {}) {
    const server = this.servers.get(serverId);
    if (!server) return false;
    
    server.lastHeartbeat = Date.now();
    server.status = 'online';
    
    if (loadData) {
      this.serverLoad.set(serverId, {
        cpu: loadData.cpu || 0,
        memory: loadData.memory || 0,
        network: loadData.network || 0,
        timestamp: Date.now()
      });
    }
    
    return true;
  }

  unregisterServer(serverId) {
    const server = this.servers.get(serverId);
    if (!server) return false;
    
    // Handle active matches
    this.handleServerOffline(serverId);
    
    this.servers.delete(serverId);
    this.serverLoad.delete(serverId);
    
    console.log(`Server unregistered: ${server.name} (${serverId})`);
    
    return true;
  }

  // Public API methods
  getServerList() {
    return Array.from(this.servers.values()).map(server => ({
      id: server.id,
      name: server.name,
      region: server.region,
      currentPlayers: server.currentPlayers,
      maxPlayers: server.maxPlayers,
      status: server.status,
      matches: server.matches.size,
      load: this.serverLoad.get(server.id) || { cpu: 0, memory: 0, network: 0 }
    }));
  }

  getServerById(serverId) {
    const server = this.servers.get(serverId);
    if (!server) return null;
    
    return {
      ...server,
      matches: Array.from(server.matches),
      load: this.serverLoad.get(serverId) || { cpu: 0, memory: 0, network: 0 }
    };
  }

  getActiveMatches() {
    return Array.from(this.activeMatches.values());
  }

  getMatchById(matchId) {
    return this.activeMatches.get(matchId) || null;
  }

  getServerStats() {
    const servers = Array.from(this.servers.values());
    
    return {
      totalServers: servers.length,
      onlineServers: servers.filter(s => s.status === 'online').length,
      totalCapacity: servers.reduce((sum, s) => sum + s.maxPlayers, 0),
      totalPlayers: servers.reduce((sum, s) => sum + s.currentPlayers, 0),
      activeMatches: this.activeMatches.size,
      regionDistribution: this.getRegionDistribution()
    };
  }

  getRegionDistribution() {
    const distribution = {};
    
    for (const region of this.config.regions) {
      const regionServers = Array.from(this.servers.values())
        .filter(s => s.region === region);
      
      distribution[region] = {
        servers: regionServers.length,
        onlineServers: regionServers.filter(s => s.status === 'online').length,
        players: regionServers.reduce((sum, s) => sum + s.currentPlayers, 0),
        capacity: regionServers.reduce((sum, s) => sum + s.maxPlayers, 0)
      };
    }
    
    return distribution;
  }
}

module.exports = { GameServerManager };