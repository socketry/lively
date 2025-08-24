/**
 * CollisionSystem - Handles bullet collision detection and processing
 * Extracted from GameCore to maintain separation of concerns and clean architecture
 */

import { Vector2D } from '../physics/PhysicsEngine';
import { Player } from '../GameCore';
import { Bullet } from '../weapons/WeaponSystem';
import { CS16AudioManager } from '../audio/CS16AudioManager';
import { DamageSystem } from './DamageSystem';

// Map tile interface for collision detection
export interface MapTile {
  type: string;
  walkable: boolean;
  bulletPenetrable: boolean;
}

// Collision result interfaces
export interface PlayerCollisionResult {
  type: 'player_hit';
  bulletId: string;
  playerId: string;
  damage: number;
  headshot: boolean;
  position: Vector2D;
  weapon: string;
  killerId: string;
  wasKilled: boolean;
}

export interface WallCollisionResult {
  type: 'wall_hit';
  bulletId: string;
  position: Vector2D;
  surfaceType: string;
}

export type CollisionResult = PlayerCollisionResult | WallCollisionResult;

// Collision effects interface for applying results
export interface CollisionEffects {
  createBloodEffect: (position: Vector2D) => void;
  createSparkEffect: (position: Vector2D) => void;
  addKillFeedEntry: (killerName: string, victimName: string, weapon: string, headshot: boolean) => void;
  handlePlayerDeathReward: (player: Player, killerId?: string) => void;
}

// Dependencies interface for clean dependency injection
export interface CollisionDependencies {
  audio: CS16AudioManager;
  damageSystem: DamageSystem;
  effects: CollisionEffects;
  getTileAt: (position: Vector2D) => MapTile | null;
  clearBullet: (bulletId: string) => void;
  handleBulletHit: (bulletId: string, armor: number) => number;
  emitNetworkEvent: (event: any) => void;
}

/**
 * CollisionSystem handles all bullet collision detection and processing
 * Maintains clean separation between detection and effect application
 */
export class CollisionSystem {
  private dependencies: CollisionDependencies;
  
  constructor(dependencies: CollisionDependencies) {
    this.dependencies = dependencies;
  }

  /**
   * Main collision detection method - processes all bullet collisions
   * Returns array of collision results for external handling if needed
   */
  checkBulletCollisions(bullets: Bullet[], players: Map<string, Player>): CollisionResult[] {
    const results: CollisionResult[] = [];
    
    bullets.forEach(bullet => {
      // Check collision with players first (higher priority)
      const playerCollision = this.checkPlayerCollisions(bullet, players);
      if (playerCollision) {
        results.push(playerCollision);
        this.processPlayerCollision(playerCollision, players);
        return; // Bullet is consumed, don't check wall collision
      }
      
      // Check collision with map/walls
      const wallCollision = this.checkWallCollision(bullet);
      if (wallCollision) {
        results.push(wallCollision);
        this.processWallCollision(wallCollision);
      }
    });
    
    return results;
  }

  /**
   * Check collision between bullet and all players
   */
  private checkPlayerCollisions(bullet: Bullet, players: Map<string, Player>): PlayerCollisionResult | null {
    for (const [, player] of players) {
      // Skip bullet owner and dead players
      if (player.id === bullet.owner || !player.isAlive) continue;
      
      const distance = this.calculateDistance(bullet.position, player.position);
      
      // CS 1.6 style hit detection - 16 pixel collision radius
      if (distance < 16) {
        const baseDamage = this.dependencies.handleBulletHit(bullet.id, player.armor);
        const wasHeadshot = Math.random() > 0.8; // 20% headshot chance (CS 1.6 style)
        
        return {
          type: 'player_hit',
          bulletId: bullet.id,
          playerId: player.id,
          damage: baseDamage,
          headshot: wasHeadshot,
          position: bullet.position,
          weapon: bullet.weapon,
          killerId: bullet.owner,
          wasKilled: false // Will be determined after damage application
        };
      }
    }
    
    return null;
  }

