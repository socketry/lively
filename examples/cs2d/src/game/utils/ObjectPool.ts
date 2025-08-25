/**
 * Generic Object Pool for Performance Optimization
 * Reduces garbage collection pressure by reusing objects
 */

export class ObjectPool<T> {
  private pool: T[] = [];
  private activeObjects: Set<T> = new Set();
  private createFn: () => T;
  private resetFn: (obj: T) => void;
  private maxSize: number;
  
  // Performance metrics
  private stats = {
    created: 0,
    reused: 0,
    released: 0,
    currentActive: 0,
    currentPooled: 0,
    peakActive: 0
  };
  
  constructor(
    createFn: () => T,
    resetFn: (obj: T) => void,
    initialSize: number = 100,
    maxSize: number = 1000
  ) {
    this.createFn = createFn;
    this.resetFn = resetFn;
    this.maxSize = maxSize;
    
    // Pre-allocate pool for better initial performance
    console.log(`🏊 Creating object pool with initial size: ${initialSize}`);
    for (let i = 0; i < initialSize; i++) {
      this.pool.push(createFn());
      this.stats.created++;
    }
    
    this.stats.currentPooled = initialSize;
  }
  
  /**
   * Acquire an object from the pool
   * O(1) operation in most cases
   */
  acquire(): T {
    let obj: T;
    
    if (this.pool.length > 0) {
      // Reuse existing object - O(1)
      obj = this.pool.pop()!;
      this.stats.reused++;
      this.stats.currentPooled--;
    } else {
      // Create new object if pool is empty
      obj = this.createFn();
      this.stats.created++;
      
      if (this.stats.created > this.maxSize) {
        console.warn(`⚠️ Object pool exceeded max size: ${this.maxSize}`);
      }
    }
    
    this.activeObjects.add(obj);
    this.stats.currentActive++;
    
    if (this.stats.currentActive > this.stats.peakActive) {
      this.stats.peakActive = this.stats.currentActive;
    }
    
    return obj;
  }
  
  /**
   * Release an object back to the pool
   * O(1) operation
   */
  release(obj: T): void {
    if (!this.activeObjects.has(obj)) {
      console.warn('⚠️ Attempting to release object not from this pool');
      return;
    }
    
    this.resetFn(obj);
    this.activeObjects.delete(obj);
    this.stats.currentActive--;
    
    // Only return to pool if under max size
    if (this.pool.length < this.maxSize) {
      this.pool.push(obj);
      this.stats.currentPooled++;
    }
    
    this.stats.released++;
  }
  
  /**
   * Release all active objects back to the pool
   */
  releaseAll(): void {
    this.activeObjects.forEach(obj => {
      this.resetFn(obj);
      if (this.pool.length < this.maxSize) {
        this.pool.push(obj);
      }
    });
    
    this.stats.currentPooled = this.pool.length;
    this.stats.currentActive = 0;
    this.activeObjects.clear();
  }
  
  /**
   * Clear the pool completely
   */
  clear(): void {
    this.pool = [];
    this.activeObjects.clear();
    this.stats.currentActive = 0;
    this.stats.currentPooled = 0;
  }
  
  /**
   * Pre-warm the pool to a specific size
   */
  preWarm(size: number): void {
    const toCreate = Math.min(size - this.pool.length, this.maxSize - this.stats.created);
    
    for (let i = 0; i < toCreate; i++) {
      this.pool.push(this.createFn());
      this.stats.created++;
    }
    
    this.stats.currentPooled = this.pool.length;
    console.log(`🔥 Pre-warmed pool to size: ${this.pool.length}`);
  }
  
  /**
   * Get pool statistics for monitoring
   */
  getStats(): Readonly<typeof this.stats> {
    return { ...this.stats };
  }
  
  /**
   * Get efficiency metrics
   */
  getEfficiency(): {
    reuseRate: number;
    utilizationRate: number;
    poolEfficiency: number;
  } {
    const total = this.stats.reused + (this.stats.created - this.pool.length);
    const reuseRate = total > 0 ? this.stats.reused / total : 0;
    const utilizationRate = this.stats.currentActive / Math.max(1, this.stats.peakActive);
    const poolEfficiency = this.stats.reused / Math.max(1, this.stats.created);
    
    return {
      reuseRate: Math.round(reuseRate * 100),
      utilizationRate: Math.round(utilizationRate * 100),
      poolEfficiency: Math.round(poolEfficiency * 100)
    };
  }
}

