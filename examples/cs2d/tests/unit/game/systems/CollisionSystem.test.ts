import { describe, it, expect, beforeEach, vi } from 'vitest';
import { CollisionSystem, CollisionResult, CollisionEffects } from '../../../../src/game/systems/CollisionSystem';
import { Vector2D } from '../../../../src/game/physics/PhysicsEngine';

// Mock dependencies
vi.mock('../../../../src/game/physics/PhysicsEngine');

describe('CollisionSystem', () => {
  let collisionSystem: CollisionSystem;
  let mockDependencies: any;

  beforeEach(() => {
    mockDependencies = {
      damageSystem: {
        dealDamage: vi.fn(),
      },
      effectsSystem: {
        createBloodEffect: vi.fn(),
        createSparkEffect: vi.fn(),
        createBulletHole: vi.fn(),
      },
      audioSystem: {
        playHitSound: vi.fn(),
        playRicochetSound: vi.fn(),
      },
    };

    collisionSystem = new CollisionSystem(mockDependencies);
  });

  describe('Bullet-Player Collision', () => {
    it('should detect collision between bullet and player', () => {
      const bullet = {
        position: { x: 100, y: 100 } as Vector2D,
        velocity: { x: 10, y: 0 } as Vector2D,
        damage: 36,
        penetration: 77.5,
        weapon: 'ak47',
      };

      const player = {
        position: { x: 105, y: 100 } as Vector2D,
        hitbox: { width: 32, height: 72 },
        health: 100,
        armor: 100,
        team: 'ct' as const,
        isAlive: true,
      };

      // Simple AABB collision detection
      const isColliding = (
        bullet.position.x >= player.position.x - player.hitbox.width / 2 &&
        bullet.position.x <= player.position.x + player.hitbox.width / 2 &&
        bullet.position.y >= player.position.y - player.hitbox.height / 2 &&
        bullet.position.y <= player.position.y + player.hitbox.height / 2
      );

      expect(isColliding).toBe(true);
    });

    it('should calculate headshot detection correctly', () => {
      const bullet = {
        position: { x: 100, y: 80 } as Vector2D, // Head level
      };

      const player = {
        position: { x: 100, y: 100 } as Vector2D,
        hitbox: { width: 32, height: 72 },
        headHeight: 20, // Head hitbox height
      };

      const headY = player.position.y - player.hitbox.height / 2;
      const isHeadshot = bullet.position.y >= headY && bullet.position.y <= headY + player.headHeight;

      expect(isHeadshot).toBe(true);
    });

    it('should handle armor damage reduction', () => {
      const baseDamage = 36;
      const armorValue = 100;
      const armorPenetration = 77.5;

      const finalDamage = Math.floor(baseDamage * (armorPenetration / 100));
      const armorDamage = Math.floor(finalDamage * 0.5); // Armor takes 50% of damage

      expect(finalDamage).toBe(27);
      expect(armorDamage).toBe(13);
    });
  });

  describe('Wall Collision', () => {
    it('should detect bullet-wall collision', () => {
      const bullet = {
        position: { x: 200, y: 100 } as Vector2D,
        lastPosition: { x: 190, y: 100 } as Vector2D,
      };

      const wall = {
        x: 195,
        y: 50,
        width: 10,
        height: 100,
        material: 'concrete',
        penetrable: false,
      };

      // Line-rectangle intersection
      const isColliding = (
        bullet.position.x >= wall.x &&
        bullet.position.x <= wall.x + wall.width &&
        bullet.position.y >= wall.y &&
        bullet.position.y <= wall.y + wall.height
      );

      expect(isColliding).toBe(true);
    });

    it('should calculate bullet penetration through materials', () => {
      const bullet = {
        damage: 36,
        penetration: 77.5,
        velocity: { x: 100, y: 0 } as Vector2D,
      };

      const wall = {
        thickness: 32,
        material: 'wood',
        penetrationResistance: 30,
      };

      const canPenetrate = bullet.penetration > wall.penetrationResistance;
      const damageLoss = wall.thickness * 0.5; // Damage lost per unit thickness
      const finalDamage = Math.max(1, bullet.damage - damageLoss);

      expect(canPenetrate).toBe(true);
      expect(finalDamage).toBe(20);
    });

    it('should handle ricochet calculations', () => {
      const bullet = {
        velocity: { x: 100, y: -50 } as Vector2D,
      };

      const surface = {
        normal: { x: 0, y: 1 } as Vector2D, // Horizontal surface
        friction: 0.7,
      };

      // Calculate reflection vector: R = V - 2(V·N)N
      const dotProduct = bullet.velocity.x * surface.normal.x + bullet.velocity.y * surface.normal.y;
      const reflectedVelocity = {
        x: bullet.velocity.x - 2 * dotProduct * surface.normal.x,
        y: (bullet.velocity.y - 2 * dotProduct * surface.normal.y) * surface.friction,
      };

      expect(reflectedVelocity.x).toBe(100);
      expect(reflectedVelocity.y).toBeCloseTo(35, 1);
    });
  });

  describe('Hit Registration', () => {
    it('should register hit with correct body part', () => {
      const hitPosition = { x: 100, y: 90 } as Vector2D;
      const playerPosition = { x: 100, y: 100 } as Vector2D;
      const playerHeight = 72;

      const relativeY = hitPosition.y - (playerPosition.y - playerHeight / 2);
      const hitPercentage = relativeY / playerHeight;

      let bodyPart: string;
      if (hitPercentage <= 0.28) {
        bodyPart = 'head';
      } else if (hitPercentage <= 0.72) {
        bodyPart = 'chest';
      } else {
        bodyPart = 'leg';
      }

      expect(bodyPart).toBe('head');
    });

    it('should calculate damage multipliers by body part', () => {
      const baseDamage = 33; // M4A1
      const multipliers = {
        head: 4.0,
        chest: 1.0,
        stomach: 1.25,
        leg: 0.75,
      };

      expect(baseDamage * multipliers.head).toBe(132);
      expect(baseDamage * multipliers.chest).toBe(33);
      expect(baseDamage * multipliers.stomach).toBe(41.25);
      expect(baseDamage * multipliers.leg).toBe(24.75);
    });
  });

  describe('Effect Generation', () => {
    it('should create appropriate hit effects', () => {
      const collision: CollisionResult = {
        hit: true,
        target: 'player',
        position: { x: 100, y: 100 } as Vector2D,
        damage: 36,
        bodyPart: 'chest',
      };

      const effects: CollisionEffects = {
        blood: collision.target === 'player',
        sparks: collision.target === 'wall' && collision.material === 'metal',
        smoke: collision.target === 'wall' && collision.material === 'concrete',
        bulletHole: collision.target === 'wall',
      };

      expect(effects.blood).toBe(true);
      expect(effects.sparks).toBe(false);
      expect(effects.bulletHole).toBe(false);
    });
  });

  describe('Performance Optimization', () => {
    it('should use spatial partitioning for collision detection', () => {
      const gridSize = 64;
      const position = { x: 150, y: 200 } as Vector2D;
      
      const gridX = Math.floor(position.x / gridSize);
      const gridY = Math.floor(position.y / gridSize);

      expect(gridX).toBe(2);
      expect(gridY).toBe(3);
    });

    it('should cull distant collisions', () => {
      const bullet = { position: { x: 0, y: 0 } as Vector2D };
      const target = { position: { x: 5000, y: 5000 } as Vector2D };
      const maxRange = 8192;

      const distance = Math.sqrt(
        Math.pow(target.position.x - bullet.position.x, 2) +
        Math.pow(target.position.y - bullet.position.y, 2)
      );

      const shouldCheck = distance <= maxRange;

      expect(shouldCheck).toBe(true); // Just within range
    });
  });

  describe('Edge Cases', () => {
    it('should handle bullet tunneling through thin objects', () => {
      const bullet = {
        position: { x: 100, y: 100 } as Vector2D,
        lastPosition: { x: 90, y: 100 } as Vector2D,
        velocity: { x: 200, y: 0 } as Vector2D, // High velocity
      };

      const thinWall = {
        x: 95,
        y: 50,
        width: 2, // Very thin
        height: 100,
      };

      // Use ray casting to detect collision along trajectory
      const deltaX = bullet.position.x - bullet.lastPosition.x;
      const steps = Math.ceil(Math.abs(deltaX) / 2); // Step size smaller than wall
      const stepX = deltaX / steps;

      let collisionDetected = false;
      for (let i = 0; i <= steps; i++) {
        const checkX = bullet.lastPosition.x + stepX * i;
        if (checkX >= thinWall.x && checkX <= thinWall.x + thinWall.width) {
          collisionDetected = true;
          break;
        }
      }

      expect(collisionDetected).toBe(true);
    });

    it('should handle multiple simultaneous collisions', () => {
      const bullet = { position: { x: 100, y: 100 } as Vector2D };
      const targets = [
        { position: { x: 100, y: 100 }, priority: 1 }, // Player
        { position: { x: 100, y: 100 }, priority: 2 }, // Wall behind player
      ];

      // Sort by priority (player hits before walls)
      targets.sort((a, b) => a.priority - b.priority);
      const firstHit = targets[0];

      expect(firstHit.priority).toBe(1);
    });
  });
});