  /**
   * Check collision between bullet and map walls/obstacles
   */
  private checkWallCollision(bullet: Bullet): WallCollisionResult | null {
    const tile = this.dependencies.getTileAt(bullet.position);
    
    // Check if bullet hits a solid, non-penetrable surface
    if (tile && !tile.walkable && !tile.bulletPenetrable) {
      return {
        type: 'wall_hit',
        bulletId: bullet.id,
        position: bullet.position,
        surfaceType: tile.type || 'concrete'
      };
    }
    
    return null;
  }

  /**
   * Process player collision - apply damage, handle death, create effects
   */
  private processPlayerCollision(collision: PlayerCollisionResult, players: Map<string, Player>): void {
    const player = players.get(collision.playerId);
    if (!player) return;

    // Apply damage using DamageSystem with proper CS 1.6 mechanics
    const damageEvent = this.dependencies.damageSystem.applyDamage(player, {
      amount: collision.damage,
      source: collision.killerId,
      position: collision.position,
      weapon: collision.weapon,
      headshot: collision.headshot,
      armorPiercing: false // Most weapons don't pierce armor in CS 1.6
    });

    // Update collision result with death information
    collision.wasKilled = damageEvent.type === 'death';

    // Emit network event for multiplayer synchronization
    this.dependencies.emitNetworkEvent({
      type: damageEvent.type === 'death' ? 'player_death' : 'player_damage',
      playerId: player.id,
      data: { 
        damage: damageEvent.damage, 
        headshot: damageEvent.headshot, 
        armor: player.armor > 0,
        killerId: damageEvent.type === 'death' ? damageEvent.source : undefined
      },
      timestamp: damageEvent.timestamp,
      position: player.position,
      team: player.team
    });

    // Create visual blood effect
    this.dependencies.effects.createBloodEffect(player.position);

    // Handle death effects and rewards
    if (damageEvent.type === 'death') {
      const killer = players.get(collision.killerId);
      if (killer) {
        this.dependencies.effects.addKillFeedEntry(
          killer.name,
          player.name,
          collision.weapon,
          damageEvent.headshot || false
        );
      }
      this.dependencies.effects.handlePlayerDeathReward(player, collision.killerId);
    }
  }

  /**
   * Process wall collision - remove bullet, create effects, play sounds
   */
  private processWallCollision(collision: WallCollisionResult): void {
    // Remove the bullet
    this.dependencies.clearBullet(collision.bulletId);
    
    // Create visual spark effect
    this.dependencies.effects.createSparkEffect(collision.position);
    
    // Play authentic CS 1.6 bullet impact sound based on surface material
    this.playBulletImpactSound(collision.surfaceType, collision.position);
  }

  /**
   * Play CS 1.6 authentic bullet impact sounds based on surface material
   * Maintains the same audio behavior as the original GameCore implementation
   */
  private playBulletImpactSound(surfaceType: string, position: Vector2D): void {
    // CS 1.6 uses generic debris sounds for bullet impacts regardless of surface
    // This maintains authenticity with the original game
    
    // Map surface types to appropriate impact sounds (future enhancement)
    // Currently all surfaces use the same authentic CS 1.6 debris sound
    switch (surfaceType) {
      case 'metal':
      case 'metalgrate':
      case 'wood':
      case 'glass':
      case 'concrete':
      default:
        // All surfaces use the same authentic CS 1.6 sound
        break;
    }
    
    // Note: CS 1.6 uses generic debris sounds, so we use authentic debris1.wav
    // This matches the original implementation for authentic CS 1.6 experience
    this.dependencies.audio.play('weapons/debris1.wav', position, { category: 'weapons' });
  }

  /**
   * Calculate Euclidean distance between two points
   */
  private calculateDistance(pos1: Vector2D, pos2: Vector2D): number {
    return Math.sqrt((pos1.x - pos2.x) ** 2 + (pos1.y - pos2.y) ** 2);
  }

  /**
   * Get collision statistics for debugging and monitoring
   */
  getCollisionStats(): { playerHits: number; wallHits: number; totalCollisions: number } {
    // This could be implemented to track collision statistics
    // for performance monitoring and game balance analysis
    return {
      playerHits: 0, // TODO: Implement collision tracking
      wallHits: 0,   // TODO: Implement collision tracking
      totalCollisions: 0 // TODO: Implement collision tracking
    };
  }
}