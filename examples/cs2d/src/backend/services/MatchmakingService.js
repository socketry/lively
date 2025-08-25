/**
 * Matchmaking Service for CS2D Enhanced Backend
 * Handles skill-based matchmaking, queue management, and party system
 */

const { v4: uuidv4 } = require('uuid');
const EventEmitter = require('events');

class MatchmakingService extends EventEmitter {
  constructor(redis, socketIO, dbManager) {
    super();
    this.redis = redis;
    this.io = socketIO;
    this.db = dbManager;
    
    // Queue configuration
    this.queueConfig = {
      maxWaitTime: 300000, // 5 minutes max wait
      tickRate: 2000, // Check every 2 seconds
      skillTolerance: 100, // Initial ELO difference tolerance
      maxSkillTolerance: 500, // Maximum ELO difference tolerance
      toleranceIncrease: 25, // How much tolerance increases per tick
      partySize: {
        classic: 5,
        deathmatch: 10,
        casual: 8,
        competitive: 5
      },
      regions: ['na-east', 'na-west', 'eu-west', 'eu-east', 'asia', 'oceania']
    };

    this.activeQueues = new Map(); // queueId -> queue data
    this.playerQueues = new Map(); // playerId -> queueId
    this.parties = new Map(); // partyId -> party data
    this.matchmakingTicker = null;

    this.setupEventHandlers();
  }

  setupEventHandlers() {
    // Socket.io events
    this.io.on('connection', (socket) => {
      socket.on('matchmaking:join_queue', (data) => this.handleJoinQueue(socket, data));
      socket.on('matchmaking:leave_queue', () => this.handleLeaveQueue(socket));
      socket.on('matchmaking:accept_match', (data) => this.handleAcceptMatch(socket, data));
      socket.on('matchmaking:decline_match', (data) => this.handleDeclineMatch(socket, data));
      
      // Party system
      socket.on('party:create', () => this.handleCreateParty(socket));
      socket.on('party:invite', (data) => this.handleInviteToParty(socket, data));
      socket.on('party:accept_invite', (data) => this.handleAcceptPartyInvite(socket, data));
      socket.on('party:leave', () => this.handleLeaveParty(socket));
      socket.on('party:kick', (data) => this.handleKickFromParty(socket, data));

      socket.on('disconnect', () => this.handleDisconnect(socket));
    });
  }

  startMatchmaking() {
    if (this.matchmakingTicker) {
      clearInterval(this.matchmakingTicker);
    }

    this.matchmakingTicker = setInterval(() => {
      this.processMatchmaking();
    }, this.queueConfig.tickRate);

    console.log('✅ Matchmaking service started');
  }

  stopMatchmaking() {
    if (this.matchmakingTicker) {
      clearInterval(this.matchmakingTicker);
      this.matchmakingTicker = null;
    }
  }

  // Queue Management
  async joinQueue(userId, preferences = {}) {
    const {
      gameMode = 'classic',
      region = 'na-east',
      skillLevel = 1000,
      partyId = null
    } = preferences;

    // Validate game mode and region
    if (!this.queueConfig.partySize[gameMode]) {
      throw new Error('Invalid game mode');
    }

    if (!this.queueConfig.regions.includes(region)) {
      throw new Error('Invalid region');
    }

    // Check if user is already in queue
    if (this.playerQueues.has(userId)) {
      throw new Error('Already in queue');
    }

    // Check if user is banned or has low trust factor
    const user = await this.db.getUserById(userId);
    if (user.is_banned) {
      throw new Error('Cannot queue while banned');
    }

    if (user.trust_factor < 0.5) {
      throw new Error('Trust factor too low for matchmaking');
    }

    // Create queue entry
    const queueId = uuidv4();
    const queueEntry = {
      id: queueId,
      userId: userId,
      username: user.username,
      displayName: user.display_name,
      gameMode: gameMode,
      region: region,
      skillLevel: skillLevel,
      trustFactor: user.trust_factor,
      partyId: partyId,
      joinedAt: Date.now(),
      searchStarted: Date.now(),
      currentTolerance: this.queueConfig.skillTolerance,
      estimatedWait: this.calculateEstimatedWait(gameMode, region, skillLevel)
    };

    // Store in memory and Redis
    this.activeQueues.set(queueId, queueEntry);
    this.playerQueues.set(userId, queueId);

    await this.redis.setex(
      `queue:${queueId}`,
      600, // 10 minutes expiry
      JSON.stringify(queueEntry)
    );

    await this.redis.sadd(`queue_region:${region}:${gameMode}`, queueId);

    // Update queue statistics
    await this.updateQueueStats(gameMode, region, 1);

    console.log(`Player ${username} joined ${gameMode} queue in ${region}`);

    // Emit to user
    this.emitToUser(userId, 'matchmaking:queue_joined', {
      queueId,
      estimatedWait: queueEntry.estimatedWait,
      position: await this.getQueuePosition(queueId)
    });

    return {
      queueId,
      estimatedWait: queueEntry.estimatedWait,
      message: 'Successfully joined matchmaking queue'
    };
  }

