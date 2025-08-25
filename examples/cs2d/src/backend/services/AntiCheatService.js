/**
 * Anti-Cheat Service for CS2D Enhanced Backend
 * Server-authoritative validation, abnormal behavior detection, and cheat prevention
 */

const { v4: uuidv4 } = require('uuid');
const EventEmitter = require('events');

class AntiCheatService extends EventEmitter {
  constructor(redis, dbManager) {
    super();
    this.redis = redis;
    this.db = dbManager;
    
    // Anti-cheat configuration
    this.config = {
      // Movement validation
      maxSpeed: 320, // units per second
      maxAcceleration: 1000,
      teleportThreshold: 100, // units
      
      // Shooting validation
      maxFireRate: {
        'ak47': 600, // RPM
        'm4a1': 666,
        'awp': 41,
        'deagle': 267,
        'glock': 400,
        'usp': 400
      },
      minReactionTime: 100, // ms
      
      // Aim validation
      maxMouseSensitivity: 50,
      suspiciousAimSnapAngle: 90, // degrees
      maxAimSpeed: 1800, // degrees per second
      
      // General thresholds
      maxPing: 200, // ms
      minTickRate: 30, // minimum client tick rate
      
      // Detection thresholds
      confidenceThresholds: {
        flag: 0.6,
        kick: 0.8,
        tempBan: 0.9,
        permBan: 0.95
      },
      
      // Tracking windows
      trackingWindow: 30000, // 30 seconds
      violationDecay: 300000, // 5 minutes
      
      // Rate limits for actions
      actionCooldowns: {
        move: 16, // ~60 FPS
        shoot: 50, // weapon dependent
        reload: 1000,
        switch: 500
      }
    };

    // Player tracking data
    this.playerStates = new Map(); // playerId -> state
    this.playerViolations = new Map(); // playerId -> violations
    this.gameStates = new Map(); // matchId -> game state
    
    this.setupCleanupInterval();
  }

  setupCleanupInterval() {
    // Clean up old data every 5 minutes
    setInterval(() => {
      this.cleanupOldData();
    }, 300000);
  }

  // Player state tracking
  initializePlayer(playerId, matchId, playerData = {}) {
    const now = Date.now();
    
    const state = {
      playerId: playerId,
      matchId: matchId,
      
      // Position and movement
      position: { x: 0, y: 0 },
      velocity: { x: 0, y: 0 },
      lastPosition: { x: 0, y: 0 },
      lastMoveTime: now,
      movementHistory: [],
      
      // Shooting and weapons
      currentWeapon: null,
      lastShotTime: 0,
      shotCount: 0,
      shotHistory: [],
      reloadStartTime: 0,
      
      // Aim tracking
      viewAngle: 0,
      lastViewAngle: 0,
      lastAimTime: now,
      aimHistory: [],
      
      // Network
      lastPacketTime: now,
      packetCount: 0,
      pingHistory: [],
      tickRate: 60,
      
      // Health and game state
      health: 100,
      alive: true,
      team: playerData.team || 'T',
      
      // Statistics
      stats: {
        kills: 0,
        deaths: 0,
        headshots: 0,
        accuracy: 0,
        suspicious: 0
      },
      
      // Trust and violations
      trustScore: 1.0,
      violationScore: 0.0,
      lastViolationTime: 0,
      
      // Hardware info
      hardwareId: playerData.hardwareId,
      userAgent: playerData.userAgent,
      
      // Session info
      joinTime: now,
      lastActivity: now
    };

    this.playerStates.set(playerId, state);
    this.playerViolations.set(playerId, []);

    console.log(`Anti-cheat initialized for player ${playerId} in match ${matchId}`);
  }

  removePlayer(playerId) {
    this.playerStates.delete(playerId);
    this.playerViolations.delete(playerId);
  }

