import { Vector2D } from '../physics/PhysicsEngine';
import { CS16AudioManager } from '../audio/CS16AudioManager';
import { Renderer, ParticleEffect } from '../graphics/Renderer';

export type GrenadeType = 'he' | 'flashbang' | 'smoke' | 'molotov' | 'incendiary';

export interface GrenadeStats {
  type: GrenadeType;
  damage: number;
  radius: number;
  fuseTime: number;
  effectDuration: number;
  bounceCount: number;
  bounceDamping: number;
  gravity: number;
  price: number;
  maxVelocity: number;
  soundId: string;
}

export interface ActiveGrenade {
  id: string;
  type: GrenadeType;
  position: Vector2D;
  velocity: Vector2D;
  owner: string;
  thrownTime: number;
  bounces: number;
  isExploded: boolean;
  fuseTime: number;
  trail: Vector2D[];
}

export interface GrenadeEffect {
  id: string;
  type: GrenadeType;
  position: Vector2D;
  startTime: number;
  duration: number;
  radius: number;
  intensity: number;
  owner: string;
}

export interface FlashEffect {
  playerId: string;
  intensity: number; // 0-1, 1 = fully blinded
  startTime: number;
  duration: number;
}

export interface SmokeCloud {
  id: string;
  position: Vector2D;
  radius: number;
  density: number;
  startTime: number;
  duration: number;
  particles: Vector2D[];
}

export interface FireArea {
  id: string;
  position: Vector2D;
  radius: number;
  damage: number;
  startTime: number;
  duration: number;
  spreadPoints: Vector2D[];
}

export class GrenadeSystem {
  private grenadeStats: Map<GrenadeType, GrenadeStats> = new Map();
  private activeGrenades: Map<string, ActiveGrenade> = new Map();
  private grenadeEffects: Map<string, GrenadeEffect> = new Map();
  private flashEffects: Map<string, FlashEffect> = new Map();
  private smokeClouds: Map<string, SmokeCloud> = new Map();
  private fireAreas: Map<string, FireArea> = new Map();
  
  private audio: CS16AudioManager;
  private renderer: Renderer;
  
  // Trajectory preview
  private trajectoryPoints: Vector2D[] = [];
  private isShowingTrajectory: boolean = false;
  
  constructor(audio: CS16AudioManager, renderer: Renderer) {
    this.audio = audio;
    this.renderer = renderer;
    this.initializeGrenadeStats();
  }
  
  private initializeGrenadeStats(): void {
    const stats: GrenadeStats[] = [
      {
        type: 'he',
        damage: 98, // Max damage at epicenter
        radius: 350,
        fuseTime: 1500, // 1.5 seconds
        effectDuration: 0, // Instant explosion
        bounceCount: 3,
        bounceDamping: 0.6,
        gravity: 800,
        price: 300,
        maxVelocity: 1000,
        soundId: 'hegrenade'
      },
      {
        type: 'flashbang',
        damage: 1, // Minimal damage
        radius: 400,
        fuseTime: 1500,
        effectDuration: 4500, // Max blind duration
        bounceCount: 2,
        bounceDamping: 0.5,
        gravity: 800,
        price: 200,
        maxVelocity: 1000,
        soundId: 'flashbang'
      },
      {
        type: 'smoke',
        damage: 0,
        radius: 250,
        fuseTime: 1000,
        effectDuration: 18000, // 18 seconds smoke duration
        bounceCount: 1,
        bounceDamping: 0.3,
        gravity: 600,
        price: 300,
        maxVelocity: 800,
        soundId: 'smoke'
      },
      {
        type: 'molotov',
        damage: 8, // Damage per tick
        radius: 200,
        fuseTime: 2000, // Ignites on contact or after 2 seconds
        effectDuration: 7000, // 7 seconds of fire
        bounceCount: 0, // Molotovs break on impact
        bounceDamping: 0,
        gravity: 900,
        price: 400,
        maxVelocity: 900,
        soundId: 'molotov'
      },
      {
        type: 'incendiary',
        damage: 8,
        radius: 180,
        fuseTime: 2000,
        effectDuration: 7000,
        bounceCount: 0,
        bounceDamping: 0,
        gravity: 900,
        price: 600,
        maxVelocity: 900,
        soundId: 'incendiary'
      }
    ];
    
    stats.forEach(stat => {
      this.grenadeStats.set(stat.type, stat);
    });
    
    console.log('🧨 GrenadeSystem initialized with', stats.length, 'grenade types');
  }
  