  async leaveQueue(userId) {
    const queueId = this.playerQueues.get(userId);
    if (!queueId) {
      return { message: 'Not in queue' };
    }

    const queueEntry = this.activeQueues.get(queueId);
    if (queueEntry) {
      // Remove from Redis sets
      await this.redis.srem(`queue_region:${queueEntry.region}:${queueEntry.gameMode}`, queueId);
      await this.redis.del(`queue:${queueId}`);
      
      // Update stats
      await this.updateQueueStats(queueEntry.gameMode, queueEntry.region, -1);
    }

    // Remove from memory
    this.activeQueues.delete(queueId);
    this.playerQueues.delete(userId);

    // Emit to user
    this.emitToUser(userId, 'matchmaking:queue_left', {});

    console.log(`Player ${userId} left matchmaking queue`);
    
    return { message: 'Left matchmaking queue' };
  }

  // Main matchmaking logic
  async processMatchmaking() {
    const gameMode = Object.keys(this.queueConfig.partySize);
    
    for (const mode of gameMode) {
      for (const region of this.queueConfig.regions) {
        await this.processRegionQueue(mode, region);
      }
    }

    // Clean up expired queues
    await this.cleanupExpiredQueues();
  }

  async processRegionQueue(gameMode, region) {
    const queueIds = await this.redis.smembers(`queue_region:${region}:${gameMode}`);
    if (queueIds.length < this.queueConfig.partySize[gameMode]) {
      return; // Not enough players
    }

    // Get queue entries and sort by skill level
    const queueEntries = [];
    for (const queueId of queueIds) {
      const entry = this.activeQueues.get(queueId);
      if (entry) {
        // Update tolerance based on wait time
        const waitTime = Date.now() - entry.searchStarted;
        entry.currentTolerance = Math.min(
          this.queueConfig.maxSkillTolerance,
          this.queueConfig.skillTolerance + 
          Math.floor(waitTime / (this.queueConfig.tickRate * 10)) * this.queueConfig.toleranceIncrease
        );
        queueEntries.push(entry);
      }
    }

    if (queueEntries.length < this.queueConfig.partySize[gameMode]) {
      return;
    }

    // Sort by skill level for better matching
    queueEntries.sort((a, b) => a.skillLevel - b.skillLevel);

    // Try to create matches
    const matches = this.findMatches(queueEntries, gameMode);
    
    for (const match of matches) {
      await this.createMatch(match, gameMode, region);
    }
  }

  findMatches(queueEntries, gameMode) {
    const matches = [];
    const used = new Set();
    const playersNeeded = this.queueConfig.partySize[gameMode];

    for (let i = 0; i < queueEntries.length; i++) {
      if (used.has(i)) continue;

      const anchor = queueEntries[i];
      const potentialMatch = [anchor];
      used.add(i);

      // Find players within skill tolerance
      for (let j = i + 1; j < queueEntries.length && potentialMatch.length < playersNeeded; j++) {
        if (used.has(j)) continue;

        const candidate = queueEntries[j];
        const skillDiff = Math.abs(anchor.skillLevel - candidate.skillLevel);
        
        if (skillDiff <= anchor.currentTolerance) {
          potentialMatch.push(candidate);
          used.add(j);
        }
      }

      // If we have enough players, create a match
      if (potentialMatch.length >= playersNeeded) {
        matches.push(potentialMatch.slice(0, playersNeeded));
      } else {
        // Return unused players to pool
        potentialMatch.forEach((player, idx) => {
          const originalIndex = queueEntries.indexOf(player);
          if (originalIndex !== -1) {
            used.delete(originalIndex);
          }
        });
      }
    }

    return matches;
  }

