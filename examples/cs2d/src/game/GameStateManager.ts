/**
 * GameStateManager - Manages game state synchronization between client and server
 * Handles multiplayer game state updates and audio event broadcasting
 */

import { GameCore, Player, GameState } from './GameCore';
import { CS16AudioManager } from './audio/CS16AudioManager';

export interface NetworkGameEvent {
  type: 'player_move' | 'weapon_fire' | 'player_damage' | 'player_death' | 
        'radio_command' | 'bomb_plant' | 'bomb_defuse' | 'round_start' | 'round_end' |
        'weapon_reload' | 'weapon_switch' | 'footstep' | 'grenade_throw';
  playerId: string;
  data: any;
  timestamp: number;
  position?: { x: number; y: number };
  team?: 'ct' | 't';
}

export interface GameStateSnapshot {
  gameState: GameState;
  players: Player[];
  timestamp: number;
  roundNumber: number;
}

export type GameEventHandler = (event: NetworkGameEvent) => void;

export class GameStateManager {
  private gameCore: GameCore | null = null;
  private audioManager: CS16AudioManager | null = null;
  private eventHandlers: Map<string, GameEventHandler[]> = new Map();
  private networkQueue: NetworkGameEvent[] = [];
  private lastStateSnapshot: GameStateSnapshot | null = null;
  
  // Network simulation for offline testing
  private isOfflineMode: boolean = true;
  private simulatedLatency: number = 50; // ms
  
  constructor() {
    console.log('🌐 GameStateManager initialized');
  }

  /**
   * Connect to the GameCore instance
   */
  connectGameCore(gameCore: GameCore): void {
    this.gameCore = gameCore;
    console.log('🎮 GameCore connected to state manager');
  }

  /**
   * Connect to the audio manager
   */
  connectAudioManager(audioManager: CS16AudioManager): void {
    this.audioManager = audioManager;
    console.log('🎵 Audio manager connected to state manager');
  }

  /**
   * Register event handler
   */
  on(eventType: string, handler: GameEventHandler): void {
    if (!this.eventHandlers.has(eventType)) {
      this.eventHandlers.set(eventType, []);
    }
    this.eventHandlers.get(eventType)!.push(handler);
  }

  /**
   * Remove event handler
   */
  off(eventType: string, handler: GameEventHandler): void {
    const handlers = this.eventHandlers.get(eventType);
    if (handlers) {
      const index = handlers.indexOf(handler);
      if (index > -1) {
        handlers.splice(index, 1);
      }
    }
  }

  /**
   * Emit game event to network and local handlers
   */
  emit(event: NetworkGameEvent): void {
    // Add to network queue for multiplayer broadcasting
    this.networkQueue.push(event);
    
    // Handle locally immediately
    this.handleLocalEvent(event);
    
    // In real multiplayer, this would broadcast to server/other clients
    if (!this.isOfflineMode) {
      this.broadcastToNetwork(event);
    } else {
      // Simulate network delay for testing
      setTimeout(() => {
        this.handleNetworkEvent(event);
      }, this.simulatedLatency);
    }
  }

  /**
   * Handle event locally (immediate response)
   */
  handleLocalEvent(event: NetworkGameEvent): void {
    const handlers = this.eventHandlers.get(event.type);
    if (handlers) {
      handlers.forEach(handler => handler(event));
    }

    // Handle audio events immediately for responsive feedback
    this.handleAudioEvent(event);
  }

  /**
   * Handle event from network (delayed response)
   */
  private handleNetworkEvent(event: NetworkGameEvent): void {
    // Simulate receiving event from other players
    if (event.playerId !== this.getLocalPlayerId()) {
      console.log(`📡 Received network event: ${event.type} from ${event.playerId}`);
      this.handleAudioEvent(event);
    }
  }

