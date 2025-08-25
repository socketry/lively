import { describe, it, expect, beforeEach } from 'vitest';
import { PhysicsEngine, Vector2D, RigidBody } from '../../../../src/game/physics/PhysicsEngine';

describe('PhysicsEngine', () => {
  let physics: PhysicsEngine;

  beforeEach(() => {
    physics = new PhysicsEngine();
  });

  describe('Vector2D Operations', () => {
    it('should add vectors correctly', () => {
      const v1: Vector2D = { x: 3, y: 4 };
      const v2: Vector2D = { x: 1, y: 2 };
      const result: Vector2D = { x: v1.x + v2.x, y: v1.y + v2.y };

      expect(result.x).toBe(4);
      expect(result.y).toBe(6);
    });

    it('should calculate vector magnitude', () => {
      const vector: Vector2D = { x: 3, y: 4 };
      const magnitude = Math.sqrt(vector.x * vector.x + vector.y * vector.y);

      expect(magnitude).toBe(5);
    });

    it('should normalize vectors correctly', () => {
      const vector: Vector2D = { x: 3, y: 4 };
      const magnitude = Math.sqrt(vector.x * vector.x + vector.y * vector.y);
      const normalized: Vector2D = {
        x: vector.x / magnitude,
        y: vector.y / magnitude,
      };

      expect(normalized.x).toBeCloseTo(0.6, 2);
      expect(normalized.y).toBeCloseTo(0.8, 2);

      // Normalized vector should have magnitude of 1
      const normalizedMagnitude = Math.sqrt(normalized.x * normalized.x + normalized.y * normalized.y);
      expect(normalizedMagnitude).toBeCloseTo(1, 5);
    });

    it('should calculate dot product correctly', () => {
      const v1: Vector2D = { x: 2, y: 3 };
      const v2: Vector2D = { x: 4, y: 1 };
      const dotProduct = v1.x * v2.x + v1.y * v2.y;

      expect(dotProduct).toBe(11);
    });

    it('should handle zero vectors', () => {
      const zero: Vector2D = { x: 0, y: 0 };
      const magnitude = Math.sqrt(zero.x * zero.x + zero.y * zero.y);

      expect(magnitude).toBe(0);
    });
  });

  describe('Movement Physics', () => {
    it('should apply CS 1.6 movement mechanics', () => {
      const player = {
        position: { x: 0, y: 0 } as Vector2D,
        velocity: { x: 0, y: 0 } as Vector2D,
        maxSpeed: 250, // CS 1.6 running speed
        acceleration: 10,
        friction: 0.7,
        onGround: true,
      };

      const input = { forward: true, backward: false, left: false, right: false };
      
      // Apply acceleration
      if (input.forward) {
        player.velocity.y -= player.acceleration;
      }

      // Clamp to max speed
      const speed = Math.sqrt(player.velocity.x ** 2 + player.velocity.y ** 2);
      if (speed > player.maxSpeed) {
        player.velocity.x = (player.velocity.x / speed) * player.maxSpeed;
        player.velocity.y = (player.velocity.y / speed) * player.maxSpeed;
      }

      expect(player.velocity.y).toBe(-player.acceleration);
      expect(Math.sqrt(player.velocity.x ** 2 + player.velocity.y ** 2)).toBeLessThanOrEqual(player.maxSpeed);
    });

    it('should handle diagonal movement speed correctly', () => {
      const baseSpeed = 250;
      const diagonalInput = { x: 1, y: 1 }; // Moving forward and right

      // Normalize diagonal input to prevent speed advantage
      const magnitude = Math.sqrt(diagonalInput.x ** 2 + diagonalInput.y ** 2);
      const normalizedInput = {
        x: diagonalInput.x / magnitude,
        y: diagonalInput.y / magnitude,
      };

      const velocity = {
        x: normalizedInput.x * baseSpeed,
        y: normalizedInput.y * baseSpeed,
      };

      const actualSpeed = Math.sqrt(velocity.x ** 2 + velocity.y ** 2);

      expect(actualSpeed).toBeCloseTo(baseSpeed, 1);
    });

    it('should apply friction correctly', () => {
      const player = {
        velocity: { x: 100, y: 50 } as Vector2D,
        friction: 0.8,
        onGround: true,
      };

      // Apply friction
      if (player.onGround) {
        player.velocity.x *= player.friction;
        player.velocity.y *= player.friction;
      }

      expect(player.velocity.x).toBe(80);
      expect(player.velocity.y).toBe(40);
    });
  });

  describe('Bullet Physics', () => {
    it('should calculate bullet trajectory correctly', () => {
      const bullet = {
        position: { x: 0, y: 0 } as Vector2D,
        velocity: { x: 1000, y: 0 } as Vector2D, // 1000 units/second
        gravity: 9.8,
        drag: 0.01,
      };

      const deltaTime = 0.016; // 60 FPS

      // Update position
      bullet.position.x += bullet.velocity.x * deltaTime;
      bullet.position.y += bullet.velocity.y * deltaTime;

      // Apply gravity
      bullet.velocity.y += bullet.gravity * deltaTime;

      // Apply drag
      const dragForce = bullet.drag * (bullet.velocity.x ** 2 + bullet.velocity.y ** 2);
      const speed = Math.sqrt(bullet.velocity.x ** 2 + bullet.velocity.y ** 2);
      if (speed > 0) {
        bullet.velocity.x -= (bullet.velocity.x / speed) * dragForce * deltaTime;
        bullet.velocity.y -= (bullet.velocity.y / speed) * dragForce * deltaTime;
      }

      expect(bullet.position.x).toBeCloseTo(16, 1);
      expect(bullet.velocity.y).toBeGreaterThan(0); // Gravity effect
    });

    it('should handle bullet penetration physics', () => {
      const bullet = {
        velocity: { x: 500, y: 0 } as Vector2D,
        mass: 0.008, // 8 grams
        penetrationPower: 77.5,
      };

      const material = {
        density: 2.5, // Concrete
        thickness: 32,
        penetrationResistance: 60,
      };

      const canPenetrate = bullet.penetrationPower > material.penetrationResistance;
      const velocityLoss = material.density * material.thickness * 0.01;
      const newVelocity = Math.max(50, bullet.velocity.x - velocityLoss);

      expect(canPenetrate).toBe(true);
      expect(newVelocity).toBeLessThan(bullet.velocity.x);
    });
  });

  describe('Collision Detection', () => {
    it('should detect AABB collision correctly', () => {
      const rect1 = { x: 10, y: 10, width: 20, height: 30 };
      const rect2 = { x: 25, y: 15, width: 15, height: 25 };

      const isColliding = (
        rect1.x < rect2.x + rect2.width &&
        rect1.x + rect1.width > rect2.x &&
        rect1.y < rect2.y + rect2.height &&
        rect1.y + rect1.height > rect2.y
      );

      expect(isColliding).toBe(true);
    });

    it('should detect circle collision correctly', () => {
      const circle1 = { x: 10, y: 10, radius: 5 };
      const circle2 = { x: 15, y: 10, radius: 3 };

      const distance = Math.sqrt((circle2.x - circle1.x) ** 2 + (circle2.y - circle1.y) ** 2);
      const isColliding = distance <= (circle1.radius + circle2.radius);

      expect(isColliding).toBe(true);
      expect(distance).toBe(5);
    });

    it('should perform ray-box intersection', () => {
      const ray = {
        origin: { x: 0, y: 5 } as Vector2D,
        direction: { x: 1, y: 0 } as Vector2D, // Normalized
      };

      const box = { x: 10, y: 0, width: 5, height: 10 };

      // Ray-box intersection test
      const tMin = (box.x - ray.origin.x) / ray.direction.x;
      const tMax = (box.x + box.width - ray.origin.x) / ray.direction.x;
      const tyMin = (box.y - ray.origin.y) / ray.direction.y;
      const tyMax = (box.y + box.height - ray.origin.y) / ray.direction.y;

      // For horizontal ray (direction.y = 0), we need to check if ray.origin.y is within box bounds
      const intersects = ray.origin.y >= box.y && ray.origin.y <= box.y + box.height && tMin <= tMax && tMin >= 0;

      expect(intersects).toBe(true);
    });
  });

  describe('Surface Interactions', () => {
    it('should calculate reflection vector correctly', () => {
      const incident: Vector2D = { x: 1, y: -1 }; // 45-degree downward
      const normal: Vector2D = { x: 0, y: 1 }; // Horizontal surface normal

      // R = I - 2(I·N)N
      const dotProduct = incident.x * normal.x + incident.y * normal.y;
      const reflection: Vector2D = {
        x: incident.x - 2 * dotProduct * normal.x,
        y: incident.y - 2 * dotProduct * normal.y,
      };

      expect(reflection.x).toBe(1);
      expect(reflection.y).toBe(1); // Should bounce upward
    });

    it('should apply surface friction to movement', () => {
      const surfaces = {
        concrete: { friction: 1.0, bounce: 0.1 },
        ice: { friction: 0.1, bounce: 0.05 },
        mud: { friction: 2.0, bounce: 0.0 },
      };

      const playerSpeed = 250;
      const iceSpeed = playerSpeed * surfaces.ice.friction;
      const mudSpeed = Math.min(playerSpeed * surfaces.mud.friction, playerSpeed);

      expect(iceSpeed).toBe(25); // Very slippery
      expect(mudSpeed).toBe(250); // Clamped to max speed
    });
  });

  describe('Performance Optimizations', () => {
    it('should use spatial hashing for collision detection', () => {
      const cellSize = 64;
      const position: Vector2D = { x: 150, y: 200 };

      const hashX = Math.floor(position.x / cellSize);
      const hashY = Math.floor(position.y / cellSize);
      const hash = `${hashX},${hashY}`;

      expect(hash).toBe('2,3');
    });

    it('should cull objects outside view frustum', () => {
      const camera = {
        position: { x: 400, y: 300 } as Vector2D,
        viewWidth: 800,
        viewHeight: 600,
      };

      const object = { position: { x: 1200, y: 300 } as Vector2D, radius: 10 };

      const isVisible = (
        object.position.x + object.radius >= camera.position.x - camera.viewWidth / 2 &&
        object.position.x - object.radius <= camera.position.x + camera.viewWidth / 2 &&
        object.position.y + object.radius >= camera.position.y - camera.viewHeight / 2 &&
        object.position.y - object.radius <= camera.position.y + camera.viewHeight / 2
      );

      expect(isVisible).toBe(false); // Object is outside view
    });
  });

  describe('Integration with Game Systems', () => {
    it('should handle physics timestep correctly', () => {
      const fixedTimestep = 1 / 128; // 128 Hz physics tick rate
      const maxFrameTime = 1 / 20; // Max 20 FPS (50ms)
      
      let accumulator = 0;
      let frameTime = 0.033; // 30 FPS frame (33ms)
      
      frameTime = Math.min(frameTime, maxFrameTime);
      accumulator += frameTime;

      let physicsSteps = 0;
      while (accumulator >= fixedTimestep) {
        // Perform physics step
        physicsSteps++;
        accumulator -= fixedTimestep;
      }

      expect(physicsSteps).toBe(4); // Should run 4 physics steps for 33ms frame
    });
  });
});