  // Movement validation
  validateMovement(playerId, movementData) {
    const state = this.playerStates.get(playerId);
    if (!state) return { valid: false, reason: 'Player not tracked' };

    const { position, timestamp, velocity } = movementData;
    const now = Date.now();
    const deltaTime = (timestamp - state.lastMoveTime) / 1000; // seconds

    if (deltaTime <= 0 || deltaTime > 1) {
      return this.flagViolation(playerId, 'invalid_movement_timing', 0.3, {
        deltaTime,
        timestamp,
        lastMoveTime: state.lastMoveTime
      });
    }

    // Check for teleportation
    const distance = this.calculateDistance(position, state.lastPosition);
    const maxDistance = this.config.maxSpeed * deltaTime;

    if (distance > maxDistance + this.config.teleportThreshold) {
      return this.flagViolation(playerId, 'teleportation', 0.8, {
        distance,
        maxDistance,
        deltaTime,
        position,
        lastPosition: state.lastPosition
      });
    }

    // Check velocity limits
    const speed = Math.sqrt(velocity.x * velocity.x + velocity.y * velocity.y);
    if (speed > this.config.maxSpeed * 1.2) {
      return this.flagViolation(playerId, 'speed_hack', 0.7, {
        speed,
        maxSpeed: this.config.maxSpeed,
        velocity
      });
    }

    // Check acceleration
    const acceleration = this.calculateAcceleration(velocity, state.velocity, deltaTime);
    if (acceleration > this.config.maxAcceleration) {
      return this.flagViolation(playerId, 'acceleration_hack', 0.6, {
        acceleration,
        maxAcceleration: this.config.maxAcceleration
      });
    }

    // Update state
    state.lastPosition = state.position;
    state.position = position;
    state.velocity = velocity;
    state.lastMoveTime = timestamp;
    state.lastActivity = now;

    // Store movement history
    state.movementHistory.push({
      position,
      velocity,
      timestamp,
      distance,
      speed
    });

    // Keep only recent history
    const historyLimit = now - this.config.trackingWindow;
    state.movementHistory = state.movementHistory.filter(h => h.timestamp > historyLimit);

    return { valid: true };
  }

  // Shooting validation
  validateShot(playerId, shotData) {
    const state = this.playerStates.get(playerId);
    if (!state) return { valid: false, reason: 'Player not tracked' };

    const { weaponId, timestamp, targetPosition, hit, headshot, damage } = shotData;
    const now = Date.now();

    // Check fire rate
    const timeSinceLast = timestamp - state.lastShotTime;
    const weaponFireRate = this.config.maxFireRate[weaponId] || 600;
    const minInterval = 60000 / weaponFireRate; // ms between shots

    if (timeSinceLast < minInterval * 0.8) {
      return this.flagViolation(playerId, 'rapid_fire', 0.8, {
        timeSinceLast,
        minInterval,
        weaponId,
        fireRate: weaponFireRate
      });
    }

    // Check if player is alive
    if (!state.alive) {
      return this.flagViolation(playerId, 'shooting_while_dead', 0.9, {
        timestamp,
        health: state.health
      });
    }

    // Validate target position against player position
    if (targetPosition) {
      const distance = this.calculateDistance(state.position, targetPosition);
      const maxRange = this.getWeaponRange(weaponId);
      
      if (distance > maxRange) {
        return this.flagViolation(playerId, 'impossible_shot_distance', 0.7, {
          distance,
          maxRange,
          weaponId
        });
      }
    }

    // Check for impossible accuracy/headshot patterns
    if (hit && headshot) {
      state.stats.headshots++;
      const recentShots = state.shotHistory.filter(s => s.timestamp > now - 10000);
      const recentHeadshots = recentShots.filter(s => s.headshot).length;
      
      if (recentHeadshots > 8 && recentShots.length > 10) {
        const headshotRate = recentHeadshots / recentShots.length;
        if (headshotRate > 0.8) {
          return this.flagViolation(playerId, 'impossible_headshot_rate', 0.85, {
            headshotRate,
            recentHeadshots,
            recentShots: recentShots.length
          });
        }
      }
    }

    // Update state
    state.lastShotTime = timestamp;
    state.shotCount++;
    state.currentWeapon = weaponId;
    state.lastActivity = now;

    if (hit) {
      state.stats.kills += damage >= 100 ? 1 : 0;
    }

    // Store shot history
    state.shotHistory.push({
      weaponId,
      timestamp,
      targetPosition,
      hit,
      headshot,
      damage,
      playerPosition: { ...state.position },
      viewAngle: state.viewAngle
    });

    // Keep only recent history
    const historyLimit = now - this.config.trackingWindow;
    state.shotHistory = state.shotHistory.filter(h => h.timestamp > historyLimit);

    return { valid: true };
  }