  /**
   * Throw a grenade with realistic physics
   */
  throwGrenade(
    type: GrenadeType,
    origin: Vector2D,
    target: Vector2D,
    throwForce: number, // 0-1, 1 = maximum throw
    playerId: string
  ): string | null {
    const stats = this.grenadeStats.get(type);
    if (!stats) return null;
    
    // Calculate throw direction and velocity
    const direction = {
      x: target.x - origin.x,
      y: target.y - origin.y
    };
    
    const distance = Math.sqrt(direction.x ** 2 + direction.y ** 2);
    if (distance > 0) {
      direction.x /= distance;
      direction.y /= distance;
    }
    
    // Apply arc for realistic trajectory
    const throwAngle = Math.min(45, Math.max(15, (distance / 20))); // Adjust angle based on distance
    const throwVelocity = throwForce * stats.maxVelocity;
    
    const velocity: Vector2D = {
      x: direction.x * throwVelocity * Math.cos(throwAngle * Math.PI / 180),
      y: direction.y * throwVelocity * Math.cos(throwAngle * Math.PI / 180) - 
          throwVelocity * Math.sin(throwAngle * Math.PI / 180)
    };
    
    const grenadeId = `grenade_${playerId}_${Date.now()}`;
    const grenade: ActiveGrenade = {
      id: grenadeId,
      type: type,
      position: { ...origin },
      velocity: velocity,
      owner: playerId,
      thrownTime: Date.now(),
      bounces: 0,
      isExploded: false,
      fuseTime: stats.fuseTime,
      trail: [{ ...origin }]
    };
    
    this.activeGrenades.set(grenadeId, grenade);
    
    // Play throw sound
    this.audio.playWeaponSound(stats.soundId, 'throw', origin);
    
    console.log('🧨 Grenade thrown:', type, 'by player:', playerId);
    return grenadeId;
  }
  
  /**
   * Show trajectory preview while holding grenade
   */
  showTrajectoryPreview(
    type: GrenadeType,
    origin: Vector2D,
    target: Vector2D,
    throwForce: number
  ): Vector2D[] {
    const stats = this.grenadeStats.get(type);
    if (!stats) return [];
    
    // Simulate trajectory physics
    const direction = {
      x: target.x - origin.x,
      y: target.y - origin.y
    };
    
    const distance = Math.sqrt(direction.x ** 2 + direction.y ** 2);
    if (distance > 0) {
      direction.x /= distance;
      direction.y /= distance;
    }
    
    const throwAngle = Math.min(45, Math.max(15, (distance / 20)));
    const throwVelocity = throwForce * stats.maxVelocity;
    
    const velocity: Vector2D = {
      x: direction.x * throwVelocity * Math.cos(throwAngle * Math.PI / 180),
      y: direction.y * throwVelocity * Math.cos(throwAngle * Math.PI / 180) - 
          throwVelocity * Math.sin(throwAngle * Math.PI / 180)
    };
    
    // Simulate trajectory points
    const points: Vector2D[] = [];
    const dt = 0.05; // 50ms steps
    const maxTime = 5.0; // 5 second max flight time
    let pos = { ...origin };
    let vel = { ...velocity };
    
    for (let t = 0; t < maxTime; t += dt) {
      points.push({ ...pos });
      
      // Apply gravity
      vel.y += stats.gravity * dt;
      
      // Update position
      pos.x += vel.x * dt;
      pos.y += vel.y * dt;
      
      // Check if grenade would hit ground (simplified)
      if (pos.y > origin.y + 500) { // Assume ground level
        break;
      }
      
      // Limit preview points
      if (points.length > 50) break;
    }
    
    this.trajectoryPoints = points;
    this.isShowingTrajectory = true;
    
    return points;
  }
  