  async createMatch(players, gameMode, region) {
    const matchId = uuidv4();
    const serverId = await this.selectGameServer(region, gameMode);

    if (!serverId) {
      console.log('No available servers for match creation');
      return;
    }

    // Create match in database
    const match = await this.db.createMatch({
      mapName: this.selectMap(gameMode),
      gameMode: gameMode,
      serverId: serverId,
      maxPlayers: players.length
    });

    // Balance teams based on skill
    const teams = this.balanceTeams(players, gameMode);

    // Add players to match
    for (const team of teams) {
      for (const player of team.players) {
        await this.db.addPlayerToMatch(match.id, player.userId, team.name);
      }
    }

    // Remove players from queue
    for (const player of players) {
      await this.leaveQueue(player.userId);
    }

    // Create match acceptance phase
    const matchData = {
      matchId: match.id,
      gameMode: gameMode,
      region: region,
      serverId: serverId,
      map: match.map_name,
      players: players.map(p => ({
        userId: p.userId,
        username: p.username,
        skillLevel: p.skillLevel
      })),
      teams: teams,
      acceptanceDeadline: Date.now() + 30000, // 30 seconds to accept
      acceptedPlayers: new Set()
    };

    // Store match data
    await this.redis.setex(
      `match_acceptance:${matchId}`,
      60,
      JSON.stringify(matchData)
    );

    // Notify all players
    for (const player of players) {
      this.emitToUser(player.userId, 'matchmaking:match_found', {
        matchId: matchId,
        gameMode: gameMode,
        map: match.map_name,
        estimatedSkill: this.calculateAverageSkill(players),
        acceptanceDeadline: matchData.acceptanceDeadline,
        players: matchData.players
      });
    }

    console.log(`Match ${matchId} created for ${gameMode} in ${region} with ${players.length} players`);

    // Set timeout for match acceptance
    setTimeout(() => {
      this.processMatchAcceptance(matchId);
    }, 30000);

    return matchId;
  }

  balanceTeams(players, gameMode) {
    if (gameMode === 'deathmatch') {
      return [{ name: 'ALL', players: players }];
    }

    // Sort players by skill
    const sortedPlayers = [...players].sort((a, b) => b.skillLevel - a.skillLevel);
    
    const team1 = [];
    const team2 = [];
    let team1Skill = 0;
    let team2Skill = 0;

    // Alternate assignment to balance skill
    for (const player of sortedPlayers) {
      if (team1Skill <= team2Skill) {
        team1.push(player);
        team1Skill += player.skillLevel;
      } else {
        team2.push(player);
        team2Skill += player.skillLevel;
      }
    }

    return [
      { name: 'CT', players: team1 },
      { name: 'T', players: team2 }
    ];
  }

  async processMatchAcceptance(matchId) {
    const matchDataStr = await this.redis.get(`match_acceptance:${matchId}`);
    if (!matchDataStr) return;

    const matchData = JSON.parse(matchDataStr);
    const requiredAcceptances = matchData.players.length;

    if (matchData.acceptedPlayers.size >= requiredAcceptances) {
      // All players accepted, start match
      await this.startMatch(matchData);
    } else {
      // Some players didn't accept, cancel match
      await this.cancelMatch(matchData, 'Player(s) failed to accept');
    }

    // Clean up acceptance data
    await this.redis.del(`match_acceptance:${matchId}`);
  }

  async startMatch(matchData) {
    const { matchId, serverId, players } = matchData;

    // Update match status
    await this.db.query(
      'UPDATE matches SET status = $1 WHERE id = $2',
      ['starting', matchId]
    );

    // Notify game server to prepare match
    this.emit('match:start', {
      matchId,
      serverId,
      players,
      gameMode: matchData.gameMode,
      map: matchData.map
    });

    // Notify players with server details
    for (const player of players) {
      this.emitToUser(player.userId, 'matchmaking:match_starting', {
        matchId: matchId,
        serverId: serverId,
        connectInfo: await this.getServerConnectInfo(serverId)
      });
    }

    console.log(`Match ${matchId} starting on server ${serverId}`);
  }

