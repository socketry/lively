import { Vector2D } from '../physics/PhysicsEngine';
import { CS16AudioManager, SurfaceType } from '../audio/CS16AudioManager';
import { Player } from '../GameCore';

export interface JumpState {
  isJumping: boolean;
  jumpStartTime: number;
  jumpVelocity: number;
  hasLanded: boolean;
  airTime: number;
}

export interface CrouchState {
  isCrouching: boolean;
  crouchProgress: number; // 0-1, 1 = fully crouched
  crouchStartTime: number;
  hitboxReduction: number;
}

export interface WalkState {
  isWalking: boolean;
  walkVolume: number; // Volume reduction for footsteps
  accuracyBonus: number; // Accuracy improvement while walking
}

export interface PlayerPhysics {
  onGround: boolean;
  lastGroundTime: number;
  fallDamageVelocity: number;
  surfaceAngle: number; // For slopes
  slidingFriction: number;
}

export interface DefuseKit {
  hasKit: boolean;
  defuseTimeReduction: number; // Seconds reduced from defuse time
  purchaseTime?: number;
}

export class PlayerActionSystem {
  private audio: CS16AudioManager;
  private jumpStates: Map<string, JumpState> = new Map();
  private crouchStates: Map<string, CrouchState> = new Map();
  private walkStates: Map<string, WalkState> = new Map();
  private playerPhysics: Map<string, PlayerPhysics> = new Map();
  private defuseKits: Map<string, DefuseKit> = new Map();
  
  // Action constants
  private static readonly JUMP_VELOCITY = -400; // Negative Y is up
  private static readonly JUMP_COOLDOWN = 500; // ms between jumps
  private static readonly CROUCH_SPEED = 0.003; // How fast crouch animation
  private static readonly CROUCH_ACCURACY_BONUS = 0.3; // 30% better accuracy when crouched
  private static readonly WALK_ACCURACY_BONUS = 0.2; // 20% better accuracy when walking
  private static readonly FALL_DAMAGE_THRESHOLD = 300; // Velocity threshold for fall damage
  private static readonly MAX_FALL_DAMAGE = 50; // Maximum fall damage
  
  constructor(audio: CS16AudioManager) {
    this.audio = audio;
    console.log('🏃 PlayerActionSystem initialized');
  }
  
  /**
   * Initialize player action states
   */
  initializePlayer(playerId: string): void {
    this.jumpStates.set(playerId, {
      isJumping: false,
      jumpStartTime: 0,
      jumpVelocity: 0,
      hasLanded: true,
      airTime: 0
    });
    
    this.crouchStates.set(playerId, {
      isCrouching: false,
      crouchProgress: 0,
      crouchStartTime: 0,
      hitboxReduction: 0
    });
    
    this.walkStates.set(playerId, {
      isWalking: false,
      walkVolume: 1.0,
      accuracyBonus: 0
    });
    
    this.playerPhysics.set(playerId, {
      onGround: true,
      lastGroundTime: Date.now(),
      fallDamageVelocity: 0,
      surfaceAngle: 0,
      slidingFriction: 1.0
    });
    
    this.defuseKits.set(playerId, {
      hasKit: false,
      defuseTimeReduction: 2.5 // Default CT defuse time reduction
    });
  }
  
