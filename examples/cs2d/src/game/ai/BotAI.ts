import { Player, GameState } from '../GameCore';
import { Vector2D } from '../physics/PhysicsEngine';
import { WeaponSystem } from '../weapons/WeaponSystem';
import { CS16BotVoiceSystem, BotPersonality } from '../audio/CS16BotVoiceSystem';

export type BotState = 'idle' | 'moving' | 'attacking' | 'retreating' | 'seeking_enemy' | 'planting_bomb' | 'defusing_bomb' | 'camping' | 'following' | 'buying';
export type BotDifficulty = 'easy' | 'normal' | 'hard' | 'expert';

export interface BotTarget {
  playerId: string;
  position: Vector2D;
  lastSeen: number;
  threat: number; // 0-1 threat level
}

export interface BotWaypoint {
  position: Vector2D;
  type: 'move' | 'camp' | 'bombsite' | 'cover';
  priority: number;
}

export interface BotMemory {
  enemies: Map<string, BotTarget>;
  lastEnemyPosition?: Vector2D;
  lastEnemyTime: number;
  dangerZones: Vector2D[];
  favoriteSpots: Vector2D[];
  pathfindingNodes: BotWaypoint[];
}

export class BotAI {
  private bot: Player;
  private difficulty: BotDifficulty;
  private state: BotState = 'idle';
  private memory: BotMemory;
  private weaponSystem: WeaponSystem;
  private voiceSystem?: CS16BotVoiceSystem;
  private target: BotTarget | null = null;
  private destination: Vector2D | null = null;
  private lastStateChange: number = 0;
  private reactionTime: number;
  private accuracy: number;
  private aggressiveness: number;
  private lastDecisionTime: number = 0;
  private decisionCooldown: number = 500; // ms between major decisions
  
  constructor(
    bot: Player, 
    weaponSystem: WeaponSystem,
    difficulty: BotDifficulty = 'normal',
    voiceSystem?: CS16BotVoiceSystem
  ) {
    this.bot = bot;
    this.weaponSystem = weaponSystem;
    this.difficulty = difficulty;
    this.voiceSystem = voiceSystem;
    
    // Initialize memory
    this.memory = {
      enemies: new Map(),
      lastEnemyTime: 0,
      dangerZones: [],
      favoriteSpots: [],
      pathfindingNodes: []
    };
    
    // Set difficulty-based parameters
    this.setDifficultyParameters();
    
    // Initialize bot personality if not set
    if (!this.bot.botPersonality) {
      this.bot.botPersonality = this.generatePersonality();
    }
    
    this.aggressiveness = this.bot.botPersonality.aggressiveness;
    
    console.log('🤖 Bot AI initialized:', {
      botId: this.bot.id,
      difficulty: this.difficulty,
      reactionTime: this.reactionTime,
      accuracy: this.accuracy
    });
  }
  
  /**
   * Set bot parameters based on difficulty
   */
  private setDifficultyParameters(): void {
    switch (this.difficulty) {
      case 'easy':
        this.reactionTime = 800 + Math.random() * 400; // 800-1200ms
        this.accuracy = 0.3 + Math.random() * 0.2; // 30-50%
        this.decisionCooldown = 1000;
        break;
      case 'normal':
        this.reactionTime = 400 + Math.random() * 300; // 400-700ms
        this.accuracy = 0.5 + Math.random() * 0.3; // 50-80%
        this.decisionCooldown = 750;
        break;
      case 'hard':
        this.reactionTime = 200 + Math.random() * 200; // 200-400ms
        this.accuracy = 0.7 + Math.random() * 0.2; // 70-90%
        this.decisionCooldown = 500;
        break;
      case 'expert':
        this.reactionTime = 100 + Math.random() * 150; // 100-250ms
        this.accuracy = 0.85 + Math.random() * 0.1; // 85-95%
        this.decisionCooldown = 300;
        break;
    }
  }
  
