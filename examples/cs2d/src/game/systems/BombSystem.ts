import { Player, GameState } from '../GameCore';
import { Vector2D } from '../physics/PhysicsEngine';
import { CS16AudioManager } from '../audio/CS16AudioManager';

export interface BombSite {
  id: string;
  position: Vector2D;
  radius: number;
  name: string; // 'A' or 'B'
  isActive: boolean;
}

export interface C4Bomb {
  id: string;
  position: Vector2D;
  planterId: string;
  plantTime: number;
  timer: number; // seconds until explosion
  isDefusing: boolean;
  defuserId?: string;
  defuseStartTime?: number;
  hasExploded: boolean;
  hasBeenDefused: boolean;
}

export interface DefuseAttempt {
  playerId: string;
  bombId: string;
  startTime: number;
  defuseTime: number; // How long defuse takes
  hasDefuseKit: boolean;
  isComplete: boolean;
  wasInterrupted: boolean;
}

export class BombSystem {
  private audioManager: CS16AudioManager | null = null;
  private bombSites: Map<string, BombSite> = new Map();
  private activeBombs: Map<string, C4Bomb> = new Map();
  private currentDefuse: DefuseAttempt | null = null;
  private eventCallbacks: Map<string, Function[]> = new Map();
  
  // CS 1.6 bomb mechanics constants
  private readonly BOMB_TIMER = 45; // 45 seconds
  private readonly PLANT_TIME = 3; // 3 seconds to plant
  private readonly DEFUSE_TIME_NO_KIT = 10; // 10 seconds without kit
  private readonly DEFUSE_TIME_WITH_KIT = 5; // 5 seconds with kit
  private readonly EXPLOSION_RADIUS = 500; // pixels
  private readonly EXPLOSION_DAMAGE = 500; // max damage at center
  
  constructor(audioManager?: CS16AudioManager) {
    this.audioManager = audioManager || null;
    this.initializeBombSites();
  }
  
  /**
   * Initialize bomb sites for the map
   */
  private initializeBombSites(): void {
    // Default bomb sites (would be loaded from map data)
    const bombSiteA: BombSite = {
      id: 'site_a',
      position: { x: 200, y: 200 },
      radius: 100,
      name: 'A',
      isActive: true
    };
    
    const bombSiteB: BombSite = {
      id: 'site_b',
      position: { x: 800, y: 600 },
      radius: 100,
      name: 'B',
      isActive: true
    };
    
    this.bombSites.set('site_a', bombSiteA);
    this.bombSites.set('site_b', bombSiteB);
  }
  
  /**
   * Update bomb system each frame
   */
  update(deltaTime: number): void {
    this.updateBombTimers(deltaTime);
    this.updateDefuseAttempts(deltaTime);
  }
  
  /**
   * Update bomb timers and check for explosions
   */
  private updateBombTimers(deltaTime: number): void {
    this.activeBombs.forEach((bomb) => {
      if (bomb.hasExploded || bomb.hasBeenDefused) return;
      
      bomb.timer -= deltaTime;
      
      // Play beeping sound as timer gets low
      if (bomb.timer <= 10 && bomb.timer % 1 < deltaTime) {
        this.playBombBeep(bomb);
      }
      
      // Explode bomb when timer reaches zero
      if (bomb.timer <= 0) {
        this.explodeBomb(bomb.id);
      }
    });
  }
  
  /**
   * Update defuse attempts
   */
  private updateDefuseAttempts(deltaTime: number): void {
    if (!this.currentDefuse || this.currentDefuse.isComplete) return;
    
    const elapsed = (Date.now() - this.currentDefuse.startTime) / 1000;
    
    if (elapsed >= this.currentDefuse.defuseTime) {
      this.completeDefuse();
    }
  }
  