  /**
   * Handle jump input
   */
  handleJump(player: Player): boolean {
    if (!player.isAlive) return false;
    
    const jumpState = this.jumpStates.get(player.id);
    const physics = this.playerPhysics.get(player.id);
    
    if (!jumpState || !physics) return false;
    
    // Check if player can jump
    if (!physics.onGround || jumpState.isJumping) {
      return false;
    }
    
    // Check jump cooldown
    const now = Date.now();
    if (now - jumpState.jumpStartTime < PlayerActionSystem.JUMP_COOLDOWN) {
      return false;
    }
    
    // Check if crouched (can't jump while crouched)
    const crouchState = this.crouchStates.get(player.id);
    if (crouchState && crouchState.isCrouching) {
      return false;
    }
    
    // Execute jump
    jumpState.isJumping = true;
    jumpState.jumpStartTime = now;
    jumpState.jumpVelocity = PlayerActionSystem.JUMP_VELOCITY;
    jumpState.hasLanded = false;
    jumpState.airTime = 0;
    
    physics.onGround = false;
    physics.fallDamageVelocity = 0;
    
    // Apply jump velocity to player
    player.velocity.y += jumpState.jumpVelocity;
    
    // Note: CS 1.6 doesn't have jump sounds, only landing sounds
    
    console.log('🦘 Player jumped:', player.id);
    return true;
  }
  
  /**
   * Handle crouch input
   */
  setCrouch(player: Player, shouldCrouch: boolean): void {
    if (!player.isAlive) return;
    
    const crouchState = this.crouchStates.get(player.id);
    if (!crouchState) return;
    
    if (shouldCrouch !== crouchState.isCrouching) {
      crouchState.isCrouching = shouldCrouch;
      crouchState.crouchStartTime = Date.now();
      
      // Update player state
      player.isDucking = shouldCrouch;
      
      console.log('🦆 Player crouch state changed:', player.id, shouldCrouch);
    }
  }
  
  /**
   * Handle walk input
   */
  setWalk(player: Player, shouldWalk: boolean): void {
    if (!player.isAlive) return;
    
    const walkState = this.walkStates.get(player.id);
    if (!walkState) return;
    
    if (shouldWalk !== walkState.isWalking) {
      walkState.isWalking = shouldWalk;
      walkState.walkVolume = shouldWalk ? 0.3 : 1.0; // Quieter footsteps
      walkState.accuracyBonus = shouldWalk ? PlayerActionSystem.WALK_ACCURACY_BONUS : 0;
      
      // Update player state
      player.isWalking = shouldWalk;
      
      console.log('🚶 Player walk state changed:', player.id, shouldWalk);
    }
  }
  
  /**
   * Purchase defuse kit
   */
  purchaseDefuseKit(player: Player, cost: number = 400): boolean {
    if (player.team !== 'ct' || player.money < cost) {
      return false;
    }
    
    const defuseKit = this.defuseKits.get(player.id);
    if (!defuseKit) return false;
    
    if (defuseKit.hasKit) {
      return false; // Already has kit
    }
    
    // Purchase successful
    player.money -= cost;
    defuseKit.hasKit = true;
    defuseKit.purchaseTime = Date.now();
    
    // Play purchase sound
    this.audio.play('item_purchase', player.position, { category: 'ui' });
    
    console.log('🛠️ Defuse kit purchased by:', player.id, 'for $', cost);
    return true;
  }
  
  /**
   * Update player actions and physics
   */
  update(player: Player, deltaTime: number, groundLevel?: number): void {
    if (!player.isAlive) return;
    
    this.updateJump(player, deltaTime, groundLevel);
    this.updateCrouch(player, deltaTime);
    this.updateWalk(player, deltaTime);
    this.updatePhysics(player, deltaTime, groundLevel);
  }
  
  private updateJump(player: Player, deltaTime: number, groundLevel?: number): void {
    const jumpState = this.jumpStates.get(player.id);
    const physics = this.playerPhysics.get(player.id);
    
    if (!jumpState || !physics) return;
    
    if (jumpState.isJumping) {
      jumpState.airTime += deltaTime;
      
      // Check if player has landed
      const currentGroundLevel = groundLevel ?? player.position.y + 20;
      
      if (player.velocity.y >= 0 && player.position.y >= currentGroundLevel) {
        // Player has landed
        this.handleLanding(player, jumpState, physics);
      }
    }
  }
  