  /**
   * Generate random bot personality
   */
  private generatePersonality(): BotPersonality {
    return {
      aggressiveness: 0.3 + Math.random() * 0.4, // 0.3-0.7
      chattiness: 0.2 + Math.random() * 0.6, // 0.2-0.8
      helpfulness: 0.4 + Math.random() * 0.4, // 0.4-0.8
      responseFrequency: 0.3 + Math.random() * 0.5 // 0.3-0.8
    };
  }
  
  /**
   * Main bot update loop
   */
  update(deltaTime: number, gameState: GameState, allPlayers: Map<string, Player>): void {
    if (!this.bot.isAlive) {
      this.state = 'idle';
      return;
    }
    
    const now = Date.now();
    
    // Update memory and perception
    this.updatePerception(allPlayers);
    
    // Make decisions periodically
    if (now - this.lastDecisionTime > this.decisionCooldown) {
      this.makeDecision(gameState, allPlayers);
      this.lastDecisionTime = now;
    }
    
    // Execute current behavior
    this.executeBehavior(deltaTime, gameState, allPlayers);
    
    // Update bot voice system
    this.updateBotVoice(gameState);
  }
  
  /**
   * Update bot perception and memory
   */
  private updatePerception(allPlayers: Map<string, Player>): void {
    const now = Date.now();
    const viewDistance = 800; // Bot sight distance
    
    allPlayers.forEach(player => {
      if (player.id === this.bot.id || !player.isAlive) return;
      
      // Check if enemy is in same team
      if (player.team === this.bot.team) return;
      
      const distance = this.calculateDistance(this.bot.position, player.position);
      
      // Check if enemy is visible (simplified line of sight)
      if (distance <= viewDistance && this.hasLineOfSight(this.bot.position, player.position)) {
        // Update enemy memory
        const threat = this.calculateThreat(player, distance);
        
        this.memory.enemies.set(player.id, {
          playerId: player.id,
          position: { ...player.position },
          lastSeen: now,
          threat
        });
        
        this.memory.lastEnemyPosition = { ...player.position };
        this.memory.lastEnemyTime = now;
        
        // React to enemy sighting
        if (!this.target || threat > this.target.threat) {
          this.target = this.memory.enemies.get(player.id)!;
          
          // Play bot voice reaction
          if (this.voiceSystem && Math.random() < 0.3) {
            this.voiceSystem.playBotVoice(
              this.bot.id,
              'enemy_spotted',
              this.bot.position,
              this.bot.botPersonality
            );
          }
        }
      }
    });
    
    // Clean up old enemy memories (older than 10 seconds)
    this.memory.enemies.forEach((enemy, id) => {
      if (now - enemy.lastSeen > 10000) {
        this.memory.enemies.delete(id);
        if (this.target && this.target.playerId === id) {
          this.target = null;
        }
      }
    });
  }
  
  /**
   * Calculate threat level of an enemy
   */
  private calculateThreat(enemy: Player, distance: number): number {
    let threat = 1.0;
    
    // Distance factor (closer = more dangerous)
    threat *= Math.max(0.2, 1.0 - distance / 800);
    
    // Health factor
    threat *= enemy.health / 100;
    
    // Weapon factor (simplified)
    if (enemy.currentWeapon.includes('awp')) threat *= 1.5;
    else if (enemy.currentWeapon.includes('ak47') || enemy.currentWeapon.includes('m4a4')) threat *= 1.3;
    else if (enemy.currentWeapon.includes('deagle')) threat *= 1.2;
    
    return Math.min(1.0, threat);
  }
  
  /**
   * Simplified line of sight check
   */
  private hasLineOfSight(from: Vector2D, to: Vector2D): boolean {
    // In a real implementation, this would check for walls/obstacles
    // For now, simplified to just distance and random occlusion
    const distance = this.calculateDistance(from, to);
    const occlusionChance = Math.min(0.3, distance / 1000);
    return Math.random() > occlusionChance;
  }
  