  // Aim validation
  validateAim(playerId, aimData) {
    const state = this.playerStates.get(playerId);
    if (!state) return { valid: false, reason: 'Player not tracked' };

    const { viewAngle, timestamp, mouseDelta } = aimData;
    const now = Date.now();
    const deltaTime = (timestamp - state.lastAimTime) / 1000;

    if (deltaTime <= 0) {
      return { valid: true }; // Skip if no time passed
    }

    // Check for impossible aim speed
    const angleDelta = Math.abs(viewAngle - state.lastViewAngle);
    const aimSpeed = angleDelta / deltaTime; // degrees per second

    if (aimSpeed > this.config.maxAimSpeed) {
      return this.flagViolation(playerId, 'impossible_aim_speed', 0.6, {
        aimSpeed,
        maxAimSpeed: this.config.maxAimSpeed,
        angleDelta,
        deltaTime
      });
    }

    // Check for suspicious aim snaps
    if (angleDelta > this.config.suspiciousAimSnapAngle && deltaTime < 0.1) {
      return this.flagViolation(playerId, 'aim_snap', 0.7, {
        angleDelta,
        deltaTime,
        threshold: this.config.suspiciousAimSnapAngle
      });
    }

    // Check mouse movement consistency
    if (mouseDelta) {
      const expectedAngle = this.calculateExpectedAim(mouseDelta, state.mouseSensitivity);
      const angleDifference = Math.abs(expectedAngle - angleDelta);
      
      if (angleDifference > 45) { // 45 degrees tolerance
        return this.flagViolation(playerId, 'inconsistent_mouse_movement', 0.5, {
          expectedAngle,
          actualAngle: angleDelta,
          difference: angleDifference
        });
      }
    }

    // Update state
    state.lastViewAngle = state.viewAngle;
    state.viewAngle = viewAngle;
    state.lastAimTime = timestamp;
    state.lastActivity = now;

    // Store aim history
    state.aimHistory.push({
      viewAngle,
      timestamp,
      aimSpeed,
      angleDelta
    });

    // Keep only recent history
    const historyLimit = now - this.config.trackingWindow;
    state.aimHistory = state.aimHistory.filter(h => h.timestamp > historyLimit);

    return { valid: true };
  }

  // Network validation
  validateNetworkData(playerId, networkData) {
    const state = this.playerStates.get(playerId);
    if (!state) return { valid: false, reason: 'Player not tracked' };

    const { ping, tickRate, timestamp, packetLoss } = networkData;
    const now = Date.now();

    // Check ping limits
    if (ping > this.config.maxPing) {
      return this.flagViolation(playerId, 'high_ping', 0.3, {
        ping,
        maxPing: this.config.maxPing
      });
    }

    // Check tick rate
    if (tickRate < this.config.minTickRate) {
      return this.flagViolation(playerId, 'low_tickrate', 0.4, {
        tickRate,
        minTickRate: this.config.minTickRate
      });
    }

    // Check for packet manipulation
    const timeSinceLastPacket = timestamp - state.lastPacketTime;
    if (timeSinceLastPacket < 10) { // Too frequent packets
      return this.flagViolation(playerId, 'packet_flooding', 0.6, {
        timeSinceLastPacket,
        packetCount: state.packetCount
      });
    }

    // Update state
    state.lastPacketTime = timestamp;
    state.packetCount++;
    state.tickRate = tickRate;
    state.lastActivity = now;

    // Store ping history
    state.pingHistory.push({
      ping,
      timestamp,
      tickRate,
      packetLoss
    });

    // Keep only recent history
    const historyLimit = now - this.config.trackingWindow;
    state.pingHistory = state.pingHistory.filter(h => h.timestamp > historyLimit);

    return { valid: true };
  }