// Specialized pools for game objects

/**
 * Particle pool with optimized reset function
 */
export interface PooledParticle {
  x: number;
  y: number;
  vx: number;
  vy: number;
  life: number;
  maxLife: number;
  size: number;
  color: string;
  opacity: number;
  active: boolean;
}

export const createParticlePool = (initialSize: number = 500): ObjectPool<PooledParticle> => {
  return new ObjectPool<PooledParticle>(
    () => ({
      x: 0,
      y: 0,
      vx: 0,
      vy: 0,
      life: 0,
      maxLife: 0,
      size: 0,
      color: '',
      opacity: 0,
      active: false
    }),
    (particle) => {
      particle.x = 0;
      particle.y = 0;
      particle.vx = 0;
      particle.vy = 0;
      particle.life = 0;
      particle.maxLife = 0;
      particle.size = 0;
      particle.opacity = 0;
      particle.active = false;
      // Don't reset color to avoid string allocation
    },
    initialSize,
    2000 // Max 2000 particles
  );
};

/**
 * Bullet pool with optimized reset
 */
export interface PooledBullet {
  id: string;
  position: { x: number; y: number };
  velocity: { x: number; y: number };
  damage: number;
  owner: string;
  weapon: string;
  active: boolean;
  penetration: number;
  distance: number;
}

export const createBulletPool = (initialSize: number = 100): ObjectPool<PooledBullet> => {
  return new ObjectPool<PooledBullet>(
    () => ({
      id: '',
      position: { x: 0, y: 0 },
      velocity: { x: 0, y: 0 },
      damage: 0,
      owner: '',
      weapon: '',
      active: false,
      penetration: 0,
      distance: 0
    }),
    (bullet) => {
      bullet.position.x = 0;
      bullet.position.y = 0;
      bullet.velocity.x = 0;
      bullet.velocity.y = 0;
      bullet.damage = 0;
      bullet.penetration = 0;
      bullet.distance = 0;
      bullet.active = false;
      // Keep strings to avoid reallocation
    },
    initialSize,
    500 // Max 500 bullets
  );
};

/**
 * Vector2D pool for temporary calculations
 */
export interface PooledVector2D {
  x: number;
  y: number;
}

export const createVectorPool = (initialSize: number = 200): ObjectPool<PooledVector2D> => {
  return new ObjectPool<PooledVector2D>(
    () => ({ x: 0, y: 0 }),
    (vec) => {
      vec.x = 0;
      vec.y = 0;
    },
    initialSize,
    1000
  );
};

/**
 * Canvas pool for sprite rendering
 */
export interface PooledCanvas {
  canvas: HTMLCanvasElement;
  ctx: CanvasRenderingContext2D;
  width: number;
  height: number;
}

export const createCanvasPool = (
  defaultWidth: number = 64,
  defaultHeight: number = 64,
  initialSize: number = 20
): ObjectPool<PooledCanvas> => {
  return new ObjectPool<PooledCanvas>(
    () => {
      const canvas = document.createElement('canvas');
      canvas.width = defaultWidth;
      canvas.height = defaultHeight;
      const ctx = canvas.getContext('2d', {
        alpha: true,
        desynchronized: true,
        willReadFrequently: false
      })!;
      
      return {
        canvas,
        ctx,
        width: defaultWidth,
        height: defaultHeight
      };
    },
    (pooledCanvas) => {
      // Clear canvas
      pooledCanvas.ctx.clearRect(0, 0, pooledCanvas.width, pooledCanvas.height);
      // Reset transform
      pooledCanvas.ctx.setTransform(1, 0, 0, 1, 0, 0);
      // Reset styles
      pooledCanvas.ctx.globalAlpha = 1;
      pooledCanvas.ctx.globalCompositeOperation = 'source-over';
    },
    initialSize,
    50 // Max 50 canvases
  );
};