  /**
   * Make high-level decisions about bot behavior
   */
  private makeDecision(gameState: GameState, allPlayers: Map<string, Player>): void {
    const now = Date.now();
    
    // Priority 1: Combat if enemy is visible and close
    if (this.target && (now - this.target.lastSeen) < 2000) {
      const distance = this.calculateDistance(this.bot.position, this.target.position);
      if (distance < 600) {
        this.changeState('attacking');
        return;
      }
    }
    
    // Priority 2: Bomb-related objectives
    if (gameState.gameMode === 'competitive') {
      if (this.bot.team === 't' && !gameState.bombPlanted) {
        // Terrorist: try to plant bomb
        if (this.bot.weapons.includes('c4') && Math.random() < 0.4) {
          this.changeState('planting_bomb');
          return;
        }
      } else if (this.bot.team === 'ct' && gameState.bombPlanted) {
        // CT: try to defuse bomb
        if (Math.random() < 0.6) {
          this.changeState('defusing_bomb');
          return;
        }
      }
    }
    
    // Priority 3: Seek enemies if haven't seen any recently
    if (now - this.memory.lastEnemyTime > 5000) {
      if (Math.random() < 0.5) {
        this.changeState('seeking_enemy');
      } else {
        this.changeState('moving');
      }
      return;
    }
    
    // Priority 4: Random behavior based on personality
    if (Math.random() < 0.3) {
      if (this.aggressiveness > 0.7) {
        this.changeState('seeking_enemy');
      } else if (this.aggressiveness < 0.4) {
        this.changeState('camping');
      } else {
        this.changeState('moving');
      }
    }
  }
  
  /**
   * Execute current behavior state
   */
  private executeBehavior(deltaTime: number, gameState: GameState, allPlayers: Map<string, Player>): void {
    switch (this.state) {
      case 'attacking':
        this.executeAttack(deltaTime);
        break;
        
      case 'moving':
        this.executeMovement(deltaTime);
        break;
        
      case 'seeking_enemy':
        this.executeEnemySeeking(deltaTime);
        break;
        
      case 'retreating':
        this.executeRetreat(deltaTime);
        break;
        
      case 'camping':
        this.executeCamping(deltaTime);
        break;
        
      case 'planting_bomb':
        this.executeBombPlanting(deltaTime);
        break;
        
      case 'defusing_bomb':
        this.executeBombDefusing(deltaTime);
        break;
        
      case 'buying':
        this.executeBuying(gameState);
        break;
        
      default:
        this.executeIdle(deltaTime);
        break;
    }
  }
  
  /**
   * Execute attack behavior
   */
  private executeAttack(deltaTime: number): void {
    if (!this.target) {
      this.changeState('seeking_enemy');
      return;
    }
    
    const distance = this.calculateDistance(this.bot.position, this.target.position);
    
    // Move towards enemy if too far
    if (distance > 300) {
      this.moveTowards(this.target.position, deltaTime);
    }
    
    // Aim and shoot
    const direction = this.calculateDirection(this.bot.position, this.target.position);
    this.aimAndShoot(direction);
    
    // Retreat if low health
    if (this.bot.health < 30 && Math.random() < 0.4) {
      this.changeState('retreating');
    }
  }
  
  /**
   * Execute movement behavior
   */
  private executeMovement(deltaTime: number): void {
    if (!this.destination) {
      this.destination = this.chooseRandomDestination();
    }
    
    const distance = this.calculateDistance(this.bot.position, this.destination);
    if (distance < 50) {
      this.destination = null;
      this.changeState('idle');
      return;
    }
    
    this.moveTowards(this.destination, deltaTime);
  }
  
