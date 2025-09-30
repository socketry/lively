/**
 * SpawnSystem - Manages player spawn points and prevents overlapping
 * Ensures players spawn in their team's designated areas
 */

import { Vector2D } from '../physics/PhysicsEngine';
import { MapSystem, SpawnPoint } from '../maps/MapSystem';
import { Player } from '../GameCore';
import { GAME_CONSTANTS } from '../config/gameConstants';

export interface SpawnAllocation {
  playerId: string;
  spawnPoint: SpawnPoint;
  actualPosition: Vector2D; // May be offset to avoid overlap
}

export class SpawnSystem {
  private mapSystem: MapSystem;
  private usedSpawnPoints: Set<string> = new Set();
  private spawnHistory: Map<string, string> = new Map(); // playerId -> last spawn point id

  constructor(mapSystem: MapSystem) {
    this.mapSystem = mapSystem;
  }

  /**
   * Allocate spawn points for all players in a team
   * Prevents overlapping and distributes players evenly
   */
  allocateSpawns(players: Player[], team: 'ct' | 't'): Map<string, Vector2D> {
    const allocations = new Map<string, Vector2D>();

    // Get available spawn points for team
    const spawnPoints = this.mapSystem.getSpawnPoints(team);

    if (spawnPoints.length === 0) {
      console.warn(`⚠️ No spawn points found for team ${team}`);
      // Fallback to default positions
      return this.getFallbackSpawns(players, team);
    }

    // Reset used spawn points
    this.usedSpawnPoints.clear();

    // Sort players to maintain consistent spawn order
    const sortedPlayers = [...players].sort((a, b) => a.id.localeCompare(b.id));

    // Allocate spawn points
    sortedPlayers.forEach((player, index) => {
      const spawn = this.selectSpawnPoint(player.id, spawnPoints, allocations);
      allocations.set(player.id, spawn);
    });

    console.log(`🎯 Allocated ${allocations.size} spawn points for team ${team}`);
    return allocations;
  }

  /**
   * Select best spawn point for a player
   * Considers: distance from other players, not recently used, team-specific
   */
  private selectSpawnPoint(
    playerId: string,
    availableSpawns: SpawnPoint[],
    currentAllocations: Map<string, Vector2D>
  ): Vector2D {
    const separationDistance = GAME_CONSTANTS.MAP.SPAWN_SEPARATION_DISTANCE;

    // Try to find unused spawn point
    let bestSpawn: SpawnPoint | null = null;
    let maxMinDistance = 0;

    for (const spawn of availableSpawns) {
      // Skip if recently used by this player (unless no choice)
      const lastUsed = this.spawnHistory.get(playerId);
      if (lastUsed === spawn.id && availableSpawns.length > 1) {
        continue;
      }

      // Skip if already allocated
      if (this.usedSpawnPoints.has(spawn.id)) {
        continue;
      }

      // Calculate minimum distance to other allocated spawns
      const minDistance = this.getMinDistanceToAllocations(spawn.position, currentAllocations);

      // Select spawn with maximum minimum distance (most isolated)
      if (minDistance > maxMinDistance) {
        maxMinDistance = minDistance;
        bestSpawn = spawn;
      }
    }

    // If no spawn found (all used), find least crowded
    if (!bestSpawn) {
      bestSpawn = this.findLeastCrowdedSpawn(availableSpawns, currentAllocations);
    }

    // Mark as used and record in history
    this.usedSpawnPoints.add(bestSpawn.id);
    this.spawnHistory.set(playerId, bestSpawn.id);

    // Apply small random offset to prevent exact overlap if multiple players on same spawn
    const offset = this.getRandomOffset(separationDistance / 2);

    return {
      x: bestSpawn.position.x + offset.x,
      y: bestSpawn.position.y + offset.y
    };
  }

  /**
   * Find spawn point with most distance from allocated positions
   */
  private findLeastCrowdedSpawn(
    spawns: SpawnPoint[],
    allocations: Map<string, Vector2D>
  ): SpawnPoint {
    let bestSpawn = spawns[0];
    let maxMinDistance = 0;

    for (const spawn of spawns) {
      const minDistance = this.getMinDistanceToAllocations(spawn.position, allocations);
      if (minDistance > maxMinDistance) {
        maxMinDistance = minDistance;
        bestSpawn = spawn;
      }
    }

    return bestSpawn;
  }

