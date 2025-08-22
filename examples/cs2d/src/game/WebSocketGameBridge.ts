/**
 * WebSocketGameBridge - Bridges GameCore events with WebSocket multiplayer system
 * Handles real-time multiplayer synchronization of game events and audio
 */

import { GameStateManager, NetworkGameEvent } from './GameStateManager';
import { GameCore } from './GameCore';

export interface MultiplayerConfig {
  enableVoiceChat: boolean;
  enablePositionalAudio: boolean;
  maxPlayersPerRoom: number;
  tickRate: number;
}

export class WebSocketGameBridge {
  private stateManager: GameStateManager | null = null;
  private gameCore: GameCore | null = null;
  private webSocket: any = null; // Will be injected from frontend
  private config: MultiplayerConfig;
  private isHost: boolean = false;
  private roomId: string = '';
  private playerId: string = '';
  
  // Event throttling for performance
  private lastEventTime: Map<string, number> = new Map();
  private eventThrottleMs = 50; // Limit events to 20/sec per type
  
  constructor(config: Partial<MultiplayerConfig> = {}) {
    this.config = {
      enableVoiceChat: config.enableVoiceChat ?? true,
      enablePositionalAudio: config.enablePositionalAudio ?? true,
      maxPlayersPerRoom: config.maxPlayersPerRoom ?? 10,
      tickRate: config.tickRate ?? 64
    };
    
    console.log('🌉 WebSocketGameBridge initialized', this.config);
  }

  /**
   * Connect to WebSocket service from frontend
   */
  connectWebSocket(webSocketService: any): void {
    this.webSocket = webSocketService;
    this.setupWebSocketHandlers();
    console.log('🔌 WebSocket connected to game bridge');
  }

  /**
   * Connect to game systems
   */
  connectGameSystems(gameCore: GameCore, stateManager: GameStateManager): void {
    this.gameCore = gameCore;
    this.stateManager = stateManager;
    this.setupGameEventHandlers();
    console.log('🎮 Game systems connected to WebSocket bridge');
  }

  /**
   * Join multiplayer room
   */
  joinRoom(roomId: string, playerId: string, isHost: boolean = false): void {
    this.roomId = roomId;
    this.playerId = playerId;
    this.isHost = isHost;

    if (this.webSocket) {
      this.webSocket.emit('game:join_room', {
        roomId,
        playerId,
        playerName: `Player_${playerId.substring(0, 8)}`,
        isHost
      });
    }

    console.log(`🏠 Joined room ${roomId} as ${isHost ? 'HOST' : 'PLAYER'}`);
  }

  /**
   * Setup WebSocket event handlers for receiving multiplayer events
   */
  private setupWebSocketHandlers(): void {
    if (!this.webSocket) return;

    // Game state synchronization
    this.webSocket.on('game:state_sync', (data: any) => {
      this.handleStateSync(data);
    });

    // Player events from other clients
    this.webSocket.on('game:player_event', (event: NetworkGameEvent) => {
      this.handleRemotePlayerEvent(event);
    });

    // Audio events from other players
    this.webSocket.on('game:audio_event', (event: NetworkGameEvent) => {
      this.handleRemoteAudioEvent(event);
    });

    // Round events
    this.webSocket.on('game:round_event', (data: any) => {
      this.handleRoundEvent(data);
    });

    // Room player updates
    this.webSocket.on('game:player_joined', (data: any) => {
      this.handlePlayerJoined(data);
    });

    this.webSocket.on('game:player_left', (data: any) => {
      this.handlePlayerLeft(data);
    });

    console.log('📡 WebSocket game handlers setup complete');
  }

  /**
   * Setup game event handlers for sending multiplayer events
   */
  private setupGameEventHandlers(): void {
    if (!this.stateManager) return;

    // Handle local game events and broadcast to other players
    this.stateManager.on('weapon_fire', (event) => this.broadcastGameEvent(event));
    this.stateManager.on('weapon_reload', (event) => this.broadcastGameEvent(event));
    this.stateManager.on('player_damage', (event) => this.broadcastGameEvent(event));
    this.stateManager.on('player_death', (event) => this.broadcastGameEvent(event));
    this.stateManager.on('radio_command', (event) => this.broadcastAudioEvent(event));
    this.stateManager.on('footstep', (event) => this.broadcastAudioEvent(event));
    this.stateManager.on('bomb_plant', (event) => this.broadcastGameEvent(event));
    this.stateManager.on('bomb_defuse', (event) => this.broadcastGameEvent(event));

    console.log('🎯 Game event handlers setup complete');
  }

  /**
   * Broadcast game event to all players in room
   */
  private broadcastGameEvent(event: NetworkGameEvent): void {
    if (!this.shouldBroadcastEvent(event)) return;

    if (this.webSocket?.isConnected) {
      this.webSocket.emit('game:broadcast_event', {
        roomId: this.roomId,
        event,
        fromPlayer: this.playerId
      });
    }

    this.updateEventThrottle(event.type);
  }

  /**
   * Broadcast audio event to all players in room (positional audio)
   */
  private broadcastAudioEvent(event: NetworkGameEvent): void {
    if (!this.config.enablePositionalAudio || !this.shouldBroadcastEvent(event)) return;

    if (this.webSocket?.isConnected) {
      this.webSocket.emit('game:broadcast_audio', {
        roomId: this.roomId,
        event,
        fromPlayer: this.playerId
      });
    }

    this.updateEventThrottle(event.type);
  }

