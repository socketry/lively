/**
 * VisionSystem - Unified system for line-of-sight checks
 * Integrates wall occlusion and smoke blocking for comprehensive vision detection
 */

import { Vector2D } from '../physics/PhysicsEngine';
import { MapSystem } from '../maps/MapSystem';
import { GrenadeSystem } from './GrenadeSystem';

export interface VisionCheckResult {
  canSee: boolean;
  blockedByWall: boolean;
  blockedBySmoke: boolean;
  smokeDensity: number; // 0-1, amount of smoke obscuring vision
  distance: number;
}

export interface VisionConfig {
  maxDistance: number; // Maximum vision range
  smokeBlocksVision: boolean; // Whether smoke blocks vision completely
  partialSmokeVision: boolean; // Whether to allow partial vision through light smoke
  minSmokeDensityToBlock: number; // Minimum smoke density to block (0.3 default)
}

export class VisionSystem {
  private mapSystem: MapSystem;
  private grenadeSystem: GrenadeSystem;
  private config: VisionConfig;

  constructor(mapSystem: MapSystem, grenadeSystem: GrenadeSystem, config?: Partial<VisionConfig>) {
    this.mapSystem = mapSystem;
    this.grenadeSystem = grenadeSystem;

    // Default configuration
    this.config = {
      maxDistance: 2000,
      smokeBlocksVision: true,
      partialSmokeVision: true,
      minSmokeDensityToBlock: 0.3,
      ...config
    };
  }

  /**
   * Comprehensive line of sight check
   * Checks both wall occlusion and smoke blocking
   */
  checkLineOfSight(from: Vector2D, to: Vector2D): VisionCheckResult {
    const dx = to.x - from.x;
    const dy = to.y - from.y;
    const distance = Math.sqrt(dx * dx + dy * dy);

    // Check distance limit
    if (distance > this.config.maxDistance) {
      return {
        canSee: false,
        blockedByWall: false,
        blockedBySmoke: false,
        smokeDensity: 0,
        distance
      };
    }

    // Check wall occlusion using MapSystem
    const blockedByWall = !this.mapSystem.checkLineOfSight(from, to);

    // Early exit if blocked by wall
    if (blockedByWall) {
      return {
        canSee: false,
        blockedByWall: true,
        blockedBySmoke: false,
        smokeDensity: 0,
        distance
      };
    }

    // Check smoke blocking using GrenadeSystem
    let blockedBySmoke = false;
    let smokeDensity = 0;

    if (this.config.smokeBlocksVision) {
      // Get maximum smoke density along the ray
      smokeDensity = this.getMaxSmokeDensityAlongRay(from, to);

      // Determine if smoke blocks vision
      if (this.config.partialSmokeVision) {
        // Only block if smoke is dense enough
        blockedBySmoke = smokeDensity >= this.config.minSmokeDensityToBlock;
      } else {
        // Any smoke blocks vision completely
        blockedBySmoke = smokeDensity > 0;
      }
    }

    return {
      canSee: !blockedByWall && !blockedBySmoke,
      blockedByWall,
      blockedBySmoke,
      smokeDensity,
      distance
    };
  }

  /**
   * Quick check - just returns boolean (optimized)
   */
  canSee(from: Vector2D, to: Vector2D): boolean {
    const dx = to.x - from.x;
    const dy = to.y - from.y;
    const distance = Math.sqrt(dx * dx + dy * dy);

    // Quick distance check
    if (distance > this.config.maxDistance) return false;

    // Quick wall check
    if (!this.mapSystem.checkLineOfSight(from, to)) return false;

    // Quick smoke check
    if (this.config.smokeBlocksVision) {
      if (this.grenadeSystem.isSightBlockedBySmoke(from, to)) {
        return false;
      }
    }

    return true;
  }

  /**
   * Get maximum smoke density along a ray
   * Used for partial vision reduction
   */
  private getMaxSmokeDensityAlongRay(from: Vector2D, to: Vector2D): number {
    const dx = to.x - from.x;
    const dy = to.y - from.y;
    const distance = Math.sqrt(dx * dx + dy * dy);

    // Sample points along the ray
    const sampleInterval = 20; // Sample every 20 units
    const sampleCount = Math.ceil(distance / sampleInterval);
    let maxDensity = 0;

    for (let i = 0; i <= sampleCount; i++) {
      const t = i / sampleCount;
      const samplePoint: Vector2D = {
        x: from.x + dx * t,
        y: from.y + dy * t
      };

      const density = this.grenadeSystem.getSmokeDensityAt(samplePoint);
      maxDensity = Math.max(maxDensity, density);

      // Early exit if we found blocking smoke
      if (maxDensity >= this.config.minSmokeDensityToBlock) {
        return maxDensity;
      }
    }

    return maxDensity;
  }

  /**
   * Check if target is visible within an angle cone
   * Used for Bot AI field of view
   */
  isInViewCone(
    observerPos: Vector2D,
    observerAngle: number,
    targetPos: Vector2D,
    viewAngle: number = Math.PI / 3 // 60 degrees default
  ): boolean {
    // Calculate angle to target
    const dx = targetPos.x - observerPos.x;
    const dy = targetPos.y - observerPos.y;
    const angleToTarget = Math.atan2(dy, dx);

    // Normalize angles to -PI to PI
    const normalizeAngle = (angle: number) => {
      while (angle > Math.PI) angle -= Math.PI * 2;
      while (angle < -Math.PI) angle += Math.PI * 2;
      return angle;
    };

    const normalizedObserverAngle = normalizeAngle(observerAngle);
    const normalizedTargetAngle = normalizeAngle(angleToTarget);
    const angleDiff = Math.abs(normalizedTargetAngle - normalizedObserverAngle);

    // Check if within view cone
    return angleDiff <= viewAngle / 2;
  }

  /**
   * Get visibility percentage (0-1) accounting for smoke density
   * Used for AI accuracy reduction in smoke
   */
  getVisibilityFactor(from: Vector2D, to: Vector2D): number {
    const result = this.checkLineOfSight(from, to);

    if (!result.canSee) return 0;

    // Reduce visibility based on smoke density
    return 1 - result.smokeDensity * 0.8; // Max 80% reduction from smoke
  }

  /**
   * Find all visible targets from a position
   * Used for Bot AI target acquisition
   */
  findVisibleTargets<T extends { position: Vector2D; isAlive?: boolean }>(
    observerPos: Vector2D,
    observerAngle: number,
    targets: T[],
    viewAngle?: number
  ): T[] {
    return targets.filter(target => {
      // Skip dead targets if they have isAlive property
      if ('isAlive' in target && !target.isAlive) return false;

      // Check view cone
      if (!this.isInViewCone(observerPos, observerAngle, target.position, viewAngle)) {
        return false;
      }

      // Check line of sight
      return this.canSee(observerPos, target.position);
    });
  }

  /**
   * Update configuration
   */
  updateConfig(config: Partial<VisionConfig>): void {
    this.config = { ...this.config, ...config };
  }

  /**
   * Get current configuration
   */
  getConfig(): VisionConfig {
    return { ...this.config };
  }
}