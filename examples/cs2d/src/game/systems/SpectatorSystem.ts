/**
 * SpectatorSystem - Manages spectator mode for dead players
 * Allows players to observe teammates after death
 */

import { Vector2D } from '../physics/PhysicsEngine';
import { Player } from '../GameCore';

export type SpectatorMode = 'free' | 'follow_player' | 'follow_killer';

export interface SpectatorState {
  playerId: string;
  mode: SpectatorMode;
  targetPlayerId: string | null;
  freePosition: Vector2D;
  canSwitchTarget: boolean;
  availableTargets: string[];
}

export class SpectatorSystem {
  private spectatorStates: Map<string, SpectatorState> = new Map();
  private players: Map<string, Player>;

  constructor(players: Map<string, Player>) {
    this.players = players;
  }

  /**
   * Enter spectator mode (called when player dies)
   */
  enterSpectatorMode(playerId: string, deathPosition: Vector2D, killerId?: string): void {
    const player = this.players.get(playerId);
    if (!player) return;

    // Find initial spectator target (teammate or killer)
    let initialTarget: string | null = null;
    let initialMode: SpectatorMode = 'free';

    // Try to follow killer first (CS 1.6 behavior)
    if (killerId && this.players.has(killerId)) {
      const killer = this.players.get(killerId);
      if (killer?.isAlive) {
        initialTarget = killerId;
        initialMode = 'follow_killer';
      }
    }

    // If no killer or killer dead, find first alive teammate
    if (!initialTarget) {
      const teammates = this.getAliveTeammates(player.team);
      if (teammates.length > 0) {
        initialTarget = teammates[0].id;
        initialMode = 'follow_player';
      }
    }

    const state: SpectatorState = {
      playerId,
      mode: initialMode,
      targetPlayerId: initialTarget,
      freePosition: { ...deathPosition },
      canSwitchTarget: true,
      availableTargets: []
    };

    this.updateAvailableTargets(state, player.team);
    this.spectatorStates.set(playerId, state);

    console.log(`👻 ${playerId} entered spectator mode, watching: ${initialTarget || 'none'}`);
  }

  /**
   * Exit spectator mode (called when player respawns)
   */
  exitSpectatorMode(playerId: string): void {
    this.spectatorStates.delete(playerId);
    console.log(`👻 ${playerId} exited spectator mode`);
  }

  /**
   * Switch to next available target
   */
  switchToNextTarget(playerId: string): boolean {
    const state = this.spectatorStates.get(playerId);
    if (!state || !state.canSwitchTarget || state.availableTargets.length === 0) {
      return false;
    }

    const currentIndex = state.targetPlayerId ?
      state.availableTargets.indexOf(state.targetPlayerId) : -1;
    const nextIndex = (currentIndex + 1) % state.availableTargets.length;

    state.targetPlayerId = state.availableTargets[nextIndex];
    state.mode = 'follow_player';

    console.log(`👻 ${playerId} switched to watching: ${state.targetPlayerId}`);
    return true;
  }

  /**
   * Switch to previous available target
   */
  switchToPreviousTarget(playerId: string): boolean {
    const state = this.spectatorStates.get(playerId);
    if (!state || !state.canSwitchTarget || state.availableTargets.length === 0) {
      return false;
    }

    const currentIndex = state.targetPlayerId ?
      state.availableTargets.indexOf(state.targetPlayerId) : -1;
    const prevIndex = currentIndex <= 0 ?
      state.availableTargets.length - 1 : currentIndex - 1;

    state.targetPlayerId = state.availableTargets[prevIndex];
    state.mode = 'follow_player';

    console.log(`👻 ${playerId} switched to watching: ${state.targetPlayerId}`);
    return true;
  }

  /**
   * Switch to free camera mode
   */
  switchToFreeMode(playerId: string): boolean {
    const state = this.spectatorStates.get(playerId);
    if (!state) return false;

    // Save current view position
    if (state.targetPlayerId) {
      const target = this.players.get(state.targetPlayerId);
      if (target) {
        state.freePosition = { ...target.position };
      }
    }

    state.mode = 'free';
    state.targetPlayerId = null;

    console.log(`👻 ${playerId} switched to free camera mode`);
    return true;
  }