  private handleLanding(player: Player, jumpState: JumpState, physics: PlayerPhysics): void {
    if (!jumpState.hasLanded) {
      jumpState.isJumping = false;
      jumpState.hasLanded = true;
      physics.onGround = true;
      physics.lastGroundTime = Date.now();
      
      // Calculate fall damage based on velocity and air time
      const impactVelocity = Math.abs(player.velocity.y);
      
      if (impactVelocity > PlayerActionSystem.FALL_DAMAGE_THRESHOLD) {
        const fallDamage = Math.min(
          PlayerActionSystem.MAX_FALL_DAMAGE,
          Math.floor((impactVelocity - PlayerActionSystem.FALL_DAMAGE_THRESHOLD) / 10)
        );
        
        if (fallDamage > 0) {
          player.health = Math.max(0, player.health - fallDamage);
          
          // Play fall damage sound
          this.audio.playPlayerSound('fall_damage', player.position);
          
          console.log('💥 Fall damage applied to:', player.id, 'damage:', fallDamage);
        }
      }
      
      // Play landing sound based on surface type
      const landingSound = this.getLandingSoundForSurface(player.currentSurface);
      this.audio.play(landingSound, player.position, {
        category: 'player',
        volume: Math.min(1.0, impactVelocity / 200)
      });
      
      // Reset vertical velocity
      player.velocity.y = 0;
      
      console.log('🏃 Player landed:', player.id, 'air time:', jumpState.airTime.toFixed(2), 's');
    }
  }
  
  private updateCrouch(player: Player, deltaTime: number): void {
    const crouchState = this.crouchStates.get(player.id);
    if (!crouchState) return;
    
    // Animate crouch transition
    const targetProgress = crouchState.isCrouching ? 1 : 0;
    const crouchSpeed = PlayerActionSystem.CROUCH_SPEED / deltaTime;
    
    if (crouchState.crouchProgress !== targetProgress) {
      const direction = targetProgress > crouchState.crouchProgress ? 1 : -1;
      crouchState.crouchProgress += direction * crouchSpeed * deltaTime;
      crouchState.crouchProgress = Math.max(0, Math.min(1, crouchState.crouchProgress));
      
      // Update hitbox reduction (smaller when crouched)
      crouchState.hitboxReduction = crouchState.crouchProgress * 0.3; // 30% smaller hitbox
    }
  }
  
  private updateWalk(player: Player, deltaTime: number): void {
    const walkState = this.walkStates.get(player.id);
    if (!walkState) return;
    
    // Walking state is handled in the input system
    // This is where we could add walking stamina or other mechanics
  }
  
  private updatePhysics(player: Player, deltaTime: number, groundLevel?: number): void {
    const physics = this.playerPhysics.get(player.id);
    if (!physics) return;
    
    // Update ground detection
    const currentGroundLevel = groundLevel ?? player.position.y + 20;
    const wasOnGround = physics.onGround;
    
    physics.onGround = player.position.y >= currentGroundLevel && player.velocity.y >= 0;
    
    if (!wasOnGround && physics.onGround) {
      physics.lastGroundTime = Date.now();
    }
    
    // Update fall damage velocity tracking
    if (!physics.onGround && player.velocity.y > physics.fallDamageVelocity) {
      physics.fallDamageVelocity = player.velocity.y;
    }
  }
  
  private getLandingSoundForSurface(surface: SurfaceType): string {
    const soundMap: Record<string, string> = {
      'concrete': 'player_land_concrete',
      'metal': 'player_land_metal',
      'wood': 'player_land_wood',
      'water': 'player_land_water',
      'grass': 'player_land_grass'
    };
    
    return soundMap[surface.material] || 'player_land_concrete';
  }
  
  /**
   * Get current jump state
   */
  getJumpState(playerId: string): JumpState | undefined {
    return this.jumpStates.get(playerId);
  }
  
  /**
   * Get current crouch state
   */
  getCrouchState(playerId: string): CrouchState | undefined {
    return this.crouchStates.get(playerId);
  }
  