  /**
   * Attempt to plant bomb at current position
   */
  canPlantBomb(player: Player): { canPlant: boolean; reason?: string; siteId?: string } {
    // Check if player is terrorist
    if (player.team !== 't') {
      return { canPlant: false, reason: 'Only terrorists can plant the bomb' };
    }
    
    // Check if player is alive
    if (!player.isAlive) {
      return { canPlant: false, reason: 'Player is not alive' };
    }
    
    // Check if player has C4
    if (!player.weapons.includes('c4')) {
      return { canPlant: false, reason: 'Player does not have the bomb' };
    }
    
    // Check if already a bomb planted
    if (this.activeBombs.size > 0) {
      return { canPlant: false, reason: 'Bomb is already planted' };
    }
    
    // Check if in bomb site
    const nearestSite = this.findNearestBombSite(player.position);
    if (!nearestSite) {
      return { canPlant: false, reason: 'Must be in bomb site to plant' };
    }
    
    const distance = this.calculateDistance(player.position, nearestSite.position);
    if (distance > nearestSite.radius) {
      return { canPlant: false, reason: 'Must be closer to bomb site center' };
    }
    
    return { canPlant: true, siteId: nearestSite.id };
  }
  
  /**
   * Start planting the bomb
   */
  startPlantBomb(player: Player): boolean {
    const plantCheck = this.canPlantBomb(player);
    if (!plantCheck.canPlant) {
      console.warn('Cannot plant bomb:', plantCheck.reason);
      return false;
    }
    
    // Remove C4 from player inventory
    const c4Index = player.weapons.indexOf('c4');
    if (c4Index > -1) {
      player.weapons.splice(c4Index, 1);
    }
    
    // Create bomb
    const bomb: C4Bomb = {
      id: `bomb_${Date.now()}`,
      position: { ...player.position },
      planterId: player.id,
      plantTime: Date.now(),
      timer: this.BOMB_TIMER,
      isDefusing: false,
      hasExploded: false,
      hasBeenDefused: false
    };
    
    this.activeBombs.set(bomb.id, bomb);
    
    // Award money for planting
    player.money += 800; // CS 1.6 plant reward
    
    // Play plant sound
    if (this.audioManager) {
      this.audioManager.play('radio/bombpl.wav');
      
      // Start bomb beeping sound loop
      setTimeout(() => this.startBombBeeping(bomb), 1000);
    }
    
    this.emitEvent('bomb_planted', {
      bombId: bomb.id,
      playerId: player.id,
      position: bomb.position,
      siteId: plantCheck.siteId,
      timer: bomb.timer
    });
    
    console.log('💣 Bomb planted by:', player.id, 'at:', bomb.position);
    return true;
  }
  
  /**
   * Check if player can defuse bomb
   */
  canDefuseBomb(player: Player): { canDefuse: boolean; reason?: string; bombId?: string } {
    // Check if player is CT
    if (player.team !== 'ct') {
      return { canDefuse: false, reason: 'Only CTs can defuse the bomb' };
    }
    
    // Check if player is alive
    if (!player.isAlive) {
      return { canDefuse: false, reason: 'Player is not alive' };
    }
    
    // Check if there's a bomb to defuse
    if (this.activeBombs.size === 0) {
      return { canDefuse: false, reason: 'No bomb is planted' };
    }
    
    // Find nearest bomb
    const nearestBomb = this.findNearestBomb(player.position);
    if (!nearestBomb) {
      return { canDefuse: false, reason: 'No bomb found' };
    }
    
    const distance = this.calculateDistance(player.position, nearestBomb.position);
    if (distance > 100) { // Must be within 100 units
      return { canDefuse: false, reason: 'Must be closer to the bomb' };
    }
    
    // Check if bomb has already exploded or been defused
    if (nearestBomb.hasExploded || nearestBomb.hasBeenDefused) {
      return { canDefuse: false, reason: 'Bomb cannot be defused' };
    }
    
    // Check if someone is already defusing
    if (this.currentDefuse && !this.currentDefuse.isComplete) {
      return { canDefuse: false, reason: 'Someone is already defusing' };
    }
    
    return { canDefuse: true, bombId: nearestBomb.id };
  }
  