  async cancelMatch(matchData, reason) {
    const { matchId, players } = matchData;

    // Update database
    await this.db.query(
      'UPDATE matches SET status = $1 WHERE id = $2',
      ['cancelled', matchId]
    );

    // Re-queue players who accepted
    for (const playerId of matchData.acceptedPlayers) {
      const player = players.find(p => p.userId === playerId);
      if (player) {
        // Add back to queue with priority
        setTimeout(() => {
          this.joinQueue(playerId, {
            gameMode: matchData.gameMode,
            region: matchData.region,
            skillLevel: player.skillLevel
          });
        }, 1000);
      }
    }

    // Notify all players
    for (const player of players) {
      this.emitToUser(player.userId, 'matchmaking:match_cancelled', {
        reason: reason,
        canRequeue: true
      });
    }

    console.log(`Match ${matchId} cancelled: ${reason}`);
  }

  // Party System
  async createParty(leaderId) {
    const partyId = uuidv4();
    const party = {
      id: partyId,
      leaderId: leaderId,
      members: [leaderId],
      invites: new Map(), // userId -> invite data
      createdAt: Date.now(),
      maxMembers: 5
    };

    this.parties.set(partyId, party);
    
    await this.redis.setex(
      `party:${partyId}`,
      3600, // 1 hour expiry
      JSON.stringify(party)
    );

    return partyId;
  }

  async inviteToParty(partyId, inviterId, inviteeId) {
    const party = this.parties.get(partyId);
    if (!party || party.leaderId !== inviterId) {
      throw new Error('Not party leader or party not found');
    }

    if (party.members.includes(inviteeId)) {
      throw new Error('Player already in party');
    }

    if (party.members.length >= party.maxMembers) {
      throw new Error('Party is full');
    }

    // Create invite
    const inviteId = uuidv4();
    const invite = {
      id: inviteId,
      partyId: partyId,
      inviterId: inviterId,
      inviteeId: inviteeId,
      createdAt: Date.now(),
      expiresAt: Date.now() + 60000 // 1 minute
    };

    party.invites.set(inviteeId, invite);

    // Store invite in Redis
    await this.redis.setex(
      `party_invite:${inviteId}`,
      60,
      JSON.stringify(invite)
    );

    // Notify invitee
    this.emitToUser(inviteeId, 'party:invite_received', {
      inviteId: inviteId,
      partyId: partyId,
      inviterName: (await this.db.getUserById(inviterId)).username,
      expiresAt: invite.expiresAt
    });

    return inviteId;
  }

  // Socket event handlers
  async handleJoinQueue(socket, data) {
    try {
      const result = await this.joinQueue(socket.userId, data);
      socket.emit('matchmaking:queue_joined', result);
    } catch (error) {
      socket.emit('matchmaking:error', { error: error.message });
    }
  }

  async handleLeaveQueue(socket) {
    try {
      const result = await this.leaveQueue(socket.userId);
      socket.emit('matchmaking:queue_left', result);
    } catch (error) {
      socket.emit('matchmaking:error', { error: error.message });
    }
  }

  async handleAcceptMatch(socket, data) {
    const { matchId } = data;
    
    try {
      const matchDataStr = await this.redis.get(`match_acceptance:${matchId}`);
      if (!matchDataStr) {
        socket.emit('matchmaking:error', { error: 'Match not found or expired' });
        return;
      }

      const matchData = JSON.parse(matchDataStr);
      matchData.acceptedPlayers.add(socket.userId);

      // Update stored data
      await this.redis.setex(
        `match_acceptance:${matchId}`,
        60,
        JSON.stringify(matchData)
      );

      socket.emit('matchmaking:match_accepted', { matchId });

      // Check if all players have accepted
      if (matchData.acceptedPlayers.size >= matchData.players.length) {
        await this.startMatch(matchData);
      }

    } catch (error) {
      socket.emit('matchmaking:error', { error: error.message });
    }
  }

  async handleDeclineMatch(socket, data) {
    const { matchId } = data;
    
    try {
      const matchDataStr = await this.redis.get(`match_acceptance:${matchId}`);
      if (matchDataStr) {
        const matchData = JSON.parse(matchDataStr);
        await this.cancelMatch(matchData, `${socket.user.username} declined the match`);
      }

      socket.emit('matchmaking:match_declined', { matchId });

    } catch (error) {
      socket.emit('matchmaking:error', { error: error.message });
    }
  }