  /**
   * Handle game state synchronization from host
   */
  private handleStateSync(data: any): void {
    if (!this.stateManager || this.isHost) return;

    console.log('📋 Received game state sync from host');
    
    // Apply synchronized game state
    if (data.gameState) {
      this.stateManager.applySnapshot(data.gameState);
    }
  }

  /**
   * Handle remote player events
   */
  private handleRemotePlayerEvent(event: NetworkGameEvent): void {
    if (!this.stateManager || event.playerId === this.playerId) return;

    console.log(`👤 Remote player event: ${event.type} from ${event.playerId}`);
    
    // Apply event locally without re-broadcasting
    this.stateManager.handleLocalEvent(event);
  }

  /**
   * Handle remote audio events
   */
  private handleRemoteAudioEvent(event: NetworkGameEvent): void {
    if (!this.stateManager || event.playerId === this.playerId) return;

    console.log(`🔊 Remote audio event: ${event.type} from ${event.playerId}`);
    
    // Only play audio effects, don't trigger game logic
    this.stateManager.handleLocalEvent(event);
  }

  /**
   * Handle round events (bomb planted, round start, etc.)
   */
  private handleRoundEvent(data: any): void {
    console.log('⏰ Round event:', data.type);
    
    // Handle round-specific events
    switch (data.type) {
      case 'round_start':
        // Reset player positions, money, etc.
        break;
      case 'round_end':
        // Show round results
        break;
      case 'bomb_planted':
        // Start bomb timer
        break;
    }
  }

  /**
   * Handle new player joining the room
   */
  private handlePlayerJoined(data: any): void {
    console.log(`👋 Player joined: ${data.playerName} (${data.playerId})`);
    
    if (this.gameCore) {
      // Add the new player to local game state
      const newPlayer = this.createRemotePlayer(data);
      this.gameCore.addPlayer(newPlayer);
    }
  }

  /**
   * Handle player leaving the room
   */
  private handlePlayerLeft(data: any): void {
    console.log(`👋 Player left: ${data.playerId}`);
    
    // Remove player from local game state
    // Note: GameCore would need a removePlayer method
  }

  /**
   * Create a remote player object
   */
  private createRemotePlayer(data: any): any {
    return {
      id: data.playerId,
      name: data.playerName || `Player_${data.playerId.substring(0, 8)}`,
      team: data.team || 'ct',
      position: data.position || { x: 400, y: 300 },
      velocity: { x: 0, y: 0 },
      health: 100,
      armor: 0,
      money: 16000,
      score: 0,
      kills: 0,
      deaths: 0,
      assists: 0,
      currentWeapon: 'usp',
      weapons: ['knife', 'usp'],
      ammo: new Map([['usp', 12]]),
      isAlive: true,
      isDucking: false,
      isWalking: false,
      isScoped: false,
      lastShotTime: 0,
      lastStepTime: 0,
      lastPosition: data.position || { x: 400, y: 300 },
      currentSurface: { material: 'concrete', volume: 1.0 },
      lastDamageTime: 0,
      isInPain: false,
      orientation: 0,
      isBot: false, // Remote players are not bots
      lastVoiceTime: 0
    };
  }

  /**
   * Check if event should be broadcast (throttling)
   */
  private shouldBroadcastEvent(event: NetworkGameEvent): boolean {
    const now = Date.now();
    const lastTime = this.lastEventTime.get(event.type) || 0;
    
    // Throttle high-frequency events like footsteps
    if (event.type === 'footstep' && now - lastTime < 200) {
      return false;
    }
    
    // General throttling
    if (now - lastTime < this.eventThrottleMs) {
      return false;
    }
    
    return true;
  }

  /**
   * Update event throttling timestamp
   */
  private updateEventThrottle(eventType: string): void {
    this.lastEventTime.set(eventType, Date.now());
  }

  /**
   * Send game state snapshot to all players (host only)
   */
  sendStateSnapshot(): void {
    if (!this.isHost || !this.stateManager || !this.webSocket?.isConnected) return;

    const snapshot = this.stateManager.createSnapshot();
    if (snapshot) {
      this.webSocket.emit('game:state_sync', {
        roomId: this.roomId,
        gameState: snapshot
      });
    }
  }

  /**
   * Get multiplayer statistics
   */
  getMultiplayerStats(): {
    roomId: string;
    playerId: string;
    isHost: boolean;
    connected: boolean;
    playersInRoom: number;
    eventsThrottled: number;
  } {
    return {
      roomId: this.roomId,
      playerId: this.playerId,
      isHost: this.isHost,
      connected: this.webSocket?.isConnected || false,
      playersInRoom: this.gameCore?.getPlayers().length || 0,
      eventsThrottled: this.lastEventTime.size
    };
  }

  /**
   * Cleanup and disconnect
   */
  disconnect(): void {
    if (this.webSocket) {
      this.webSocket.emit('game:leave_room', {
        roomId: this.roomId,
        playerId: this.playerId
      });
    }

    this.stateManager = null;
    this.gameCore = null;
    this.webSocket = null;
    this.lastEventTime.clear();

    console.log('🚪 WebSocketGameBridge disconnected');
  }
}