  /**
   * Get minimum distance from a position to all allocated spawns
   */
  private getMinDistanceToAllocations(
    position: Vector2D,
    allocations: Map<string, Vector2D>
  ): number {
    if (allocations.size === 0) return Infinity;

    let minDistance = Infinity;

    allocations.forEach(allocatedPos => {
      const distance = this.calculateDistance(position, allocatedPos);
      minDistance = Math.min(minDistance, distance);
    });

    return minDistance;
  }

  /**
   * Get random offset to prevent exact overlap
   */
  private getRandomOffset(maxOffset: number): Vector2D {
    const angle = Math.random() * Math.PI * 2;
    const distance = Math.random() * maxOffset;

    return {
      x: Math.cos(angle) * distance,
      y: Math.sin(angle) * distance
    };
  }

  /**
   * Calculate distance between two points
   */
  private calculateDistance(a: Vector2D, b: Vector2D): number {
    return Math.sqrt((a.x - b.x) ** 2 + (a.y - b.y) ** 2);
  }

  /**
   * Get fallback spawn positions if no spawn points defined
   */
  private getFallbackSpawns(players: Player[], team: 'ct' | 't'): Map<string, Vector2D> {
    const allocations = new Map<string, Vector2D>();
    const baseX = team === 'ct' ? 256 : 1792;
    const baseY = team === 'ct' ? 256 : 1792;
    const spacing = 64;

    players.forEach((player, index) => {
      const row = Math.floor(index / 5);
      const col = index % 5;

      allocations.set(player.id, {
        x: baseX + col * spacing,
        y: baseY + row * spacing
      });
    });

    return allocations;
  }

  /**
   * Find safe spawn position away from enemies
   * Used for mid-round spawns (if needed)
   */
  findSafeSpawn(
    team: 'ct' | 't',
    enemyPositions: Vector2D[],
    minDistanceFromEnemies: number = 500
  ): Vector2D | null {
    const spawnPoints = this.mapSystem.getSpawnPoints(team);

    if (spawnPoints.length === 0) return null;

    // Find spawn point farthest from enemies
    let bestSpawn: SpawnPoint | null = null;
    let maxMinDistance = 0;

    for (const spawn of spawnPoints) {
      let minDistanceToEnemy = Infinity;

      for (const enemyPos of enemyPositions) {
        const distance = this.calculateDistance(spawn.position, enemyPos);
        minDistanceToEnemy = Math.min(minDistanceToEnemy, distance);
      }

      if (minDistanceToEnemy > maxMinDistance) {
        maxMinDistance = minDistanceToEnemy;
        bestSpawn = spawn;
      }
    }

    if (!bestSpawn || maxMinDistance < minDistanceFromEnemies) {
      console.warn(`⚠️ No safe spawn found for team ${team}`);
      return bestSpawn?.position || null;
    }

    return bestSpawn.position;
  }

  /**
   * Check if position is safe to spawn (not too close to enemies)
   */
  isSpawnSafe(
    position: Vector2D,
    enemyPositions: Vector2D[],
    minDistance: number = 300
  ): boolean {
    for (const enemyPos of enemyPositions) {
      const distance = this.calculateDistance(position, enemyPos);
      if (distance < minDistance) {
        return false;
      }
    }
    return true;
  }

  /**
   * Reset spawn system for new round
   */
  reset(): void {
    this.usedSpawnPoints.clear();
    // Keep spawn history to avoid same spawn every round
    console.log('🎯 SpawnSystem reset');
  }

  /**
   * Clear spawn history (for new match)
   */
  clearHistory(): void {
    this.spawnHistory.clear();
    console.log('🎯 SpawnSystem history cleared');
  }

  /**
   * Get statistics for debugging
   */
  getStats(): {
    totalSpawnPoints: { ct: number; t: number };
    usedSpawnPoints: number;
    historySize: number;
  } {
    return {
      totalSpawnPoints: {
        ct: this.mapSystem.getSpawnPoints('ct').length,
        t: this.mapSystem.getSpawnPoints('t').length
      },
      usedSpawnPoints: this.usedSpawnPoints.size,
      historySize: this.spawnHistory.size
    };
  }
}