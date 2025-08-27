/**
 * GameStateManager - Simplified game state management for SPA
 * Handles audio event broadcasting and local event management
 */

import { GameCore, Player, GameState } from './GameCore';
import { CS16AudioManager } from './audio/CS16AudioManager';

export interface GameEvent {
  type: 'weapon_fire' | 'weapon_reload' | 'player_damage' | 'player_death' | 
        'radio_command' | 'footstep' | 'bomb_plant' | 'bomb_defuse';
  playerId: string;
  data: any;
  position?: { x: number; y: number };
}

export type GameEventHandler = (event: GameEvent) => void;

export class GameStateManager {
  private gameCore: GameCore | null = null;
  private audioManager: CS16AudioManager | null = null;
  private eventHandlers: Map<string, GameEventHandler[]> = new Map();
  
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
   * Emit game event and handle locally
   */
  emit(event: GameEvent): void {
    this.handleEvent(event);
  }

  /**
   * Handle game event
   */
  private handleEvent(event: GameEvent): void {
    const handlers = this.eventHandlers.get(event.type);
    if (handlers) {
      handlers.forEach(handler => handler(event));
    }

    // Handle audio events for responsive feedback
    this.handleAudioEvent(event);
  }

  /**
   * Handle audio-specific events
   */
  private handleAudioEvent(event: GameEvent): void {
    if (!this.audioManager || !event.position) return;

    switch (event.type) {
      case 'weapon_fire':
        this.audioManager.playWeaponSound(
          event.data.weaponId, 
          'fire', 
          event.position
        );
        break;

      case 'weapon_reload':
        this.audioManager.playWeaponSound(
          event.data.weaponId, 
          'reload', 
          event.position
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
        // Radio commands not implemented in simplified version
        console.log('📻 Radio command:', event.data.command);
        break;

      case 'bomb_plant':
        this.audioManager.play('bomb_plant', event.position, { category: 'bomb' });
        break;

      case 'bomb_defuse':
        this.audioManager.play('bomb_defuse', event.position, { category: 'bomb' });
        break;
    }
  }

  /**
   * Get local player ID
   */
  private getLocalPlayerId(): string {
    return this.gameCore?.getLocalPlayer()?.id || '';
  }
}