  /**
   * Execute enemy seeking behavior
   */
  private executeEnemySeeking(deltaTime: number): void {
    if (this.memory.lastEnemyPosition) {
      this.moveTowards(this.memory.lastEnemyPosition, deltaTime);
      
      const distance = this.calculateDistance(this.bot.position, this.memory.lastEnemyPosition);
      if (distance < 100) {
        // Reached last known enemy position, start camping
        this.changeState('camping');
      }
    } else {
      this.changeState('moving');
    }
  }
  
  /**
   * Execute retreat behavior
   */
  private executeRetreat(deltaTime: number): void {
    if (!this.destination) {
      // Find retreat position (opposite direction from enemy)
      if (this.target) {
        const directionToEnemy = this.calculateDirection(this.bot.position, this.target.position);
        this.destination = {
          x: this.bot.position.x - directionToEnemy.x * 200,
          y: this.bot.position.y - directionToEnemy.y * 200
        };
      } else {
        this.changeState('moving');
        return;
      }
    }
    
    this.moveTowards(this.destination, deltaTime);
    
    // Return to combat if health recovered
    if (this.bot.health > 60) {
      this.changeState('attacking');
    }
  }
  
  /**
   * Execute camping behavior
   */
  private executeCamping(deltaTime: number): void {
    // Stay still and watch for enemies
    // Randomly change state after some time
    if (Math.random() < 0.02) { // 2% chance per frame
      this.changeState('moving');
    }
    
    // Still attack if enemy appears
    if (this.target && (Date.now() - this.target.lastSeen) < 1000) {
      this.changeState('attacking');
    }
  }
  
  /**
   * Execute bomb planting
   */
  private executeBombPlanting(deltaTime: number): void {
    // Move to bombsite and plant
    // Simplified implementation
    if (Math.random() < 0.1) { // 10% chance to complete per frame
      console.log('🤖 Bot attempted to plant bomb:', this.bot.id);
      this.changeState('camping'); // Camp after planting
    }
  }
  
  /**
   * Execute bomb defusing
   */
  private executeBombDefusing(deltaTime: number): void {
    // Move to bomb and defuse
    // Simplified implementation
    if (Math.random() < 0.05) { // 5% chance to complete per frame
      console.log('🤖 Bot attempted to defuse bomb:', this.bot.id);
      this.changeState('idle');
    }
  }
  
  /**
   * Execute buying behavior
   */
  private executeBuying(gameState: GameState): void {
    // Buy equipment based on money and round situation
    // Simplified implementation
    if (this.bot.money > 2000) {
      // Would implement actual buying logic here
      console.log('🤖 Bot considering purchases:', this.bot.id);
    }
    this.changeState('idle');
  }
  
  /**
   * Execute idle behavior
   */
  private executeIdle(deltaTime: number): void {
    // Do nothing, but randomly switch to another state
    if (Math.random() < 0.01) {
      this.changeState('moving');
    }
  }
  
  /**
   * Move towards a target position
   */
  private moveTowards(target: Vector2D, deltaTime: number): void {
    const direction = this.calculateDirection(this.bot.position, target);
    const speed = 150; // Bot movement speed
    
    // Apply movement with some randomness for more natural behavior
    const randomFactor = 0.1;
    const moveX = direction.x + (Math.random() - 0.5) * randomFactor;
    const moveY = direction.y + (Math.random() - 0.5) * randomFactor;
    
    this.bot.velocity.x = moveX * speed;
    this.bot.velocity.y = moveY * speed;
    
    // Update position (simplified, in real game this would be handled by physics)
    this.bot.position.x += this.bot.velocity.x * deltaTime;
    this.bot.position.y += this.bot.velocity.y * deltaTime;
  }
  