  async handleDisconnect(socket) {
    // Leave queue if in one
    if (this.playerQueues.has(socket.userId)) {
      await this.leaveQueue(socket.userId);
    }
  }

  // Utility methods
  calculateEstimatedWait(gameMode, region, skillLevel) {
    // Simple heuristic based on current queue size and historical data
    // In production, this would use more sophisticated algorithms
    return Math.random() * 120000 + 30000; // 30s to 2.5min
  }

  async getQueuePosition(queueId) {
    const entry = this.activeQueues.get(queueId);
    if (!entry) return 0;

    // Count players who joined before this one
    let position = 1;
    for (const [_, otherEntry] of this.activeQueues) {
      if (otherEntry.region === entry.region && 
          otherEntry.gameMode === entry.gameMode && 
          otherEntry.joinedAt < entry.joinedAt) {
        position++;
      }
    }

    return position;
  }

  calculateAverageSkill(players) {
    return Math.round(players.reduce((sum, p) => sum + p.skillLevel, 0) / players.length);
  }

  async selectGameServer(region, gameMode) {
    const result = await this.db.query(`
      SELECT id FROM game_servers 
      WHERE region = $1 AND status = 'online' AND current_players = 0
      ORDER BY RANDOM()
      LIMIT 1
    `, [region]);

    return result.rows[0]?.id || null;
  }

  selectMap(gameMode) {
    const maps = {
      classic: ['de_dust2', 'de_inferno', 'de_mirage', 'de_cache'],
      competitive: ['de_dust2', 'de_inferno', 'de_mirage', 'de_cache', 'de_train'],
      casual: ['de_dust2', 'cs_office', 'de_inferno'],
      deathmatch: ['dm_dust2', 'dm_inferno', 'dm_mirage']
    };

    const mapPool = maps[gameMode] || maps.classic;
    return mapPool[Math.floor(Math.random() * mapPool.length)];
  }

  async getServerConnectInfo(serverId) {
    const result = await this.db.query(
      'SELECT ip_address, port FROM game_servers WHERE id = $1',
      [serverId]
    );

    if (result.rows.length === 0) return null;

    const server = result.rows[0];
    return {
      ip: server.ip_address,
      port: server.port,
      connectString: `${server.ip_address}:${server.port}`
    };
  }

  async updateQueueStats(gameMode, region, delta) {
    const key = `queue_stats:${region}:${gameMode}`;
    const current = await this.redis.get(key) || '0';
    const newCount = Math.max(0, parseInt(current) + delta);
    await this.redis.setex(key, 300, newCount.toString());
  }

  async cleanupExpiredQueues() {
    const now = Date.now();
    const expired = [];

    for (const [queueId, entry] of this.activeQueues) {
      if (now - entry.joinedAt > this.queueConfig.maxWaitTime) {
        expired.push({ queueId, userId: entry.userId });
      }
    }

    for (const { queueId, userId } of expired) {
      await this.leaveQueue(userId);
      this.emitToUser(userId, 'matchmaking:queue_timeout', {
        message: 'Queue timeout, please try again',
        canRequeue: true
      });
    }
  }

  emitToUser(userId, event, data) {
    // Find user's socket and emit
    const userSockets = this.io.sockets.sockets;
    for (const [_, socket] of userSockets) {
      if (socket.userId === userId) {
        socket.emit(event, data);
        break;
      }
    }
  }

  // Public API methods
  async getQueueStatus() {
    const stats = {};
    
    for (const region of this.queueConfig.regions) {
      stats[region] = {};
      for (const gameMode of Object.keys(this.queueConfig.partySize)) {
        const count = await this.redis.get(`queue_stats:${region}:${gameMode}`) || '0';
        stats[region][gameMode] = parseInt(count);
      }
    }

    return stats;
  }

  async getPlayerQueueInfo(userId) {
    const queueId = this.playerQueues.get(userId);
    if (!queueId) return null;

    const entry = this.activeQueues.get(queueId);
    if (!entry) return null;

    return {
      queueId: queueId,
      gameMode: entry.gameMode,
      region: entry.region,
      waitTime: Date.now() - entry.joinedAt,
      estimatedRemaining: Math.max(0, entry.estimatedWait - (Date.now() - entry.joinedAt)),
      position: await this.getQueuePosition(queueId),
      currentTolerance: entry.currentTolerance
    };
  }
}

module.exports = { MatchmakingService };