  /**
   * Hide trajectory preview
   */
  hideTrajectoryPreview(): void {
    this.isShowingTrajectory = false;
    this.trajectoryPoints = [];
  }
  
  /**
   * Update grenade physics and effects
   */
  update(deltaTime: number, mapCollision?: (pos: Vector2D) => boolean): void {
    // Update active grenades
    this.updateActiveGrenades(deltaTime, mapCollision);
    
    // Update effects
    this.updateGrenadeEffects(deltaTime);
    this.updateFlashEffects(deltaTime);
    this.updateSmokeClouds(deltaTime);
    this.updateFireAreas(deltaTime);
  }
  
  private updateActiveGrenades(deltaTime: number, mapCollision?: (pos: Vector2D) => boolean): void {
    const now = Date.now();
    
    this.activeGrenades.forEach((grenade, id) => {
      if (grenade.isExploded) return;
      
      const stats = this.grenadeStats.get(grenade.type)!;
      
      // Check fuse timer
      const timeFlying = now - grenade.thrownTime;
      if (timeFlying >= grenade.fuseTime) {
        this.explodeGrenade(grenade);
        return;
      }
      
      // Apply gravity
      grenade.velocity.y += stats.gravity * deltaTime;
      
      // Update position
      const newPosition = {
        x: grenade.position.x + grenade.velocity.x * deltaTime,
        y: grenade.position.y + grenade.velocity.y * deltaTime
      };
      
      // Check collisions
      if (mapCollision && mapCollision(newPosition)) {
        this.handleGrenadeCollision(grenade, stats);
      } else {
        grenade.position = newPosition;
      }
      
      // Update trail
      grenade.trail.push({ ...grenade.position });
      if (grenade.trail.length > 15) {
        grenade.trail.shift();
      }
      
      // Create visual trail effect
      if (grenade.trail.length > 1) {
        this.renderer.createParticleEffect('grenadeTrail', grenade.position.x, grenade.position.y);
      }
    });
  }
  
  private handleGrenadeCollision(grenade: ActiveGrenade, stats: GrenadeStats): void {
    grenade.bounces++;
    
    // Molotovs and incendiaries explode on contact
    if (grenade.type === 'molotov' || grenade.type === 'incendiary') {
      this.explodeGrenade(grenade);
      return;
    }
    
    // Check if grenade should explode due to bounce limit
    if (grenade.bounces > stats.bounceCount) {
      this.explodeGrenade(grenade);
      return;
    }
    
    // Apply bounce physics (simplified)
    grenade.velocity.x *= stats.bounceDamping;
    grenade.velocity.y *= -stats.bounceDamping; // Reverse Y velocity
    
    // Play bounce sound
    this.audio.play('grenade_bounce', grenade.position, { 
      category: 'weapons',
      volume: 0.6 
    });
    
    console.log('🏀 Grenade bounced:', grenade.type, 'bounces:', grenade.bounces);
  }
  
  private explodeGrenade(grenade: ActiveGrenade): void {
    const stats = this.grenadeStats.get(grenade.type)!;
    
    console.log('💥 Grenade exploded:', grenade.type, 'at position:', grenade.position);
    
    // Mark as exploded
    grenade.isExploded = true;
    
    // Create appropriate effect based on grenade type
    switch (grenade.type) {
      case 'he':
        this.createHEExplosion(grenade, stats);
        break;
      case 'flashbang':
        this.createFlashExplosion(grenade, stats);
        break;
      case 'smoke':
        this.createSmokeCloud(grenade, stats);
        break;
      case 'molotov':
      case 'incendiary':
        this.createFireArea(grenade, stats);
        break;
    }
    
    // Remove grenade from active list after a short delay
    setTimeout(() => {
      this.activeGrenades.delete(grenade.id);
    }, 100);
  }
  
