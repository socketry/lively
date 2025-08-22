export interface Vector2D {
  x: number;
  y: number;
}

export interface Rectangle {
  x: number;
  y: number;
  width: number;
  height: number;
}

export interface Circle {
  x: number;
  y: number;
  radius: number;
}

export interface RigidBody {
  id: string;
  position: Vector2D;
  velocity: Vector2D;
  acceleration: Vector2D;
  mass: number;
  friction: number;
  restitution: number;
  isStatic: boolean;
  collider: Circle | Rectangle;
  type: 'circle' | 'rectangle';
}

export class PhysicsEngine {
  private bodies: Map<string, RigidBody> = new Map();
  private gravity: Vector2D = { x: 0, y: 0 };
  private spatialGrid: Map<string, Set<string>> = new Map();
  private gridSize = 100;
  
  constructor() {
    this.initSpatialGrid();
  }
  
  private initSpatialGrid(): void {
    this.spatialGrid.clear();
  }
  
  addBody(body: RigidBody): void {
    this.bodies.set(body.id, body);
    this.updateSpatialGrid(body);
  }
  
  removeBody(id: string): void {
    this.bodies.delete(id);
  }
  
  private updateSpatialGrid(body: RigidBody): void {
    const gridX = Math.floor(body.position.x / this.gridSize);
    const gridY = Math.floor(body.position.y / this.gridSize);
    const key = `${gridX},${gridY}`;
    
    if (!this.spatialGrid.has(key)) {
      this.spatialGrid.set(key, new Set());
    }
    this.spatialGrid.get(key)?.add(body.id);
  }
  
  update(deltaTime: number): void {
    this.bodies.forEach(body => {
      if (!body.isStatic) {
        body.velocity.x += (body.acceleration.x + this.gravity.x) * deltaTime;
        body.velocity.y += (body.acceleration.y + this.gravity.y) * deltaTime;
        
        body.velocity.x *= (1 - body.friction * deltaTime);
        body.velocity.y *= (1 - body.friction * deltaTime);
        
        body.position.x += body.velocity.x * deltaTime;
        body.position.y += body.velocity.y * deltaTime;
        
        this.updateSpatialGrid(body);
      }
    });
    
    this.detectCollisions();
  }
  
  private detectCollisions(): void {
    const checked = new Set<string>();
    
    this.bodies.forEach((bodyA) => {
      const nearbyBodies = this.getNearbyBodies(bodyA);
      
      nearbyBodies.forEach(bodyBId => {
        const pairKey = [bodyA.id, bodyBId].sort().join('-');
        if (checked.has(pairKey)) return;
        checked.add(pairKey);
        
        const bodyB = this.bodies.get(bodyBId);
        if (!bodyB || bodyA.id === bodyB.id) return;
        
        if (this.checkCollision(bodyA, bodyB)) {
          this.resolveCollision(bodyA, bodyB);
        }
      });
    });
  }
  
  private getNearbyBodies(body: RigidBody): Set<string> {
    const nearby = new Set<string>();
    const gridX = Math.floor(body.position.x / this.gridSize);
    const gridY = Math.floor(body.position.y / this.gridSize);
    
    for (let dx = -1; dx <= 1; dx++) {
      for (let dy = -1; dy <= 1; dy++) {
        const key = `${gridX + dx},${gridY + dy}`;
        const cell = this.spatialGrid.get(key);
        if (cell) {
          cell.forEach(id => nearby.add(id));
        }
      }
    }
    
    return nearby;
  }
  
  checkCollision(bodyA: RigidBody, bodyB: RigidBody): boolean {
    if (bodyA.type === 'circle' && bodyB.type === 'circle') {
      return this.circleCircleCollision(
        bodyA.collider as Circle,
        bodyB.collider as Circle
      );
    } else if (bodyA.type === 'rectangle' && bodyB.type === 'rectangle') {
      return this.rectRectCollision(
        bodyA.collider as Rectangle,
        bodyB.collider as Rectangle
      );
    } else {
      const circle = bodyA.type === 'circle' ? bodyA.collider as Circle : bodyB.collider as Circle;
      const rect = bodyA.type === 'rectangle' ? bodyA.collider as Rectangle : bodyB.collider as Rectangle;
      return this.circleRectCollision(circle, rect);
    }
  }
  
  private circleCircleCollision(a: Circle, b: Circle): boolean {
    const dx = b.x - a.x;
    const dy = b.y - a.y;
    const distance = Math.sqrt(dx * dx + dy * dy);
    return distance < a.radius + b.radius;
  }
  
  private rectRectCollision(a: Rectangle, b: Rectangle): boolean {
    return a.x < b.x + b.width &&
           a.x + a.width > b.x &&
           a.y < b.y + b.height &&
           a.y + a.height > b.y;
  }
  