  /**
   * Aim and shoot at target
   */
  private aimAndShoot(direction: Vector2D): void {
    const now = Date.now();
    
    // Check if enough time has passed since last shot (reaction time)
    if (now - this.bot.lastShotTime < this.reactionTime) {
      return;
    }
    
    // Apply accuracy spread
    const spread = (1 - this.accuracy) * 0.2; // Max 20% spread
    const aimDirection = {
      x: direction.x + (Math.random() - 0.5) * spread,
      y: direction.y + (Math.random() - 0.5) * spread
    };
    
    // Normalize direction
    const magnitude = Math.sqrt(aimDirection.x ** 2 + aimDirection.y ** 2);
    if (magnitude > 0) {
      aimDirection.x /= magnitude;
      aimDirection.y /= magnitude;
    }
    
    // Fire weapon
    const bullets = this.weaponSystem.fire(
      this.bot.currentWeapon,
      this.bot.position,
      aimDirection,
      this.bot.id
    );
    
    if (bullets) {
      this.bot.lastShotTime = now;
      console.log('🔫 Bot fired weapon:', this.bot.id, this.bot.currentWeapon);
      
      // Play bot voice occasionally
      if (this.voiceSystem && Math.random() < 0.1) {
        this.voiceSystem.playBotVoice(
          this.bot.id,
          'attacking',
          this.bot.position,
          this.bot.botPersonality
        );
      }
    }
  }
  
  /**
   * Update bot voice behavior
   */
  private updateBotVoice(gameState: GameState): void {
    if (!this.voiceSystem) return;
    
    const now = Date.now();
    const timeSinceLastVoice = now - this.bot.lastVoiceTime;
    
    // Random chatter based on personality
    if (timeSinceLastVoice > 10000 && 
        Math.random() < (this.bot.botPersonality?.chattiness || 0.5) * 0.001) {
      
      let context = 'idle';
      if (this.state === 'attacking') context = 'attacking';
      else if (this.state === 'seeking_enemy') context = 'searching';
      else if (gameState.bombPlanted) context = 'bomb_planted';
      
      this.voiceSystem.playBotVoice(
        this.bot.id,
        context,
        this.bot.position,
        this.bot.botPersonality
      );
      
      this.bot.lastVoiceTime = now;
    }
  }
  
  /**
   * Change bot state
   */
  private changeState(newState: BotState): void {
    if (newState !== this.state) {
      console.log('🤖 Bot state changed:', this.bot.id, this.state, '->', newState);
      this.state = newState;
      this.lastStateChange = Date.now();
      this.destination = null; // Clear destination when changing state
    }
  }
  
  /**
   * Choose a random destination for movement
   */
  private chooseRandomDestination(): Vector2D {
    // In a real game, this would use navigation mesh or waypoints
    const range = 300;
    return {
      x: this.bot.position.x + (Math.random() - 0.5) * range * 2,
      y: this.bot.position.y + (Math.random() - 0.5) * range * 2
    };
  }
  
  /**
   * Calculate distance between two points
   */
  private calculateDistance(a: Vector2D, b: Vector2D): number {
    return Math.sqrt((a.x - b.x) ** 2 + (a.y - b.y) ** 2);
  }
  
  /**
   * Calculate normalized direction vector
   */
  private calculateDirection(from: Vector2D, to: Vector2D): Vector2D {
    const dx = to.x - from.x;
    const dy = to.y - from.y;
    const magnitude = Math.sqrt(dx ** 2 + dy ** 2);
    
    if (magnitude === 0) return { x: 0, y: 0 };
    
    return {
      x: dx / magnitude,
      y: dy / magnitude
    };
  }
  
  /**
   * Get current bot state for debugging
   */
  getBotState(): {
    state: BotState;
    target: string | null;
    destination: Vector2D | null;
    enemiesKnown: number;
  } {
    return {
      state: this.state,
      target: this.target?.playerId || null,
      destination: this.destination,
      enemiesKnown: this.memory.enemies.size
    };
  }
  
  /**
   * Set bot difficulty
   */
  setDifficulty(difficulty: BotDifficulty): void {
    this.difficulty = difficulty;
    this.setDifficultyParameters();
  }
}