  // Violation handling
  flagViolation(playerId, violationType, confidence, details = {}) {
    const state = this.playerStates.get(playerId);
    const violations = this.playerViolations.get(playerId);
    
    if (!state || !violations) {
      return { valid: false, reason: 'Player not tracked' };
    }

    const now = Date.now();
    const violation = {
      id: uuidv4(),
      type: violationType,
      confidence: confidence,
      details: details,
      timestamp: now,
      playerId: playerId,
      matchId: state.matchId
    };

    violations.push(violation);

    // Update player violation score
    state.violationScore = Math.min(1.0, state.violationScore + confidence * 0.1);
    state.lastViolationTime = now;

    // Reduce trust score
    state.trustScore = Math.max(0.0, state.trustScore - confidence * 0.05);

    console.log(`Violation flagged: ${playerId} - ${violationType} (confidence: ${confidence})`);

    // Store in database
    this.recordViolation(violation);

    // Take action based on confidence
    const action = this.determineAction(playerId, confidence);
    if (action !== 'none') {
      this.takeAction(playerId, action, violation);
    }

    return {
      valid: false,
      reason: violationType,
      confidence: confidence,
      action: action
    };
  }

  determineAction(playerId, confidence) {
    const state = this.playerStates.get(playerId);
    const violations = this.playerViolations.get(playerId);
    
    if (!state || !violations) return 'none';

    // Check recent violation history
    const recentViolations = violations.filter(v => 
      Date.now() - v.timestamp < this.config.trackingWindow
    );

    const avgConfidence = recentViolations.reduce((sum, v) => sum + v.confidence, 0) / recentViolations.length;
    const violationCount = recentViolations.length;

    // Determine action based on thresholds
    if (confidence >= this.config.confidenceThresholds.permBan || 
        (avgConfidence >= 0.8 && violationCount >= 5)) {
      return 'permanent_ban';
    } else if (confidence >= this.config.confidenceThresholds.tempBan ||
               (avgConfidence >= 0.7 && violationCount >= 3)) {
      return 'temporary_ban';
    } else if (confidence >= this.config.confidenceThresholds.kick ||
               (avgConfidence >= 0.6 && violationCount >= 2)) {
      return 'kick';
    } else if (confidence >= this.config.confidenceThresholds.flag) {
      return 'flag';
    }

    return 'none';
  }

  async takeAction(playerId, action, violation) {
    const state = this.playerStates.get(playerId);
    if (!state) return;

    console.log(`Taking action: ${action} against player ${playerId} for ${violation.type}`);

    switch (action) {
      case 'flag':
        // Just log and monitor
        await this.updateTrustFactor(playerId, -0.1);
        break;

      case 'kick':
        // Kick from current match
        this.emit('player:kick', {
          playerId: playerId,
          matchId: state.matchId,
          reason: `Kicked by anti-cheat: ${violation.type}`
        });
        await this.updateTrustFactor(playerId, -0.2);
        break;

      case 'temporary_ban':
        // 24 hour ban
        await this.banPlayer(playerId, '1 day', `Temporary ban: ${violation.type}`);
        break;

      case 'permanent_ban':
        // Permanent ban
        await this.banPlayer(playerId, null, `Permanent ban: ${violation.type}`);
        break;
    }

    // Emit event for logging/monitoring
    this.emit('violation:action_taken', {
      playerId,
      action,
      violation,
      trustScore: state.trustScore
    });
  }

  async recordViolation(violation) {
    try {
      await this.db.recordCheatViolation(violation.playerId, {
        matchId: violation.matchId,
        violationType: violation.type,
        confidenceScore: violation.confidence,
        detectionData: violation.details,
        autoAction: this.determineAction(violation.playerId, violation.confidence)
      });
    } catch (error) {
      console.error('Failed to record violation:', error);
    }
  }