  private createHEExplosion(grenade: ActiveGrenade, stats: GrenadeStats): void {
    // Play explosion sound
    this.audio.play('he_explosion', grenade.position, {
      category: 'weapons',
      volume: 1.0
    });
    
    // Create visual explosion effect
    this.renderer.createParticleEffect('explosion', grenade.position.x, grenade.position.y);
    
    // Create effect for damage calculation
    const effectId = `he_${grenade.id}`;
    const effect: GrenadeEffect = {
      id: effectId,
      type: 'he',
      position: { ...grenade.position },
      startTime: Date.now(),
      duration: 100, // Instant damage
      radius: stats.radius,
      intensity: 1.0,
      owner: grenade.owner
    };
    
    this.grenadeEffects.set(effectId, effect);
  }
  
  private createFlashExplosion(grenade: ActiveGrenade, stats: GrenadeStats): void {
    // Play flashbang sound
    this.audio.play('flashbang_explosion', grenade.position, {
      category: 'weapons',
      volume: 1.0
    });
    
    // Create visual flash effect
    this.renderer.createParticleEffect('flashbang', grenade.position.x, grenade.position.y);
    
    // Create effect for flash calculation
    const effectId = `flash_${grenade.id}`;
    const effect: GrenadeEffect = {
      id: effectId,
      type: 'flashbang',
      position: { ...grenade.position },
      startTime: Date.now(),
      duration: stats.effectDuration,
      radius: stats.radius,
      intensity: 1.0,
      owner: grenade.owner
    };
    
    this.grenadeEffects.set(effectId, effect);
  }
  
  private createSmokeCloud(grenade: ActiveGrenade, stats: GrenadeStats): void {
    // Play smoke sound
    this.audio.play('smoke_deploy', grenade.position, {
      category: 'weapons',
      volume: 0.8
    });
    
    // Create smoke cloud
    const smokeId = `smoke_${grenade.id}`;
    const particles: Vector2D[] = [];
    
    // Generate smoke particles in a circle
    const particleCount = 50;
    for (let i = 0; i < particleCount; i++) {
      const angle = (i / particleCount) * Math.PI * 2;
      const distance = Math.random() * stats.radius;
      particles.push({
        x: grenade.position.x + Math.cos(angle) * distance,
        y: grenade.position.y + Math.sin(angle) * distance
      });
    }
    
    const smokeCloud: SmokeCloud = {
      id: smokeId,
      position: { ...grenade.position },
      radius: stats.radius,
      density: 1.0,
      startTime: Date.now(),
      duration: stats.effectDuration,
      particles: particles
    };
    
    this.smokeClouds.set(smokeId, smokeCloud);
    
    // Create visual smoke effect
    this.renderer.createParticleEffect('smoke', grenade.position.x, grenade.position.y);
  }
  
  private createFireArea(grenade: ActiveGrenade, stats: GrenadeStats): void {
    // Play fire sound
    const soundId = grenade.type === 'molotov' ? 'molotov_ignite' : 'incendiary_ignite';
    this.audio.play(soundId, grenade.position, {
      category: 'weapons',
      volume: 0.9
    });
    
    // Create fire area
    const fireId = `fire_${grenade.id}`;
    const spreadPoints: Vector2D[] = [];
    
    // Generate fire spread pattern
    const spreadCount = 15;
    for (let i = 0; i < spreadCount; i++) {
      const angle = Math.random() * Math.PI * 2;
      const distance = Math.random() * stats.radius;
      spreadPoints.push({
        x: grenade.position.x + Math.cos(angle) * distance,
        y: grenade.position.y + Math.sin(angle) * distance
      });
    }
    
    const fireArea: FireArea = {
      id: fireId,
      position: { ...grenade.position },
      radius: stats.radius,
      damage: stats.damage,
      startTime: Date.now(),
      duration: stats.effectDuration,
      spreadPoints: spreadPoints
    };
    
    this.fireAreas.set(fireId, fireArea);
    
    // Create visual fire effect
    this.renderer.createParticleEffect('fire', grenade.position.x, grenade.position.y);
  }
  