  /**
   * Get current walk state
   */
  getWalkState(playerId: string): WalkState | undefined {
    return this.walkStates.get(playerId);
  }
  
  /**
   * Get accuracy modifier based on player actions
   */
  getAccuracyModifier(playerId: string): number {
    let modifier = 1.0;
    
    const crouchState = this.crouchStates.get(playerId);
    if (crouchState && crouchState.isCrouching) {
      modifier -= PlayerActionSystem.CROUCH_ACCURACY_BONUS * crouchState.crouchProgress;
    }
    
    const walkState = this.walkStates.get(playerId);
    if (walkState && walkState.isWalking) {
      modifier -= walkState.accuracyBonus;
    }
    
    const jumpState = this.jumpStates.get(playerId);
    if (jumpState && jumpState.isJumping) {
      modifier += 0.5; // Much worse accuracy while jumping
    }
    
    return Math.max(0.1, modifier); // Minimum accuracy
  }
  
  /**
   * Get movement speed modifier
   */
  getMovementSpeedModifier(playerId: string): number {
    let modifier = 1.0;
    
    const crouchState = this.crouchStates.get(playerId);
    if (crouchState && crouchState.isCrouching) {
      modifier *= 0.35; // Much slower when crouched
    }
    
    const walkState = this.walkStates.get(playerId);
    if (walkState && walkState.isWalking) {
      modifier *= 0.5; // Slower when walking
    }
    
    return modifier;
  }
  
  /**
   * Get hitbox size modifier for crouching
   */
  getHitboxModifier(playerId: string): number {
    const crouchState = this.crouchStates.get(playerId);
    if (crouchState && crouchState.isCrouching) {
      return 1 - crouchState.hitboxReduction;
    }
    return 1.0;
  }
  
  /**
   * Get footstep volume modifier
   */
  getFootstepVolumeModifier(playerId: string): number {
    const walkState = this.walkStates.get(playerId);
    if (walkState) {
      return walkState.walkVolume;
    }
    return 1.0;
  }
  
  /**
   * Check if player has defuse kit
   */
  hasDefuseKit(playerId: string): boolean {
    const defuseKit = this.defuseKits.get(playerId);
    return defuseKit?.hasKit ?? false;
  }
  
  /**
   * Get defuse time with kit bonus
   */
  getDefuseTime(playerId: string, baseDefuseTime: number = 10): number {
    const defuseKit = this.defuseKits.get(playerId);
    if (defuseKit?.hasKit) {
      return baseDefuseTime - defuseKit.defuseTimeReduction;
    }
    return baseDefuseTime;
  }
  
  /**
   * Reset player action states (for round restart)
   */
  resetPlayer(playerId: string): void {
    const jumpState = this.jumpStates.get(playerId);
    if (jumpState) {
      jumpState.isJumping = false;
      jumpState.hasLanded = true;
      jumpState.airTime = 0;
    }
    
    const crouchState = this.crouchStates.get(playerId);
    if (crouchState) {
      crouchState.isCrouching = false;
      crouchState.crouchProgress = 0;
    }
    
    const walkState = this.walkStates.get(playerId);
    if (walkState) {
      walkState.isWalking = false;
      walkState.walkVolume = 1.0;
      walkState.accuracyBonus = 0;
    }
    
    const physics = this.playerPhysics.get(playerId);
    if (physics) {
      physics.onGround = true;
      physics.lastGroundTime = Date.now();
      physics.fallDamageVelocity = 0;
    }
    
    // Don't reset defuse kit (persists across rounds)
  }
  
  /**
   * Clean up player data
   */
  removePlayer(playerId: string): void {
    this.jumpStates.delete(playerId);
    this.crouchStates.delete(playerId);
    this.walkStates.delete(playerId);
    this.playerPhysics.delete(playerId);
    this.defuseKits.delete(playerId);
  }
}