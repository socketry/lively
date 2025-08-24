/**
 * WebSocketGameBridge - Simple WebSocket integration for real-time multiplayer
 * Direct WebSocket usage without complex abstraction layers
 */

import { GameStateManager, GameEvent } from './GameStateManager';
import { GameCore } from './GameCore';

export interface MultiplayerConfig {
  enableVoiceChat: boolean;
  enablePositionalAudio: boolean;
  maxPlayersPerRoom: number;
}

export class WebSocketGameBridge {
  private stateManager: GameStateManager | null = null;
  private gameCore: GameCore | null = null;
  private webSocket: any = null;
  private config: MultiplayerConfig;
  private roomId: string = '';
  private playerId: string = '';
  
  constructor(config: Partial<MultiplayerConfig> = {}) {
    this.config = {
      enableVoiceChat: config.enableVoiceChat ?? true,
      enablePositionalAudio: config.enablePositionalAudio ?? true,
      maxPlayersPerRoom: config.maxPlayersPerRoom ?? 10
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
  joinRoom(roomId: string, playerId: string): void {
    this.roomId = roomId;
    this.playerId = playerId;

    if (this.webSocket?.isConnected) {
      this.webSocket.emit('game:join_room', {
        roomId,
        playerId,
        playerName: `Player_${playerId.substring(0, 8)}`
      });
    }

    console.log(`🏠 Joined room ${roomId}`);
  }

  /**
   * Setup WebSocket event handlers
   */
  private setupWebSocketHandlers(): void {
    if (!this.webSocket) return;

    this.webSocket.on('game:player_event', (event: GameEvent) => {
      this.handleRemoteEvent(event);
    });

    this.webSocket.on('game:player_joined', (data: any) => {
      console.log(`👋 Player joined: ${data.playerName}`);
    });

    this.webSocket.on('game:player_left', (data: any) => {
      console.log(`👋 Player left: ${data.playerId}`);
    });

    console.log('📡 WebSocket handlers setup complete');
  }

  /**
   * Setup game event handlers
   */
  private setupGameEventHandlers(): void {
    if (!this.stateManager) return;

    // Forward game events to WebSocket
    this.stateManager.on('weapon_fire', (event) => this.broadcastEvent(event));
    this.stateManager.on('weapon_reload', (event) => this.broadcastEvent(event));
    this.stateManager.on('player_damage', (event) => this.broadcastEvent(event));
    this.stateManager.on('player_death', (event) => this.broadcastEvent(event));
    this.stateManager.on('radio_command', (event) => this.broadcastEvent(event));

    console.log('🎯 Game event handlers setup complete');
  }

  /**
   * Broadcast event to other players
   */
  private broadcastEvent(event: GameEvent): void {
    if (this.webSocket?.isConnected) {
      this.webSocket.emit('game:broadcast_event', {
        roomId: this.roomId,
        event,
        fromPlayer: this.playerId
      });
    }
  }

  /**
   * Handle events from other players
   */
  private handleRemoteEvent(event: GameEvent): void {
    if (!this.stateManager || event.playerId === this.playerId) return;

    console.log(`👤 Remote event: ${event.type} from ${event.playerId}`);
    this.stateManager.emit(event);
  }

  /**
   * Get connection status
   */
  getConnectionStatus(): {
    connected: boolean;
    roomId: string;
    playerId: string;
  } {
    return {
      connected: this.webSocket?.isConnected || false,
      roomId: this.roomId,
      playerId: this.playerId
    };
  }

  /**
   * Disconnect and cleanup
   */
  disconnect(): void {
    if (this.webSocket?.isConnected) {
      this.webSocket.emit('game:leave_room', {
        roomId: this.roomId,
        playerId: this.playerId
      });
    }

    this.stateManager = null;
    this.gameCore = null;
    this.webSocket = null;

    console.log('🚪 WebSocketGameBridge disconnected');
  }
}