  /**
   * Move free camera position
   */
  moveFreeCamera(playerId: string, delta: Vector2D): boolean {
    const state = this.spectatorStates.get(playerId);
    if (!state || state.mode !== 'free') return false;

    state.freePosition.x += delta.x;
    state.freePosition.y += delta.y;
    return true;
  }

  /**
   * Update spectator system each frame
   */
  update(deltaTime: number): void {
    this.spectatorStates.forEach((state, playerId) => {
      const player = this.players.get(playerId);
      if (!player) return;

      // Update available targets
      this.updateAvailableTargets(state, player.team);

      // Handle target death
      if (state.targetPlayerId) {
        const target = this.players.get(state.targetPlayerId);
        if (!target || !target.isAlive) {
          // Target died, switch to next available
          console.log(`👻 ${playerId}'s spectator target died, switching...`);
          if (!this.switchToNextTarget(playerId)) {
            // No targets available, switch to free mode
            this.switchToFreeMode(playerId);
          }
        }
      }

      // If no targets available and not in free mode, switch to free
      if (state.mode !== 'free' && state.availableTargets.length === 0) {
        this.switchToFreeMode(playerId);
      }
    });
  }

  /**
   * Get spectator view position and target
   */
  getSpectatorView(playerId: string): {
    position: Vector2D;
    targetPlayer: Player | null;
    mode: SpectatorMode;
  } | null {
    const state = this.spectatorStates.get(playerId);
    if (!state) return null;

    if (state.mode === 'free') {
      return {
        position: state.freePosition,
        targetPlayer: null,
        mode: state.mode
      };
    }

    if (state.targetPlayerId) {
      const target = this.players.get(state.targetPlayerId);
      if (target && target.isAlive) {
        return {
          position: target.position,
          targetPlayer: target,
          mode: state.mode
        };
      }
    }

    // Fallback to free mode position
    return {
      position: state.freePosition,
      targetPlayer: null,
      mode: 'free'
    };
  }

  /**
   * Get spectator state
   */
  getSpectatorState(playerId: string): SpectatorState | null {
    const state = this.spectatorStates.get(playerId);
    return state ? { ...state } : null;
  }

  /**
   * Check if player is in spectator mode
   */
  isSpectating(playerId: string): boolean {
    return this.spectatorStates.has(playerId);
  }

  /**
   * Get all spectators watching a specific player
   */
  getSpectatorsWatching(targetPlayerId: string): string[] {
    const spectators: string[] = [];

    this.spectatorStates.forEach((state, playerId) => {
      if (state.targetPlayerId === targetPlayerId) {
        spectators.push(playerId);
      }
    });

    return spectators;
  }

  /**
   * Update available targets for spectator
   */
  private updateAvailableTargets(state: SpectatorState, team: 'ct' | 't'): void {
    const teammates = this.getAliveTeammates(team);
    state.availableTargets = teammates.map(p => p.id);
  }

  /**
   * Get all alive teammates
   */
  private getAliveTeammates(team: 'ct' | 't'): Player[] {
    return Array.from(this.players.values()).filter(
      p => p.team === team && p.isAlive
    );
  }

  /**
   * Handle player death - automatically enter spectator mode
   */
  handlePlayerDeath(playerId: string, deathPosition: Vector2D, killerId?: string): void {
    this.enterSpectatorMode(playerId, deathPosition, killerId);
  }

  /**
   * Handle player respawn - automatically exit spectator mode
   */
  handlePlayerRespawn(playerId: string): void {
    this.exitSpectatorMode(playerId);
  }

  /**
   * Reset spectator system (for new round)
   */
  reset(): void {
    this.spectatorStates.clear();
    console.log('👻 SpectatorSystem reset');
  }

  /**
   * Get statistics for debugging
   */
  getStats(): {
    totalSpectators: number;
    watchingPlayers: number;
    freeCameras: number;
  } {
    let watchingPlayers = 0;
    let freeCameras = 0;

    this.spectatorStates.forEach(state => {
      if (state.mode === 'free') {
        freeCameras++;
      } else if (state.targetPlayerId) {
        watchingPlayers++;
      }
    });

    return {
      totalSpectators: this.spectatorStates.size,
      watchingPlayers,
      freeCameras
    };
  }
}