  /**
   * Handle audio-specific events
   */
  private handleAudioEvent(event: NetworkGameEvent): void {
    if (!this.audioManager || !event.position) return;

    switch (event.type) {
      case 'weapon_fire':
        this.audioManager.playWeaponSound(
          event.data.weaponId, 
          'fire', 
          event.position,
          { playerId: event.playerId }
        );
        break;

      case 'weapon_reload':
        this.audioManager.playWeaponSound(
          event.data.weaponId, 
          'reload', 
          event.position,
          { playerId: event.playerId }
        );
        break;

      case 'footstep':
        this.audioManager.playFootstep(event.position, event.data.surface);
        break;

      case 'player_damage':
        if (event.data.headshot) {
          this.audioManager.playPlayerSound('headshot', event.position);
        } else if (event.data.armor) {
          this.audioManager.playPlayerSound('kevlar', event.position);
        } else {
          this.audioManager.playPlayerSound('damage', event.position);
        }
        break;

      case 'player_death':
        this.audioManager.playPlayerSound('death', event.position);
        break;

      case 'radio_command':
        this.audioManager.playRadioCommand(event.data.command, event.position);
        break;

      case 'bomb_plant':
        this.audioManager.play('bomb_plant', event.position, { category: 'bomb' });
        break;

      case 'bomb_defuse':
        this.audioManager.play('bomb_defuse', event.position, { category: 'bomb' });
        break;

      case 'grenade_throw':
        this.audioManager.play('grenade_throw', event.position, { category: 'weapons' });
        break;
    }
  }

  /**
   * Create game state snapshot
   */
  createSnapshot(): GameStateSnapshot | null {
    if (!this.gameCore) return null;

    const snapshot: GameStateSnapshot = {
      gameState: this.gameCore.getState(),
      players: this.gameCore.getPlayers(),
      timestamp: Date.now(),
      roundNumber: this.gameCore.getState().roundNumber
    };

    this.lastStateSnapshot = snapshot;
    return snapshot;
  }

  /**
   * Apply game state snapshot (for multiplayer sync)
   */
  applySnapshot(snapshot: GameStateSnapshot): void {
    if (!this.gameCore) return;

    // In a real implementation, this would carefully merge the snapshot
    // with current state to avoid conflicts
    console.log('📋 Applying game state snapshot:', snapshot.roundNumber);
    
    // This would update the GameCore with network state
    // For now, just log the synchronization
    this.lastStateSnapshot = snapshot;
  }

  /**
   * Get local player ID
   */
  private getLocalPlayerId(): string {
    return this.gameCore?.getLocalPlayer()?.id || '';
  }

  /**
   * Broadcast to network (placeholder for real networking)
   */
  private broadcastToNetwork(event: NetworkGameEvent): void {
    // In real implementation, this would send to WebSocket server
    console.log('📡 Broadcasting event to network:', event.type);
  }

  /**
   * Process network queue (for batch processing)
   */
  processNetworkQueue(): void {
    if (this.networkQueue.length === 0) return;

    // Process all queued events
    const events = [...this.networkQueue];
    this.networkQueue = [];

    console.log(`📦 Processing ${events.length} network events`);
    
    // In real implementation, this would batch send to server
    events.forEach(event => {
      if (!this.isOfflineMode) {
        this.broadcastToNetwork(event);
      }
    });
  }

  /**
   * Get network statistics
   */
  getNetworkStats(): {
    queueSize: number;
    lastSnapshot: number;
    playersConnected: number;
    latency: number;
  } {
    return {
      queueSize: this.networkQueue.length,
      lastSnapshot: this.lastStateSnapshot?.timestamp || 0,
      playersConnected: this.gameCore?.getPlayers().length || 0,
      latency: this.simulatedLatency
    };
  }

  /**
   * Enable/disable offline mode for testing
   */
  setOfflineMode(offline: boolean): void {
    this.isOfflineMode = offline;
    console.log(`🔌 Network mode: ${offline ? 'OFFLINE' : 'ONLINE'}`);
  }
}