  private updateGrenadeEffects(deltaTime: number): void {
    const now = Date.now();
    const toRemove: string[] = [];
    
    this.grenadeEffects.forEach((effect, id) => {
      const elapsed = now - effect.startTime;
      if (elapsed >= effect.duration) {
        toRemove.push(id);
      }
    });
    
    toRemove.forEach(id => this.grenadeEffects.delete(id));
  }
  
  private updateFlashEffects(deltaTime: number): void {
    const now = Date.now();
    const toRemove: string[] = [];
    
    this.flashEffects.forEach((effect, playerId) => {
      const elapsed = now - effect.startTime;
      if (elapsed >= effect.duration) {
        toRemove.push(playerId);
      } else {
        // Reduce intensity over time
        const progress = elapsed / effect.duration;
        effect.intensity = Math.max(0, 1 - progress);
      }
    });
    
    toRemove.forEach(id => this.flashEffects.delete(id));
  }
  
  private updateSmokeClouds(deltaTime: number): void {
    const now = Date.now();
    const toRemove: string[] = [];
    
    this.smokeClouds.forEach((cloud, id) => {
      const elapsed = now - cloud.startTime;
      if (elapsed >= cloud.duration) {
        toRemove.push(id);
      } else {
        // Update smoke density over time
        const progress = elapsed / cloud.duration;
        if (progress < 0.1) {
          // Building up
          cloud.density = progress / 0.1;
        } else if (progress > 0.8) {
          // Dissipating
          cloud.density = (1 - progress) / 0.2;
        } else {
          // Full density
          cloud.density = 1.0;
        }
        
        // Animate particles
        cloud.particles.forEach(particle => {
          particle.x += (Math.random() - 0.5) * 20 * deltaTime;
          particle.y += (Math.random() - 0.5) * 20 * deltaTime;
        });
        
        // Create continuous smoke visual effect
        if (elapsed % 200 < deltaTime * 1000) {
          this.renderer.createParticleEffect('smoke', cloud.position.x, cloud.position.y);
        }
      }
    });
    
    toRemove.forEach(id => this.smokeClouds.delete(id));
  }
  
  private updateFireAreas(deltaTime: number): void {
    const now = Date.now();
    const toRemove: string[] = [];
    
    this.fireAreas.forEach((fire, id) => {
      const elapsed = now - fire.startTime;
      if (elapsed >= fire.duration) {
        toRemove.push(id);
      } else {
        // Create continuous fire visual effect
        if (elapsed % 150 < deltaTime * 1000) {
          fire.spreadPoints.forEach(point => {
            this.renderer.createParticleEffect('fire', point.x, point.y);
          });
        }
      }
    });
    
    toRemove.forEach(id => this.fireAreas.delete(id));
  }
  
  /**
   * Calculate damage from HE grenade explosion
   */
  calculateHEDamage(playerPosition: Vector2D, playerId: string): number {
    let totalDamage = 0;
    
    this.grenadeEffects.forEach(effect => {
      if (effect.type !== 'he') return;
      
      const distance = Math.sqrt(
        (playerPosition.x - effect.position.x) ** 2 +
        (playerPosition.y - effect.position.y) ** 2
      );
      
      if (distance <= effect.radius) {
        const damageRatio = 1 - (distance / effect.radius);
        const stats = this.grenadeStats.get('he')!;
        totalDamage += stats.damage * damageRatio * effect.intensity;
      }
    });
    
    return Math.floor(totalDamage);
  }
  