  async banPlayer(playerId, duration, reason) {
    try {
      await this.db.banUser(playerId, reason, duration);
      
      // Remove from current match
      const state = this.playerStates.get(playerId);
      if (state) {
        this.emit('player:ban', {
          playerId: playerId,
          matchId: state.matchId,
          reason: reason,
          duration: duration
        });
      }

      console.log(`Player ${playerId} banned: ${reason} (duration: ${duration || 'permanent'})`);
    } catch (error) {
      console.error('Failed to ban player:', error);
    }
  }

  async updateTrustFactor(playerId, delta) {
    const state = this.playerStates.get(playerId);
    if (!state) return;

    state.trustScore = Math.max(0.0, Math.min(1.0, state.trustScore + delta));

    try {
      await this.db.query(
        'UPDATE users SET trust_factor = $1 WHERE id = $2',
        [state.trustScore, playerId]
      );
    } catch (error) {
      console.error('Failed to update trust factor:', error);
    }
  }

  // Utility functions
  calculateDistance(pos1, pos2) {
    const dx = pos2.x - pos1.x;
    const dy = pos2.y - pos1.y;
    return Math.sqrt(dx * dx + dy * dy);
  }

  calculateAcceleration(velocity1, velocity2, deltaTime) {
    if (deltaTime <= 0) return 0;
    
    const dv_x = velocity1.x - velocity2.x;
    const dv_y = velocity1.y - velocity2.y;
    const dv = Math.sqrt(dv_x * dv_x + dv_y * dv_y);
    
    return dv / deltaTime;
  }

  calculateExpectedAim(mouseDelta, sensitivity) {
    // Simplified mouse-to-view angle calculation
    return mouseDelta.x * (sensitivity || 1.0) * 0.022; // degrees
  }

  getWeaponRange(weaponId) {
    const ranges = {
      'ak47': 3000,
      'm4a1': 3000,
      'awp': 8000,
      'deagle': 4000,
      'glock': 2000,
      'usp': 2000
    };
    
    return ranges[weaponId] || 3000;
  }

  // Cleanup and maintenance
  cleanupOldData() {
    const now = Date.now();
    const cleanupThreshold = now - this.config.violationDecay;

    for (const [playerId, violations] of this.playerViolations) {
      // Remove old violations
      const filteredViolations = violations.filter(v => v.timestamp > cleanupThreshold);
      this.playerViolations.set(playerId, filteredViolations);

      // Update violation score based on remaining violations
      const state = this.playerStates.get(playerId);
      if (state && filteredViolations.length === 0) {
        // Gradually restore trust if no recent violations
        state.violationScore = Math.max(0.0, state.violationScore - 0.1);
        state.trustScore = Math.min(1.0, state.trustScore + 0.05);
      }
    }

    console.log('Anti-cheat data cleanup completed');
  }

  // Statistics and reporting
  getPlayerStats(playerId) {
    const state = this.playerStates.get(playerId);
    const violations = this.playerViolations.get(playerId);

    if (!state) return null;

    const recentViolations = violations?.filter(v => 
      Date.now() - v.timestamp < this.config.trackingWindow
    ) || [];

    return {
      playerId: playerId,
      trustScore: state.trustScore,
      violationScore: state.violationScore,
      recentViolations: recentViolations.length,
      totalViolations: violations?.length || 0,
      stats: state.stats,
      sessionTime: Date.now() - state.joinTime,
      lastActivity: state.lastActivity
    };
  }

  getOverallStats() {
    const totalPlayers = this.playerStates.size;
    const totalViolations = Array.from(this.playerViolations.values())
      .reduce((sum, violations) => sum + violations.length, 0);

    const activePlayers = Array.from(this.playerStates.values())
      .filter(state => Date.now() - state.lastActivity < 60000).length;

    const suspiciousPlayers = Array.from(this.playerStates.values())
      .filter(state => state.violationScore > 0.5).length;

    return {
      totalPlayers,
      activePlayers,
      suspiciousPlayers,
      totalViolations,
      detectionRate: totalViolations > 0 ? (suspiciousPlayers / totalPlayers) : 0
    };
  }
}

module.exports = { AntiCheatService };