  /**
   * Start defusing the bomb
   */
  startDefuseBomb(player: Player): boolean {
    const defuseCheck = this.canDefuseBomb(player);
    if (!defuseCheck.canDefuse || !defuseCheck.bombId) {
      console.warn('Cannot defuse bomb:', defuseCheck.reason);
      return false;
    }
    
    const bomb = this.activeBombs.get(defuseCheck.bombId);
    if (!bomb) return false;
    
    // Check if player has defuse kit
    const hasDefuseKit = player.weapons.includes('defuse_kit');
    const defuseTime = hasDefuseKit ? this.DEFUSE_TIME_WITH_KIT : this.DEFUSE_TIME_NO_KIT;
    
    // Start defuse attempt
    this.currentDefuse = {
      playerId: player.id,
      bombId: bomb.id,
      startTime: Date.now(),
      defuseTime,
      hasDefuseKit,
      isComplete: false,
      wasInterrupted: false
    };
    
    bomb.isDefusing = true;
    bomb.defuserId = player.id;
    bomb.defuseStartTime = Date.now();
    
    // Play defuse start sound
    if (this.audioManager) {
      // CS 1.6 doesn't have a specific defuse start sound, use generic
      this.audioManager.play('items/flashlight1.wav'); // Placeholder
    }
    
    this.emitEvent('defuse_started', {
      playerId: player.id,
      bombId: bomb.id,
      defuseTime,
      hasKit: hasDefuseKit,
      timeRemaining: bomb.timer
    });
    
    console.log('🛠️ Defuse started by:', player.id, 'time:', defuseTime, 'kit:', hasDefuseKit);
    return true;
  }
  
  /**
   * Stop defusing (player moved away or took damage)
   */
  stopDefuseBomb(playerId: string, reason: string = 'interrupted'): boolean {
    if (!this.currentDefuse || this.currentDefuse.playerId !== playerId) {
      return false;
    }
    
    const bomb = this.activeBombs.get(this.currentDefuse.bombId);
    if (bomb) {
      bomb.isDefusing = false;
      bomb.defuserId = undefined;
      bomb.defuseStartTime = undefined;
    }
    
    this.currentDefuse.wasInterrupted = true;
    this.currentDefuse.isComplete = true;
    
    this.emitEvent('defuse_stopped', {
      playerId,
      bombId: this.currentDefuse.bombId,
      reason
    });
    
    this.currentDefuse = null;
    
    console.log('🛠️ Defuse stopped by:', playerId, 'reason:', reason);
    return true;
  }
  
  /**
   * Complete defuse attempt
   */
  private completeDefuse(): void {
    if (!this.currentDefuse) return;
    
    const bomb = this.activeBombs.get(this.currentDefuse.bombId);
    if (!bomb) return;
    
    bomb.hasBeenDefused = true;
    bomb.isDefusing = false;
    this.currentDefuse.isComplete = true;
    
    // Award money for successful defuse
    const defuserId = this.currentDefuse.playerId;
    // In a real implementation, you'd access the player and award money
    
    // Play defuse success sound
    if (this.audioManager) {
      this.audioManager.play('radio/bombdef.wav');
    }
    
    this.emitEvent('bomb_defused', {
      playerId: defuserId,
      bombId: bomb.id,
      defuseTime: this.currentDefuse.defuseTime,
      hasKit: this.currentDefuse.hasDefuseKit,
      timeRemaining: bomb.timer
    });
    
    console.log('✅ Bomb defused by:', defuserId);
    this.currentDefuse = null;
  }
  
  /**
   * Explode the bomb
   */
  private explodeBomb(bombId: string): void {
    const bomb = this.activeBombs.get(bombId);
    if (!bomb || bomb.hasExploded) return;
    
    bomb.hasExploded = true;
    bomb.timer = 0;
    
    // Stop any defuse attempt
    if (this.currentDefuse && this.currentDefuse.bombId === bombId) {
      this.currentDefuse = null;
    }
    
    // Play explosion sound
    if (this.audioManager) {
      this.audioManager.play('weapons/c4_explode1.wav', bomb.position);
    }
    
    this.emitEvent('bomb_exploded', {
      bombId: bomb.id,
      position: bomb.position,
      planterId: bomb.planterId,
      explosionRadius: this.EXPLOSION_RADIUS,
      maxDamage: this.EXPLOSION_DAMAGE
    });
    
    console.log('💥 Bomb exploded:', bombId, 'at:', bomb.position);
  }
  
  /**
   * Calculate damage from bomb explosion for a player
   */
  calculateExplosionDamage(bombPosition: Vector2D, playerPosition: Vector2D): number {
    const distance = this.calculateDistance(bombPosition, playerPosition);
    
    if (distance >= this.EXPLOSION_RADIUS) {
      return 0; // Outside explosion radius
    }
    
    // Linear damage falloff
    const damageRatio = 1 - (distance / this.EXPLOSION_RADIUS);
    return Math.floor(this.EXPLOSION_DAMAGE * damageRatio);
  }
  