  /**
   * Calculate flash effect intensity for player
   */
  calculateFlashEffect(playerPosition: Vector2D, playerOrientation: number, playerId: string): number {
    let maxIntensity = 0;
    
    this.grenadeEffects.forEach(effect => {
      if (effect.type !== 'flashbang') return;
      
      const distance = Math.sqrt(
        (playerPosition.x - effect.position.x) ** 2 +
        (playerPosition.y - effect.position.y) ** 2
      );
      
      if (distance <= effect.radius) {
        // Calculate angle to flash
        const angleToFlash = Math.atan2(
          effect.position.y - playerPosition.y,
          effect.position.x - playerPosition.x
        );
        
        const angleDiff = Math.abs(angleToFlash - playerOrientation);
        const normalizedAngleDiff = Math.min(angleDiff, Math.PI * 2 - angleDiff);
        
        // Flash is more effective when looking at it
        const angleFactor = 1 - (normalizedAngleDiff / Math.PI);
        const distanceFactor = 1 - (distance / effect.radius);
        
        const intensity = angleFactor * distanceFactor * effect.intensity;
        maxIntensity = Math.max(maxIntensity, intensity);
      }
    });
    
    // Apply flash effect if significant
    if (maxIntensity > 0.1) {
      const stats = this.grenadeStats.get('flashbang')!;
      const flashEffect: FlashEffect = {
        playerId: playerId,
        intensity: maxIntensity,
        startTime: Date.now(),
        duration: stats.effectDuration * maxIntensity
      };
      this.flashEffects.set(playerId, flashEffect);
    }
    
    return maxIntensity;
  }
  
  /**
   * Check if position is in smoke cloud
   */
  isPositionInSmoke(position: Vector2D): boolean {
    for (const cloud of this.smokeClouds.values()) {
      const distance = Math.sqrt(
        (position.x - cloud.position.x) ** 2 +
        (position.y - cloud.position.y) ** 2
      );
      
      if (distance <= cloud.radius && cloud.density > 0.3) {
        return true;
      }
    }
    
    return false;
  }
  
  /**
   * Calculate fire damage for player at position
   */
  calculateFireDamage(playerPosition: Vector2D): number {
    let totalDamage = 0;
    
    this.fireAreas.forEach(fire => {
      const distance = Math.sqrt(
        (playerPosition.x - fire.position.x) ** 2 +
        (playerPosition.y - fire.position.y) ** 2
      );
      
      if (distance <= fire.radius) {
        totalDamage += fire.damage;
      }
    });
    
    return totalDamage;
  }
  
  /**
   * Get current flash effect for player
   */
  getFlashEffect(playerId: string): FlashEffect | undefined {
    return this.flashEffects.get(playerId);
  }
  
  /**
   * Get all active smoke clouds
   */
  getSmokeClouds(): SmokeCloud[] {
    return Array.from(this.smokeClouds.values());
  }
  
  /**
   * Get all active fire areas
   */
  getFireAreas(): FireArea[] {
    return Array.from(this.fireAreas.values());
  }
  
  /**
   * Get trajectory preview points
   */
  getTrajectoryPreview(): Vector2D[] {
    return this.isShowingTrajectory ? [...this.trajectoryPoints] : [];
  }
  
  /**
   * Get grenade stats for UI
   */
  getGrenadeStats(type: GrenadeType): GrenadeStats | undefined {
    return this.grenadeStats.get(type);
  }
  
  /**
   * Get all active grenades for rendering
   */
  getActiveGrenades(): ActiveGrenade[] {
    return Array.from(this.activeGrenades.values());
  }
  
  /**
   * Clear all effects and grenades
   */
  reset(): void {
    this.activeGrenades.clear();
    this.grenadeEffects.clear();
    this.flashEffects.clear();
    this.smokeClouds.clear();
    this.fireAreas.clear();
    this.hideTrajectoryPreview();
    
    console.log('🧨 GrenadeSystem reset');
  }
}