  private circleRectCollision(circle: Circle, rect: Rectangle): boolean {
    const closestX = Math.max(rect.x, Math.min(circle.x, rect.x + rect.width));
    const closestY = Math.max(rect.y, Math.min(circle.y, rect.y + rect.height));
    
    const dx = circle.x - closestX;
    const dy = circle.y - closestY;
    
    return (dx * dx + dy * dy) < (circle.radius * circle.radius);
  }
  
  private resolveCollision(bodyA: RigidBody, bodyB: RigidBody): void {
    const dx = bodyB.position.x - bodyA.position.x;
    const dy = bodyB.position.y - bodyA.position.y;
    const distance = Math.sqrt(dx * dx + dy * dy);
    
    if (distance === 0) return;
    
    const nx = dx / distance;
    const ny = dy / distance;
    
    const relativeVelocity = {
      x: bodyB.velocity.x - bodyA.velocity.x,
      y: bodyB.velocity.y - bodyA.velocity.y
    };
    
    const velocityAlongNormal = relativeVelocity.x * nx + relativeVelocity.y * ny;
    
    if (velocityAlongNormal > 0) return;
    
    const restitution = Math.min(bodyA.restitution, bodyB.restitution);
    const impulseScalar = -(1 + restitution) * velocityAlongNormal;
    
    const impulse = impulseScalar / (1 / bodyA.mass + 1 / bodyB.mass);
    
    if (!bodyA.isStatic) {
      bodyA.velocity.x -= (impulse / bodyA.mass) * nx;
      bodyA.velocity.y -= (impulse / bodyA.mass) * ny;
    }
    
    if (!bodyB.isStatic) {
      bodyB.velocity.x += (impulse / bodyB.mass) * nx;
      bodyB.velocity.y += (impulse / bodyB.mass) * ny;
    }
  }
  
  raycast(origin: Vector2D, direction: Vector2D, maxDistance: number): RigidBody | null {
    let closestBody: RigidBody | null = null;
    let closestDistance = maxDistance;
    
    const normalizedDir = this.normalize(direction);
    
    this.bodies.forEach(body => {
      const distance = this.rayIntersectsBody(origin, normalizedDir, body);
      if (distance !== null && distance < closestDistance) {
        closestDistance = distance;
        closestBody = body;
      }
    });
    
    return closestBody;
  }
  
  private rayIntersectsBody(origin: Vector2D, direction: Vector2D, body: RigidBody): number | null {
    if (body.type === 'circle') {
      return this.rayIntersectsCircle(origin, direction, body.collider as Circle);
    } else {
      return this.rayIntersectsRect(origin, direction, body.collider as Rectangle);
    }
  }
  
  private rayIntersectsCircle(origin: Vector2D, direction: Vector2D, circle: Circle): number | null {
    const toCircle = { x: circle.x - origin.x, y: circle.y - origin.y };
    const projection = toCircle.x * direction.x + toCircle.y * direction.y;
    
    if (projection < 0) return null;
    
    const closestPoint = {
      x: origin.x + direction.x * projection,
      y: origin.y + direction.y * projection
    };
    
    const distance = Math.sqrt(
      Math.pow(circle.x - closestPoint.x, 2) +
      Math.pow(circle.y - closestPoint.y, 2)
    );
    
    if (distance <= circle.radius) {
      return projection - Math.sqrt(circle.radius * circle.radius - distance * distance);
    }
    
    return null;
  }
  
  private rayIntersectsRect(origin: Vector2D, direction: Vector2D, rect: Rectangle): number | null {
    const invDir = { x: 1 / direction.x, y: 1 / direction.y };
    
    const t1 = (rect.x - origin.x) * invDir.x;
    const t2 = ((rect.x + rect.width) - origin.x) * invDir.x;
    const t3 = (rect.y - origin.y) * invDir.y;
    const t4 = ((rect.y + rect.height) - origin.y) * invDir.y;
    
    const tMin = Math.max(Math.min(t1, t2), Math.min(t3, t4));
    const tMax = Math.min(Math.max(t1, t2), Math.max(t3, t4));
    
    if (tMax < 0 || tMin > tMax) return null;
    
    return tMin < 0 ? tMax : tMin;
  }
  
  private normalize(vector: Vector2D): Vector2D {
    const magnitude = Math.sqrt(vector.x * vector.x + vector.y * vector.y);
    if (magnitude === 0) return { x: 0, y: 0 };
    return { x: vector.x / magnitude, y: vector.y / magnitude };
  }
  
  applyExplosionForce(center: Vector2D, radius: number, force: number): void {
    this.bodies.forEach(body => {
      if (body.isStatic) return;
      
      const dx = body.position.x - center.x;
      const dy = body.position.y - center.y;
      const distance = Math.sqrt(dx * dx + dy * dy);
      
      if (distance < radius && distance > 0) {
        const forceMagnitude = force * (1 - distance / radius);
        const forceX = (dx / distance) * forceMagnitude;
        const forceY = (dy / distance) * forceMagnitude;
        
        body.velocity.x += forceX / body.mass;
        body.velocity.y += forceY / body.mass;
      }
    });
  }
}