  /**
   * Start bomb beeping sound loop
   */
  private startBombBeeping(bomb: C4Bomb): void {
    const beep = () => {
      if (bomb.hasExploded || bomb.hasBeenDefused) return;
      
      // Beep frequency increases as timer gets lower
      let beepInterval = 1000; // 1 second default
      if (bomb.timer <= 10) beepInterval = 300; // Fast beeping
      else if (bomb.timer <= 20) beepInterval = 500; // Medium beeping
      else if (bomb.timer <= 30) beepInterval = 800; // Slow beeping
      
      this.playBombBeep(bomb);
      
      setTimeout(beep, beepInterval);
    };
    
    beep();
  }
  
  /**
   * Play bomb beep sound
   */
  private playBombBeep(bomb: C4Bomb): void {
    if (this.audioManager) {
      // CS 1.6 uses simple beep sound
      this.audioManager.play('weapons/c4_beep1.wav', bomb.position);
    }
  }
  
  /**
   * Find nearest bomb site to position
   */
  private findNearestBombSite(position: Vector2D): BombSite | null {
    let nearestSite: BombSite | null = null;
    let nearestDistance = Infinity;
    
    this.bombSites.forEach(site => {
      if (!site.isActive) return;
      
      const distance = this.calculateDistance(position, site.position);
      if (distance < nearestDistance) {
        nearestDistance = distance;
        nearestSite = site;
      }
    });
    
    return nearestSite;
  }
  
  /**
   * Find nearest active bomb
   */
  private findNearestBomb(position: Vector2D): C4Bomb | null {
    let nearestBomb: C4Bomb | null = null;
    let nearestDistance = Infinity;
    
    this.activeBombs.forEach(bomb => {
      if (bomb.hasExploded || bomb.hasBeenDefused) return;
      
      const distance = this.calculateDistance(position, bomb.position);
      if (distance < nearestDistance) {
        nearestDistance = distance;
        nearestBomb = bomb;
      }
    });
    
    return nearestBomb;
  }
  
  /**
   * Calculate distance between two points
   */
  private calculateDistance(a: Vector2D, b: Vector2D): number {
    return Math.sqrt((a.x - b.x) ** 2 + (a.y - b.y) ** 2);
  }
  
  /**
   * Register event callback
   */
  onEvent(event: string, callback: Function): void {
    if (!this.eventCallbacks.has(event)) {
      this.eventCallbacks.set(event, []);
    }
    this.eventCallbacks.get(event)!.push(callback);
  }
  
  /**
   * Emit event to registered callbacks
   */
  private emitEvent(event: string, data: any): void {
    const callbacks = this.eventCallbacks.get(event);
    if (callbacks) {
      callbacks.forEach(callback => callback(data));
    }
  }
  
  /**
   * Get all active bombs
   */
  getActiveBombs(): C4Bomb[] {
    return Array.from(this.activeBombs.values());
  }
  
  /**
   * Get all bomb sites
   */
  getBombSites(): BombSite[] {
    return Array.from(this.bombSites.values());
  }
  
  /**
   * Get current defuse attempt
   */
  getCurrentDefuse(): DefuseAttempt | null {
    return this.currentDefuse;
  }
  
  /**
   * Check if bomb is planted
   */
  isBombPlanted(): boolean {
    return this.activeBombs.size > 0 && 
           Array.from(this.activeBombs.values()).some(bomb => 
             !bomb.hasExploded && !bomb.hasBeenDefused
           );
  }
  
  /**
   * Get defuse progress (0-1)
   */
  getDefuseProgress(): number {
    if (!this.currentDefuse || this.currentDefuse.isComplete) return 0;
    
    const elapsed = (Date.now() - this.currentDefuse.startTime) / 1000;
    return Math.min(1, elapsed / this.currentDefuse.defuseTime);
  }
  
  /**
   * Reset bomb system (for new round)
   */
  reset(): void {
    this.activeBombs.clear();
    this.currentDefuse = null;
    
    console.log('🔄 Bomb system reset for new round');
  }
  
  /**
   * Set audio manager
   */
  setAudioManager(audioManager: CS16AudioManager): void {
    this.audioManager = audioManager;
  }
}