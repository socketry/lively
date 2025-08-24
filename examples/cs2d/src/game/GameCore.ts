import { PhysicsEngine, Vector2D, RigidBody } from './physics/PhysicsEngine';
import { Renderer, ParticleEffect } from './graphics/Renderer';
import { WeaponSystem } from './weapons/WeaponSystem';
import { CS16AudioManager, SurfaceType } from './audio/CS16AudioManager';
import { CS16BotVoiceSystem, BotPersonality } from './audio/CS16BotVoiceSystem';
import { CS16AmbientSystem } from './audio/CS16AmbientSystem';
import { MapSystem } from './maps/MapSystem';
import { GameStateManager } from './GameStateManager';
import { DamageSystem } from './systems/DamageSystem';
import { BotAI, BotDifficulty } from './ai/BotAI';
import { BuyMenuSystem, BuyMenuState } from './systems/BuyMenuSystem';
import { RoundSystem, RoundStats } from './systems/RoundSystem';
import { HUD, HUDElements } from './ui/HUD';
import { BombSystem, BombSite, C4Bomb } from './systems/BombSystem';
import { InputSystem, InputCallbacks } from './systems/InputSystem';
import { CollisionSystem, CollisionDependencies, CollisionEffects } from './systems/CollisionSystem';
import { GAME_CONSTANTS } from './config/gameConstants';

export interface Player {
  id: string;
  name: string;
  team: 'ct' | 't';
  position: Vector2D;
  velocity: Vector2D;
  health: number;
  armor: number;
  money: number;
  score: number;
  kills: number;
  deaths: number;
  assists: number;
  currentWeapon: string;
  weapons: string[];
  ammo: Map<string, number>;
  isAlive: boolean;
  isDucking: boolean;
  isWalking: boolean;
  isScoped: boolean;
  lastShotTime: number;
  // Rendering optimization - track when visual properties change
  lastRenderedHealth?: number;
  lastRenderedTeam?: 'ct' | 't';
  lastRenderedAlive?: boolean;
  lastRenderedOrientation?: number;
  lastStepTime: number;
  lastPosition: Vector2D;
  currentSurface: SurfaceType;
  lastDamageTime: number;
  isInPain: boolean;
  orientation: number; // For 3D audio
  isBot: boolean;
  botPersonality?: BotPersonality;
  lastVoiceTime: number;
}

export interface GameState {
  roundNumber: number;
  roundTime: number;
  freezeTime: number;
  bombPlanted: boolean;
  bombPosition?: Vector2D;
  bombTimer: number;
  ctScore: number;
  tScore: number;
  gameMode: 'competitive' | 'casual' | 'deathmatch' | 'gungame';
  maxRounds: number;
  roundWinCondition?: 'elimination' | 'bomb_exploded' | 'bomb_defused' | 'time';
}

export class GameCore {
  private canvas: HTMLCanvasElement;
  private physics: PhysicsEngine;
  private renderer: Renderer;
  private weapons: WeaponSystem;
  private audio: CS16AudioManager;
  private botVoice: CS16BotVoiceSystem;
  private ambient: CS16AmbientSystem;
  private maps: MapSystem;
  private stateManager: GameStateManager;
  private damageSystem: DamageSystem;
  private buyMenuSystem: BuyMenuSystem;
  private roundSystem: RoundSystem;
  private hud: HUD;
  private bombSystem: BombSystem;
  private inputSystem: InputSystem;
  private collisionSystem: CollisionSystem;
  private botAIs: Map<string, BotAI> = new Map();
  
  private players: Map<string, Player> = new Map();
  private localPlayerId: string = '';
  private gameState: GameState;
  
  // Input handling now managed by InputSystem
  
  private lastUpdateTime: number = 0;
  private fps: number = 0;
  private frameCount: number = 0;
  private fpsUpdateTime: number = performance.now();
  
  constructor(canvas: HTMLCanvasElement) {
    this.canvas = canvas;
    
    // Initialize game state FIRST before other systems that depend on it
    this.gameState = {
      roundNumber: 1,
      roundTime: GAME_CONSTANTS.ROUND.DEFAULT_ROUND_TIME,
      freezeTime: GAME_CONSTANTS.ROUND.FREEZE_TIME,
      bombPlanted: false,
      bombTimer: GAME_CONSTANTS.ROUND.BOMB_TIMER,
      ctScore: 0,
      tScore: 0,
      gameMode: 'competitive',
      maxRounds: GAME_CONSTANTS.ROUND.MAX_ROUNDS
    };
    
    // Initialize systems
    this.physics = new PhysicsEngine();
    this.renderer = new Renderer(canvas);
    this.audio = new CS16AudioManager();
    this.botVoice = new CS16BotVoiceSystem(this.audio);
    this.ambient = new CS16AmbientSystem(this.audio);
    this.weapons = new WeaponSystem(this.audio);
    this.maps = new MapSystem();
    this.stateManager = new GameStateManager();
    this.damageSystem = new DamageSystem(this.audio);
    this.buyMenuSystem = new BuyMenuSystem(this.weapons, this.audio);
    this.roundSystem = new RoundSystem(this.gameState, this.players, this.audio);
    this.hud = new HUD(canvas, this.weapons);
    this.bombSystem = new BombSystem(this.audio);
    this.inputSystem = new InputSystem(canvas);
    
    // Initialize CollisionSystem with required dependencies
    this.collisionSystem = new CollisionSystem(this.createCollisionDependencies());
    
    // Setup bomb system event listeners
    this.setupBombSystemEvents();
    
    console.log('💥 DamageSystem initialized and integrated into GameCore');
    console.log('🤖 BotAI system ready for bot players');
    console.log('💰 BuyMenuSystem initialized and integrated into GameCore');
    console.log('🔄 RoundSystem initialized and integrated into GameCore');
    console.log('🖥️ HUD system initialized and integrated into GameCore');
    console.log('💣 BombSystem initialized and integrated into GameCore');
    console.log('🎯 CollisionSystem initialized - extracted 100+ lines from GameCore');
    console.log('🧪 Testing: Press H to damage, J to heal, K to add bot player, B to open buy menu, N for new round, E for bomb actions, M for C4, F1 for debug');
    
    // Connect state manager to core systems
    this.stateManager.connectGameCore(this);
    this.stateManager.connectAudioManager(this.audio);
    
    // Initialize CS 1.6 audio system
    this.initializeAudio();
    
    // Initialize and setup InputSystem
    this.setupInputSystem();
    this.loadDefaultMap();
  }
  
  private async initializeAudio(): Promise<void> {
    try {
      console.log('🎵 Initializing CS 1.6 audio system...');
      await this.audio.initialize();
      
      // Start default ambient environment
      this.ambient.setEnvironment('outdoor');
      
      console.log('✅ CS 1.6 audio system ready');
    } catch (error) {
      console.error('❌ Failed to initialize CS 1.6 audio:', error);
    }
  }
  
  private setupInputSystem(): void {
    console.log('🎮 Setting up InputSystem with callbacks');
    
    // Set up input callbacks
    const inputCallbacks: InputCallbacks = {
      onMovementInput: (playerId, acceleration) => {
        // Movement is handled in updatePlayer via getMovementInput
      },
      onWeaponFire: (playerId, direction) => {
        const player = this.players.get(playerId);
        if (player && player.isAlive) {
          this.fireWeapon(player, direction);
        }
      },
      onWeaponReload: (playerId) => {
        const player = this.players.get(playerId);
        if (player) {
          this.reloadWeapon(player);
        }
      },
      onWeaponSwitch: (playerId, slot) => {
        const player = this.players.get(playerId);
        if (player) {
          this.switchWeapon(player, slot);
        }
      },
      onJump: (playerId) => {
        const player = this.players.get(playerId);
        if (player) {
          this.playerJump(player);
        }
      },
      onDuck: (playerId, isDucking) => {
        const player = this.players.get(playerId);
        if (player) {
          player.isDucking = isDucking;
        }
      },
      onWalk: (playerId, isWalking) => {
        const player = this.players.get(playerId);
        if (player) {
          player.isWalking = isWalking;
        }
      },
      onRadioCommand: (playerId, command) => {
        const player = this.players.get(playerId);
        if (player) {
          this.handleRadioCommand(player, command);
        }
      },
      onBuyMenuToggle: (playerId) => {
        const player = this.players.get(playerId);
        if (player) {
          this.handleBuyMenuToggle(player);
        }
      },
      onBuyMenuPurchase: (playerId) => {
        const player = this.players.get(playerId);
        if (player) {
          this.handleBuyMenuPurchase(player);
        }
      },
      onBombAction: (playerId) => {
        const player = this.players.get(playerId);
        if (player) {
          this.handleBombAction(player);
        }
      },
      onDigitKey: (playerId, digit) => {
        const player = this.players.get(playerId);
        if (player) {
          this.handleDigitKey(player, digit);
        }
      },
      onTestAction: (playerId, action) => {
        const player = this.players.get(playerId);
        if (player) {
          this.handleTestAction(player, action);
        }
      },
      onDebugToggle: (key) => {
        this.handleDebugToggle(key);
      }
    };
    
    // Initialize InputSystem and set callbacks
    this.inputSystem.initialize();
    this.inputSystem.setCallbacks(inputCallbacks);
    
    console.log('✅ InputSystem setup complete');
  }

  /**
   * Create collision system dependencies with proper separation of concerns
   */
  private createCollisionDependencies(): CollisionDependencies {
    // Create collision effects interface to handle visual/audio effects
    const effects: CollisionEffects = {
      createBloodEffect: (position: Vector2D) => {
        this.renderer.createParticleEffect('blood', position.x, position.y);
      },
      createSparkEffect: (position: Vector2D) => {
        this.renderer.createParticleEffect('spark', position.x, position.y);
      },
      addKillFeedEntry: (killerName: string, victimName: string, weapon: string, headshot: boolean) => {
        this.hud.addKillFeedEntry(killerName, victimName, weapon, headshot);
      },
      handlePlayerDeathReward: (player: Player, killerId?: string) => {
        this.handlePlayerDeathReward(player, killerId);
      }
    };

    return {
      audio: this.audio,
      damageSystem: this.damageSystem,
      effects: effects,
      getTileAt: (position: Vector2D) => this.maps.getTileAt(position),
      clearBullet: (bulletId: string) => this.weapons.clearBullet(bulletId),
      handleBulletHit: (bulletId: string, armor: number) => this.weapons.handleBulletHit(bulletId, armor),
      emitNetworkEvent: (event: any) => this.stateManager.emit(event)
    };
  }
  
  private loadDefaultMap(): void {
    const dustMap = this.maps.getCurrentMap();
    if (dustMap) {
      this.maps.loadMap(dustMap);
      
      // Add map collision bodies to physics AND visual sprites to renderer
      dustMap.tiles.forEach(row => {
        row.forEach(tile => {
          // Add visual sprite for ALL tiles (floors and walls)
          const tileSprite = this.createTileSprite(tile);
          this.renderer.addSprite(`tile_sprite_${tile.x}_${tile.y}`, tileSprite, 1); // Layer 1 for floor/walls
          
          if (!tile.walkable) {
            // Add physics body for collision only on non-walkable tiles
            // Collider position should match the tile's actual position
            this.physics.addBody({
              id: `tile_${tile.x}_${tile.y}`,
              position: { x: tile.x + 16, y: tile.y + 16 }, // Center of tile
              velocity: { x: 0, y: 0 },
              acceleration: { x: 0, y: 0 },
              mass: Infinity,
              friction: 0,
              restitution: 0.5,
              isStatic: true,
              collider: { 
                x: tile.x + 16, // Center position to match sprite
                y: tile.y + 16,
                width: 32, 
                height: 32 
              },
              type: 'rectangle'
            });
          }
        });
      });
      
      // Add map objects to physics AND visual sprites
      dustMap.objects.forEach(obj => {
        // Create visual sprite for object
        const objectSprite = this.createObjectSprite(obj);
        this.renderer.addSprite(`object_sprite_${obj.id}`, objectSprite, 3); // Layer 3 for objects
        
        // Add physics body for collision
        this.physics.addBody({
          id: obj.id,
          position: obj.position,
          velocity: { x: 0, y: 0 },
          acceleration: { x: 0, y: 0 },
          mass: 1000,
          friction: 0.8,
          restitution: 0.2,
          isStatic: true,
          collider: {
            x: obj.position.x, // Use center position
            y: obj.position.y,
            width: obj.size.x,
            height: obj.size.y
          },
          type: 'rectangle'
        });
      });
    }
  }
  
  /**
   * Create visual sprite for a map tile
   */
  private createTileSprite(tile: any): any {
    // Create a simple colored canvas as texture since we don't have image assets
    const canvas = document.createElement('canvas');
    canvas.width = 32;
    canvas.height = 32;
    const ctx = canvas.getContext('2d')!;
    
    // Choose color based on tile type
    let color: string;
    switch (tile.type) {
      case 'wall':
        color = '#8B4513'; // Brown wall
        break;
      case 'floor':
        color = '#D2B48C'; // Sandy floor
        break;
      case 'metal':
        color = '#708090'; // Gray metal
        break;
      case 'wood':
        color = '#A0522D'; // Wood brown
        break;
      case 'water':
        color = '#4682B4'; // Steel blue water
        break;
      case 'glass':
        color = '#87CEEB'; // Sky blue glass
        break;
      default:
        color = '#D2B48C'; // Default sandy
    }
    
    // Fill the tile
    ctx.fillStyle = color;
    ctx.fillRect(0, 0, 32, 32);
    
    // Add border for walls
    if (tile.type === 'wall') {
      ctx.strokeStyle = '#654321';
      ctx.lineWidth = 2;
      ctx.strokeRect(1, 1, 30, 30);
      
      // Add some texture lines
      ctx.strokeStyle = '#5D4037';
      ctx.lineWidth = 1;
      ctx.beginPath();
      ctx.moveTo(8, 0);
      ctx.lineTo(8, 32);
      ctx.moveTo(16, 0);
      ctx.lineTo(16, 32);
      ctx.moveTo(24, 0);
      ctx.lineTo(24, 32);
      ctx.stroke();
    }
    
    // Use the canvas directly as the image source
    // Canvas elements can be drawn directly with drawImage
    return {
      image: canvas, // Use canvas directly instead of converting to Image
      x: tile.x + 16, // Center position
      y: tile.y + 16,
      width: 32,
      height: 32,
      rotation: 0,
      scale: 1,
      opacity: 1
    };
  }
  
  /**
   * Create visual sprite for a map object
   */
  private createObjectSprite(obj: any): any {
    // Create a simple colored canvas as texture
    const canvas = document.createElement('canvas');
    canvas.width = obj.size.x;
    canvas.height = obj.size.y;
    const ctx = canvas.getContext('2d')!;
    
    // Choose color based on object type
    let color: string;
    switch (obj.type) {
      case 'crate':
        color = '#A0522D'; // Wood brown
        break;
      case 'barrel':
        color = '#8B0000'; // Dark red
        break;
      case 'car':
        color = '#2F4F4F'; // Dark slate gray
        break;
      default:
        color = '#696969'; // Dim gray
    }
    
    // Fill the object
    ctx.fillStyle = color;
    ctx.fillRect(0, 0, obj.size.x, obj.size.y);
    
    // Add border
    ctx.strokeStyle = '#000000';
    ctx.lineWidth = 2;
    ctx.strokeRect(1, 1, obj.size.x - 2, obj.size.y - 2);
    
    // Add details based on type
    if (obj.type === 'crate') {
      // Add wood planks
      ctx.strokeStyle = '#654321';
      ctx.lineWidth = 1;
      for (let i = 8; i < obj.size.y; i += 8) {
        ctx.beginPath();
        ctx.moveTo(0, i);
        ctx.lineTo(obj.size.x, i);
        ctx.stroke();
      }
    } else if (obj.type === 'barrel') {
      // Add barrel rings
      ctx.strokeStyle = '#000000';
      ctx.lineWidth = 2;
      const rings = 3;
      for (let i = 1; i <= rings; i++) {
        const y = (obj.size.y / (rings + 1)) * i;
        ctx.beginPath();
        ctx.moveTo(2, y);
        ctx.lineTo(obj.size.x - 2, y);
        ctx.stroke();
      }
    }
    
    // Use the canvas directly as the image source
    return {
      image: canvas, // Use canvas directly
      x: obj.position.x,
      y: obj.position.y,
      width: obj.size.x,
      height: obj.size.y,
      rotation: obj.rotation || 0,
      scale: 1,
      opacity: 1
    };
  }
  
  /**
   * Create visual sprite for a player with improved 3D appearance
   */
  private createPlayerSprite(player: Player): any {
    // Create a larger canvas for better detail
    const canvas = document.createElement('canvas');
    canvas.width = 40;
    canvas.height = 40;
    const ctx = canvas.getContext('2d')!;
    
    // Center point
    const cx = 20;
    const cy = 20;
    
    // Team colors with depth
    const isAlive = player.isAlive;
    const teamColor = player.team === 'ct' ? '#4169E1' : '#DC143C'; // Blue for CT, Red for T
    const darkTeamColor = player.team === 'ct' ? '#1E3A8A' : '#8B0000'; // Darker shades
    const lightTeamColor = player.team === 'ct' ? '#6495ED' : '#FF6347'; // Lighter shades
    
    // Draw shadow to lift player off ground
    if (isAlive) {
      const shadowGradient = ctx.createRadialGradient(cx, cy + 3, 0, cx, cy + 3, 14);
      shadowGradient.addColorStop(0, 'rgba(0, 0, 0, 0.3)');
      shadowGradient.addColorStop(1, 'rgba(0, 0, 0, 0)');
      ctx.fillStyle = shadowGradient;
      ctx.fillRect(0, 0, 40, 40);
    }
    
    // Draw main body with gradient for 3D effect
    const bodyGradient = ctx.createRadialGradient(cx - 4, cy - 4, 2, cx, cy, 14);
    bodyGradient.addColorStop(0, lightTeamColor);
    bodyGradient.addColorStop(0.5, teamColor);
    bodyGradient.addColorStop(1, darkTeamColor);
    
    ctx.fillStyle = bodyGradient;
    ctx.beginPath();
    ctx.arc(cx, cy, 14, 0, Math.PI * 2);
    ctx.fill();
    
    // Add inner highlight for depth
    const highlightGradient = ctx.createRadialGradient(cx - 3, cy - 3, 0, cx - 3, cy - 3, 8);
    highlightGradient.addColorStop(0, 'rgba(255, 255, 255, 0.5)');
    highlightGradient.addColorStop(1, 'rgba(255, 255, 255, 0)');
    ctx.fillStyle = highlightGradient;
    ctx.beginPath();
    ctx.arc(cx - 3, cy - 3, 8, 0, Math.PI * 2);
    ctx.fill();
    
    // Add dark outline for definition
    ctx.strokeStyle = darkTeamColor;
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.arc(cx, cy, 14, 0, Math.PI * 2);
    ctx.stroke();
    
    // Draw directional indicator with 3D arrow
    ctx.save();
    ctx.translate(cx, cy);
    
    // Arrow body with gradient
    const arrowGradient = ctx.createLinearGradient(0, 0, 10, 0);
    arrowGradient.addColorStop(0, '#FFFFFF');
    arrowGradient.addColorStop(1, '#CCCCCC');
    ctx.fillStyle = arrowGradient;
    ctx.beginPath();
    ctx.moveTo(12, 0);  // Arrow tip
    ctx.lineTo(4, -5);  // Top left
    ctx.lineTo(4, -2);  // Inner top
    ctx.lineTo(0, -2);  // Base top
    ctx.lineTo(0, 2);   // Base bottom
    ctx.lineTo(4, 2);   // Inner bottom
    ctx.lineTo(4, 5);   // Bottom left
    ctx.closePath();
    ctx.fill();
    
    // Arrow outline
    ctx.strokeStyle = '#333333';
    ctx.lineWidth = 1;
    ctx.stroke();
    ctx.restore();
    
    // Add weapon indicator dot
    if (player.currentWeapon && player.currentWeapon !== 'knife') {
      ctx.fillStyle = '#FFD700'; // Gold for armed
      ctx.strokeStyle = '#B8860B';
      ctx.lineWidth = 1;
      ctx.beginPath();
      ctx.arc(cx + 8, cy - 8, 3, 0, Math.PI * 2);
      ctx.fill();
      ctx.stroke();
    }
    
    // Add health indicator bar
    if (isAlive) {
      const healthPercent = player.health / 100;
      const barWidth = 24;
      const barHeight = 3;
      const barX = cx - barWidth / 2;
      const barY = cy + 16;
      
      // Health bar background
      ctx.fillStyle = 'rgba(0, 0, 0, 0.5)';
      ctx.fillRect(barX, barY, barWidth, barHeight);
      
      // Health bar fill
      const healthColor = healthPercent > 0.6 ? '#00FF00' : 
                         healthPercent > 0.3 ? '#FFFF00' : '#FF0000';
      ctx.fillStyle = healthColor;
      ctx.fillRect(barX, barY, barWidth * healthPercent, barHeight);
      
      // Health bar border
      ctx.strokeStyle = '#000000';
      ctx.lineWidth = 1;
      ctx.strokeRect(barX, barY, barWidth, barHeight);
    }
    
    // Apply death effect
    if (!isAlive) {
      ctx.globalAlpha = 0.5;
      ctx.fillStyle = 'rgba(128, 128, 128, 0.5)';
      ctx.fillRect(0, 0, 40, 40);
    }
    
    // Use the canvas directly as the image source
    return {
      image: canvas, // Use canvas directly
      x: player.position.x,
      y: player.position.y,
      width: 40,
      height: 40,
      rotation: player.orientation || 0, // Use player orientation for rotation
      scale: 1,
      opacity: isAlive ? 1 : 0.6
    };
  }
  
  public addPlayer(player: Player): void {
    // Initialize new player properties for CS 1.6 audio
    player.lastPosition = { ...player.position };
    player.currentSurface = { material: 'concrete', volume: 1.0 };
    player.lastDamageTime = 0;
    player.isInPain = false;
    player.orientation = 0;
    player.lastVoiceTime = 0;
    
    // Initialize rendering optimization properties
    player.lastRenderedHealth = player.health;
    player.lastRenderedTeam = player.team;
    player.lastRenderedAlive = player.isAlive;
    player.lastRenderedOrientation = player.orientation;
    
    // Initialize bot-specific properties with more randomization
    if (player.isBot) {
      // Randomize personality traits more significantly
      player.botPersonality = {
        aggressiveness: 0.2 + Math.random() * 0.6,  // 0.2-0.8 range
        chattiness: 0.3 + Math.random() * 0.5,      // 0.3-0.8 range
        helpfulness: 0.4 + Math.random() * 0.4,     // 0.4-0.8 range
        responseFrequency: 0.5 + Math.random() * 0.5 // 0.5-1.0 range
      };
      
      // Add random initial orientation offset to prevent synchronized movement
      player.orientation = (player.orientation || 0) + (Math.random() - 0.5) * Math.PI / 4;
      
      // Randomize initial velocity slightly to break symmetry
      player.velocity.x += (Math.random() - 0.5) * 20;
      player.velocity.y += (Math.random() - 0.5) * 20;
      
      // Create BotAI instance with varied difficulty distribution
      const difficultyRoll = Math.random();
      const difficulty: BotDifficulty = difficultyRoll > 0.7 ? 'hard' : 
                                        difficultyRoll > 0.3 ? 'normal' : 'easy';
      const botAI = new BotAI(player, this.weapons, difficulty, this.botVoice);
      
      // Add random decision delay to desynchronize bot actions
      (botAI as any).decisionDelay = Math.random() * 0.5; // 0-0.5 second random delay
      
      this.botAIs.set(player.id, botAI);
      
      console.log('🤖 Created BotAI for player:', player.id, 
                  'with difficulty:', difficulty,
                  'and personality:', player.botPersonality);
    }
    
    this.players.set(player.id, player);
    
    // Create visual sprite for player
    const playerSprite = this.createPlayerSprite(player);
    this.renderer.addSprite(`player_sprite_${player.id}`, playerSprite, 5); // Layer 5 for players
    
    // Add player physics body
    this.physics.addBody({
      id: `player_${player.id}`,
      position: player.position,
      velocity: player.velocity,
      acceleration: { x: 0, y: 0 },
      mass: 80,
      friction: 0.9,
      restitution: 0,
      isStatic: false,
      collider: { x: player.position.x, y: player.position.y, radius: 16 },
      type: 'circle'
    });
  }
  
  public setLocalPlayer(playerId: string): void {
    this.localPlayerId = playerId;
    const player = this.players.get(playerId);
    if (player) {
      this.renderer.followTarget(player.position);
      this.audio.setListenerPosition(player.position, player.orientation);
    }
    // Also update InputSystem
    this.inputSystem.setLocalPlayer(playerId);
  }
  
  /**
   * Handle test actions from InputSystem
   */
  private handleTestAction(player: Player, action: string): void {
    switch (action) {
      case 'trigger_bot_response':
        this.triggerBotResponse(player, 'round_start');
        break;
      case 'damage':
        console.log('🧪 Testing DamageSystem - applying 20 damage to local player');
        const damageEvent = this.damageSystem.applyDamage(player, {
          amount: 20,
          source: 'test',
          position: player.position,
          weapon: 'test_weapon'
        });
        console.log('💥 Damage test result:', damageEvent);
        break;
      case 'heal':
        console.log('🧪 Testing DamageSystem - healing local player by 25');
        const healEvent = this.damageSystem.healPlayer(player, 25);
        console.log('💚 Heal test result:', healEvent);
        break;
      case 'add_bot':
        this.addTestBot();
        break;
      case 'new_round':
        this.roundSystem.forceNewRound();
        break;
      case 'give_c4':
        if (player.team === 't' && !player.weapons.includes('c4')) {
          player.weapons.push('c4');
          console.log('💣 C4 given to player:', player.id);
        }
        break;
      case 'escape_key':
        // Close buy menu
        const menuState = this.buyMenuSystem.getBuyMenuState(player.id);
        if (menuState?.isOpen) {
          this.buyMenuSystem.closeBuyMenu(player.id);
        }
        break;
    }
  }
  
  /**
   * Handle debug toggle actions from InputSystem
   */
  private handleDebugToggle(key: string): void {
    switch (key) {
      case 'physics':
        (window as any).DEBUG_PHYSICS = !(window as any).DEBUG_PHYSICS;
        console.log('Physics debug:', (window as any).DEBUG_PHYSICS ? 'ON' : 'OFF');
        break;
      case 'debug_info':
        this.hud.toggleDebugInfo();
        break;
    }
  }
  
  /**
   * Handle weapon firing with direction from InputSystem
   */
  private fireWeapon(player: Player, worldMousePos?: Vector2D): void {
    let direction: Vector2D;
    
    if (worldMousePos) {
      // Use direction provided by InputSystem
      direction = {
        x: worldMousePos.x - player.position.x,
        y: worldMousePos.y - player.position.y
      };
    } else {
      // Fallback to old calculation (should not happen with InputSystem)
      const mousePos = this.inputSystem.getMousePosition();
      const worldPos = {
        x: (mousePos.x / this.canvas.width) * 1920,
        y: (mousePos.y / this.canvas.height) * 1080
      };
      
      direction = {
        x: worldPos.x - player.position.x,
        y: worldPos.y - player.position.y
      };
    }
    
    const mag = Math.sqrt(direction.x ** 2 + direction.y ** 2);
    if (mag > 0) {
      direction.x /= mag;
      direction.y /= mag;
    } else {
      // Default direction if mouse is at player position
      direction.x = 1;
      direction.y = 0;
    }
    
    const bullets = this.weapons.fire(
      player.currentWeapon,
      player.position,
      direction,
      player.id
    );
    
    if (bullets) {
      // Emit weapon fire event for multiplayer synchronization
      this.stateManager.emit({
        type: 'weapon_fire',
        playerId: player.id,
        data: { weaponId: player.currentWeapon, direction },
        position: player.position
      });
      
      // Create muzzle flash effect
      this.renderer.createParticleEffect('muzzleFlash', player.position.x, player.position.y);
      
      // Apply recoil
      const recoilOffset = this.weapons.getRecoilOffset(player.id, player.currentWeapon);
      // Apply recoil to camera or crosshair
    }
  }
  
  private updatePlayer(player: Player, deltaTime: number): void {
    if (!player.isAlive) return;
    
    // Store last position for orientation calculation
    player.lastPosition = { ...player.position };
    
    const speed = player.isWalking ? 100 : player.isDucking ? 50 : 200;
    
    // Get movement input from InputSystem
    const acceleration = this.inputSystem.getMovementInput(speed, player.isWalking, player.isDucking);
    
    // Debug: Log movement input occasionally
    if (Math.random() < 0.01 && (acceleration.x !== 0 || acceleration.y !== 0)) {
      console.log('🎮 Movement input:', { acceleration, position: player.position, hasInput: this.inputSystem.hasMovementInput() });
    }
    
    // Calculate orientation for 3D audio
    if (acceleration.x !== 0 || acceleration.y !== 0) {
      player.orientation = Math.atan2(acceleration.y, acceleration.x);
    }
    
    // Get physics body and apply acceleration to it
    const physicsBody = this.physics.getBody(`player_${player.id}`);
    if (physicsBody) {
      // Apply movement through physics system
      physicsBody.acceleration.x = acceleration.x;
      physicsBody.acceleration.y = acceleration.y;
      
      // Update player position from physics body (after physics update)
      player.position = { ...physicsBody.position };
      player.velocity = { ...physicsBody.velocity };
      
      // Only recreate sprite if visual properties changed (massive performance improvement)
      const needsSpriteRecreation = 
        player.lastRenderedHealth !== player.health ||
        player.lastRenderedTeam !== player.team ||
        player.lastRenderedAlive !== player.isAlive ||
        Math.abs((player.lastRenderedOrientation || 0) - player.orientation) > 0.1;
      
      if (needsSpriteRecreation) {
        // Visual properties changed, recreate sprite
        const updatedSprite = this.createPlayerSprite(player);
        this.renderer.updateSprite(`player_sprite_${player.id}`, updatedSprite);
        
        // Update tracked properties
        player.lastRenderedHealth = player.health;
        player.lastRenderedTeam = player.team;
        player.lastRenderedAlive = player.isAlive;
        player.lastRenderedOrientation = player.orientation;
      } else {
        // Only update position and rotation (fast path)
        this.renderer.updateSprite(`player_sprite_${player.id}`, {
          x: player.position.x,
          y: player.position.y,
          rotation: player.orientation
        });
      }
    } else {
      // Fallback to old movement system if physics body not found
      // Apply movement
      player.velocity.x += acceleration.x * deltaTime;
      player.velocity.y += acceleration.y * deltaTime;
      
      // Apply friction
      player.velocity.x *= 0.85;
      player.velocity.y *= 0.85;
      
      // Update position
      const newPosition = {
        x: player.position.x + player.velocity.x * deltaTime,
        y: player.position.y + player.velocity.y * deltaTime
      };
      
      // Check map collision
      if (this.maps.isPositionWalkable(newPosition)) {
        player.position = newPosition;
        
        // Update player sprite position
        this.renderer.updateSprite(`player_sprite_${player.id}`, {
          x: player.position.x,
          y: player.position.y
        });
      } else {
        player.velocity = { x: 0, y: 0 };
      }
    }
    
    // Update surface type for footstep sounds
    this.updatePlayerSurface(player);
    
    // Play authentic CS 1.6 footstep sounds with surface detection
    const isMoving = Math.abs(player.velocity.x) > 10 || Math.abs(player.velocity.y) > 10;
    if (isMoving && player.isAlive) {
      const now = Date.now();
      
      // Adjust footstep timing based on movement type
      let stepInterval = 400; // Normal footsteps
      if (player.isWalking) stepInterval = 600; // Quieter, slower
      if (player.isDucking) stepInterval = 800; // Very slow
      
      if (now - player.lastStepTime > stepInterval) {
        // Use CS 1.6 surface-based footstep sounds
        this.audio.playFootstep(player.position, player.currentSurface);
        player.lastStepTime = now;
        
        // Emit footstep event for multiplayer (only for local player to avoid spam)
        if (player.id === this.localPlayerId) {
          this.stateManager.emit({
            type: 'footstep',
            playerId: player.id,
            data: { surface: player.currentSurface },
            position: player.position
          });
        }
      }
    }
    
    // Update 3D audio listener position for local player
    if (player.id === this.localPlayerId) {
      this.audio.setListenerPosition(player.position, player.orientation);
    }
    
    // Handle pain state recovery
    if (player.isInPain && Date.now() - player.lastDamageTime > 2000) {
      player.isInPain = false;
    }
  }
  
  /**
   * Detect surface type for authentic CS 1.6 footstep sounds
   */
  private updatePlayerSurface(player: Player): void {
    const tile = this.maps.getTileAt(player.position);
    
    if (!tile) {
      player.currentSurface = { material: 'concrete', volume: 1.0 };
      return;
    }
    
    // Map tile types to CS 1.6 surface materials
    switch (tile.type) {
      case 'metal':
        player.currentSurface = { material: 'metal', volume: 1.2 };
        break;
      case 'wood':
        player.currentSurface = { material: 'wood', volume: 1.1 };
        break;
      case 'water':
        player.currentSurface = { material: 'water', volume: 1.6 };
        break;
      default:
        player.currentSurface = { material: 'concrete', volume: 1.0 };
        break;
    }
  }
  
  
  private reloadWeapon(player: Player): void {
    console.log('🔄 Attempting to reload weapon:', player.currentWeapon);
    // Use enhanced weapon system with CS 1.6 sounds
    const reloaded = this.weapons.reload(player.currentWeapon, player.id, player.position);
    
    if (reloaded) {
      console.log('✅ Reload started successfully');
      // Emit reload event for multiplayer synchronization
      this.stateManager.emit({
        type: 'weapon_reload',
        playerId: player.id,
        data: { weaponId: player.currentWeapon },
        position: player.position
      });
    } else {
      console.log('❌ Reload failed or not needed');
    }
  }
  
  private dropWeapon(player: Player): void {
    // Play item drop sound
    this.audio.playUISound('item_pickup'); // CS 1.6 doesn't have specific drop sound, use pickup
    // Implement weapon drop logic
  }
  
  private playerJump(player: Player): void {
    if (player.isDucking) return;
    // Implement jump logic
    // Note: CS 1.6 doesn't have jump sounds, only landing sounds
  }
  
  private switchWeapon(player: Player, slot: number): void {
    const newWeapon = player.weapons[slot - 1];
    if (newWeapon && newWeapon !== player.currentWeapon) {
      // Use enhanced weapon system with CS 1.6 sounds
      this.weapons.switchWeapon(player.currentWeapon, newWeapon, player.id, player.position);
      player.currentWeapon = newWeapon;
    }
  }
  
  private toggleScope(player: Player): void {
    player.isScoped = !player.isScoped;
    // Implement scope logic
  }
  
  private handleBuyMenuToggle(player: Player): void {
    const currentState = this.buyMenuSystem.getBuyMenuState(player.id);
    
    if (currentState?.isOpen) {
      this.buyMenuSystem.closeBuyMenu(player.id);
    } else {
      const canBuy = this.buyMenuSystem.canPlayerBuy(player, this.gameState);
      if (canBuy) {
        const timeLeft = Math.min(15, this.gameState.freezeTime > 0 ? this.gameState.freezeTime : Math.max(0, this.gameState.roundTime - 105));
        this.buyMenuSystem.openBuyMenu(player.id, canBuy, timeLeft);
      } else {
        console.log('❌ Cannot buy - not in buy zone or buy time expired');
      }
    }
  }
  
  private handleDigitKey(player: Player, digit: number): void {
    const menuState = this.buyMenuSystem.getBuyMenuState(player.id);
    
    if (menuState?.isOpen) {
      // Handle buy menu category selection
      const categories = this.buyMenuSystem.getCategories();
      if (digit >= 1 && digit <= categories.length) {
        const category = categories[digit - 1];
        this.buyMenuSystem.selectCategory(player.id, category);
        console.log('🛒 Selected category:', category);
        
        // Auto-select first item in category for quick buying
        const items = this.buyMenuSystem.getItemsForCategory(category, player.team);
        if (items.length > 0) {
          this.buyMenuSystem.selectItem(player.id, items[0].id);
          console.log('🛒 Auto-selected item:', items[0].name);
        }
      }
    } else {
      // Handle weapon switching
      this.switchWeapon(player, digit);
    }
  }
  
  private handleBuyMenuPurchase(player: Player): void {
    const menuState = this.buyMenuSystem.getBuyMenuState(player.id);
    
    if (menuState?.isOpen && menuState.selectedItem) {
      const success = this.buyMenuSystem.buyItem(player, menuState.selectedItem);
      if (success) {
        const item = this.buyMenuSystem.getItem(menuState.selectedItem);
        console.log('✅ Purchase successful:', item?.name, '| Money remaining:', player.money);
      } else {
        console.log('❌ Purchase failed');
      }
    }
  }
  
  private handleBombAction(player: Player): void {
    if (!player.isAlive || !player) return;
    
    if (player.team === 't') {
      // Try to plant bomb
      const plantCheck = this.bombSystem.canPlantBomb(player);
      if (plantCheck.canPlant) {
        const success = this.bombSystem.startPlantBomb(player);
        if (success) {
          console.log('💣 Bomb plant started by:', player.id);
        }
      } else {
        console.log('❌ Cannot plant bomb:', plantCheck.reason);
      }
    } else if (player.team === 'ct') {
      // Try to defuse bomb
      const defuseCheck = this.bombSystem.canDefuseBomb(player);
      if (defuseCheck.canDefuse) {
        const success = this.bombSystem.startDefuseBomb(player);
        if (success) {
          console.log('🛠️ Defuse started by:', player.id);
        }
      } else {
        console.log('❌ Cannot defuse bomb:', defuseCheck.reason);
      }
    }
  }
  
  private renderHUD(localPlayer: Player): void {
    const roundStats = this.roundSystem.getRoundStats();
    const ammoInfo = this.weapons.getCurrentAmmo(localPlayer.id, localPlayer.currentWeapon);
    const currentAmmo = ammoInfo?.current || 0;
    const reserveAmmo = ammoInfo?.reserve || 0;
    const isReloading = this.weapons.isReloading(localPlayer.id, localPlayer.currentWeapon);
    const reloadProgress = this.weapons.getReloadProgress(localPlayer.id, localPlayer.currentWeapon);
    
    const hudElements: HUDElements = {
      health: localPlayer.health,
      armor: localPlayer.armor,
      money: localPlayer.money,
      kills: localPlayer.kills,
      deaths: localPlayer.deaths,
      assists: localPlayer.assists,
      currentWeapon: localPlayer.currentWeapon,
      currentAmmo: currentAmmo,
      reserveAmmo: reserveAmmo,
      isReloading: isReloading,
      reloadProgress: reloadProgress,
      roundTime: this.formatTime(roundStats.timeLeft),
      bombTimer: roundStats.bombPlanted ? this.formatTime(roundStats.bombTimeLeft) : undefined,
      ctScore: roundStats.ctScore,
      tScore: roundStats.tScore,
      playersAlive: { ct: roundStats.ctAlive, t: roundStats.tAlive },
      gameMode: this.gameState.gameMode,
      fps: this.fps
    };
    
    this.hud.render(localPlayer, this.gameState, hudElements);
  }
  
  private formatTime(seconds: number): string {
    const minutes = Math.floor(seconds / 60);
    const remainingSeconds = Math.floor(seconds % 60);
    return `${minutes}:${remainingSeconds.toString().padStart(2, '0')}`;
  }
  
  private setupBombSystemEvents(): void {
    // Handle bomb explosion
    this.bombSystem.onEvent('bomb_exploded', (data: any) => {
      console.log('💥 Bomb exploded! Handling explosion damage...');
      
      // Create explosion effect
      this.renderer.createParticleEffect('explosion', data.position.x, data.position.y);
      
      // Apply explosion damage to all players
      this.players.forEach(player => {
        if (!player.isAlive) return;
        
        const damage = this.bombSystem.calculateExplosionDamage(data.position, player.position);
        if (damage > 0) {
          const damageEvent = this.damageSystem.applyDamage(player, {
            amount: damage,
            source: data.planterId,
            position: data.position,
            weapon: 'c4',
            headshot: false,
            armorPiercing: true // C4 ignores armor
          });
          
          if (damageEvent.type === 'death') {
            // Add kill feed entry for bomb kill
            const planter = this.players.get(data.planterId);
            if (planter) {
              this.hud.addKillFeedEntry(
                planter.name,
                player.name,
                'C4',
                false
              );
            }
            this.handlePlayerDeathReward(player, data.planterId);
          }
        }
      });
    });
    
    // Handle bomb planted
    this.bombSystem.onEvent('bomb_planted', (data: any) => {
      console.log('💣 Bomb planted event received');
      // Update game state
      this.gameState.bombPlanted = true;
      this.gameState.bombPosition = data.position;
    });
    
    // Handle bomb defused
    this.bombSystem.onEvent('bomb_defused', (data: any) => {
      console.log('✅ Bomb defused event received');
      // Award money to defuser
      const defuser = this.players.get(data.playerId);
      if (defuser) {
        defuser.money += 3500; // CS 1.6 defuse reward
      }
    });
  }
  
  /**
   * Add a test bot for testing BotAI integration
   */
  private addTestBot(): void {
    const botId = `bot_${Date.now()}`;
    const team = Math.random() > 0.5 ? 'ct' : 't';
    
    // Find a spawn point
    const spawnPoints = this.maps.getSpawnPoints(team);
    let spawnPosition = { x: 300, y: 300 }; // Default position
    if (spawnPoints.length > 0) {
      const spawn = spawnPoints[Math.floor(Math.random() * spawnPoints.length)];
      spawnPosition = spawn.position;
    }
    
    const testBot: Player = {
      id: botId,
      name: `Bot${Math.floor(Math.random() * 1000)}`,
      team: team,
      position: { ...spawnPosition },
      velocity: { x: 0, y: 0 },
      health: GAME_CONSTANTS.PLAYER.SPAWN_HEALTH,
      armor: GAME_CONSTANTS.PLAYER.SPAWN_ARMOR,
      money: GAME_CONSTANTS.PLAYER.SPAWN_MONEY,
      score: 0,
      kills: 0,
      deaths: 0,
      assists: 0,
      currentWeapon: 'glock',
      weapons: ['glock'],
      ammo: new Map([['glock', 20]]),
      isAlive: true,
      isDucking: false,
      isWalking: false,
      isScoped: false,
      lastShotTime: 0,
      lastStepTime: 0,
      lastPosition: { ...spawnPosition },
      currentSurface: { material: 'concrete', volume: 1.0 },
      lastDamageTime: 0,
      isInPain: false,
      orientation: 0,
      isBot: true,
      lastVoiceTime: 0
    };
    
    this.addPlayer(testBot);
    console.log('🤖 Added test bot:', botId, 'on team:', team, 'at position:', spawnPosition);
  }
  
  public update(deltaTime: number): void {
    // Update physics
    this.physics.update(deltaTime);
    
    // Update players
    this.players.forEach(player => {
      if (player.id === this.localPlayerId) {
        this.updatePlayer(player, deltaTime);
      } else if (player.isBot) {
        // Update bot AI with random decision timing
        const botAI = this.botAIs.get(player.id);
        if (botAI) {
          // Add random micro-delays to bot decisions to prevent synchronization
          const decisionDelay = (botAI as any).decisionDelay || 0;
          if (Math.random() < 1 - decisionDelay) {
            botAI.update(deltaTime, this.gameState, this.players);
          }
          
          // Add small random perturbations to bot movement
          if (Math.random() < 0.1) { // 10% chance per frame
            player.velocity.x += (Math.random() - 0.5) * 10;
            player.velocity.y += (Math.random() - 0.5) * 10;
          }
        }
        // Still need to update bot player physics
        this.updatePlayer(player, deltaTime);
      }
    });
    
    // Update weapons
    this.weapons.updateBullets(deltaTime);
    
    // Check bullet collisions
    this.checkBulletCollisions();
    
    // Update particles
    this.renderer.updateParticles(deltaTime);
    
    // Update round system
    this.roundSystem.update(deltaTime);
    
    // Update bomb system
    this.bombSystem.update(deltaTime);
    
    // Update buy menus
    this.players.forEach(player => {
      this.buyMenuSystem.updateBuyMenu(player.id, deltaTime);
    });
    
    // Update game state (now managed by RoundSystem)
    // this.updateGameState(deltaTime); // Replaced by RoundSystem
    
    // Network events are now processed immediately
    
    // Update FPS
    this.updateFPS();
  }
  
  /**
   * Check bullet collisions using the dedicated CollisionSystem
   * This method replaces the previous 100+ line implementation
   */
  private checkBulletCollisions(): void {
    const bullets = this.weapons.getBullets();
    
    // Delegate collision detection and processing to CollisionSystem
    // This maintains all existing behavior while improving code organization
    this.collisionSystem.checkBulletCollisions(bullets, this.players);
  }
  
  /**
   * Handle post-death rewards and game logic (called after DamageSystem handles death)
   */
  private handlePlayerDeathReward(player: Player, killerId?: string): void {
    // Award kill to killer
    if (killerId) {
      const killer = this.players.get(killerId);
      if (killer) {
        killer.kills++;
        killer.score += 1;
        // Add money reward based on weapon used
        killer.money += 300; // Base kill reward
        
        console.log('💰 Kill reward given to:', killer.id, 'for killing:', player.id);
      }
    }
    
    // Remove physics body
    this.physics.removeBody(`player_${player.id}`);
    
    // Update player sprite to show death state
    this.renderer.updateSprite(`player_sprite_${player.id}`, {
      opacity: 0.5 // Make dead player semi-transparent
    });
    
    // Check round end conditions
    this.checkRoundEnd();
  }

  private handlePlayerDeath(player: Player, killerId?: string): void {
    player.isAlive = false;
    player.deaths++;
    player.isInPain = false; // Reset pain state
    
    // Award kill to killer
    if (killerId) {
      const killer = this.players.get(killerId);
      if (killer) {
        killer.kills++;
        killer.score += 1;
        // Add money reward based on weapon used
        killer.money += 300; // Base kill reward
      }
    }
    
    // Emit death event for multiplayer synchronization
    this.stateManager.emit({
      type: 'player_death',
      playerId: player.id,
      data: { killerId },
      position: player.position
    });
    
    // Play authentic CS 1.6 death sound
    this.audio.playPlayerSound('death', player.position);
    
    // Create death effect
    this.renderer.createParticleEffect('blood', player.position.x, player.position.y);
    
    // Remove physics body
    this.physics.removeBody(`player_${player.id}`);
    
    // Check round end conditions
    this.checkRoundEnd();
  }
  
  // Game state is now managed by RoundSystem
  // private updateGameState method removed - replaced by RoundSystem.update()
  
  private handleBombExplosion(): void {
    if (this.gameState.bombPosition) {
      // Create explosion effect
      this.renderer.createParticleEffect('explosion', 
        this.gameState.bombPosition.x, 
        this.gameState.bombPosition.y
      );
      
      // Play explosion sound
      this.audio.play('explosion', this.gameState.bombPosition);
      
      // Apply explosion damage
      this.physics.applyExplosionForce(this.gameState.bombPosition, 500, 1000);
      
      // Damage players in radius
      this.players.forEach(player => {
        const distance = Math.sqrt(
          (player.position.x - this.gameState.bombPosition!.x) ** 2 +
          (player.position.y - this.gameState.bombPosition!.y) ** 2
        );
        
        if (distance < 500) {
          const damage = Math.max(0, 200 * (1 - distance / 500));
          player.health -= damage;
          if (player.health <= 0) {
            this.handlePlayerDeath(player);
          }
        }
      });
    }
    
    this.endRound('bomb_exploded');
  }
  
  private checkRoundEnd(): void {
    const aliveCT = Array.from(this.players.values()).filter(p => p.team === 'ct' && p.isAlive).length;
    const aliveT = Array.from(this.players.values()).filter(p => p.team === 't' && p.isAlive).length;
    
    if (aliveCT === 0) {
      this.endRound('elimination');
    } else if (aliveT === 0 && !this.gameState.bombPlanted) {
      this.endRound('elimination');
    }
  }
  
  private endRound(condition: string): void {
    this.gameState.roundWinCondition = condition as any;
    
    // Update scores
    if (condition === 'bomb_exploded' || (condition === 'elimination' && this.gameState.bombPlanted)) {
      this.gameState.tScore++;
    } else {
      this.gameState.ctScore++;
    }
    
    // Play round end sound
    this.audio.play('round_end');
    
    // Reset round after delay
    setTimeout(() => this.resetRound(), 5000);
  }
  
  private resetRound(): void {
    this.gameState.roundNumber++;
    this.gameState.roundTime = 115;
    this.gameState.freezeTime = 15;
    this.gameState.bombPlanted = false;
    this.gameState.bombTimer = 40;
    
    // Respawn players using DamageSystem reset
    this.players.forEach(player => {
      // Reset player health, armor, and damage state
      this.damageSystem.resetPlayer(player);
      
      // Reset to spawn point
      const spawnPoints = this.maps.getSpawnPoints(player.team);
      if (spawnPoints.length > 0) {
        const spawn = spawnPoints[Math.floor(Math.random() * spawnPoints.length)];
        player.position = { ...spawn.position };
      }
      
      // Reset bot AI state if it's a bot
      if (player.isBot) {
        const botAI = this.botAIs.get(player.id);
        if (botAI) {
          // Bot AI will reset its state when it sees the player is alive again
          console.log('🤖 Bot AI reset for round start:', player.id);
        }
      }
      
      // Restore player sprite visibility
      this.renderer.updateSprite(`player_sprite_${player.id}`, {
        x: player.position.x,
        y: player.position.y,
        opacity: 1 // Fully visible again
      });
      
      // Re-add physics body
      this.physics.addBody({
        id: `player_${player.id}`,
        position: player.position,
        velocity: { x: 0, y: 0 },
        acceleration: { x: 0, y: 0 },
        mass: 80,
        friction: 0.9,
        restitution: 0,
        isStatic: false,
        collider: { x: player.position.x, y: player.position.y, radius: 16 },
        type: 'circle'
      });
    });
  }
  
  private updateFPS(): void {
    this.frameCount++;
    const now = performance.now();
    
    if (now - this.fpsUpdateTime >= 1000) {
      this.fps = this.frameCount;
      this.frameCount = 0;
      this.fpsUpdateTime = now;
    }
  }
  
  public render(): void {
    this.renderer.render();
    
    // Render debug physics if enabled
    if ((window as any).DEBUG_PHYSICS) {
      this.renderDebugPhysics();
    }
    
    // Render HUD for local player
    const localPlayer = this.players.get(this.localPlayerId);
    if (localPlayer) {
      this.renderHUD(localPlayer);
    }
    
    // Render FPS counter (legacy - now included in HUD debug)
    // this.renderFPS();
  }
  
  private renderFPS(): void {
    const ctx = this.canvas.getContext('2d');
    if (!ctx) return;
    
    ctx.save();
    ctx.fillStyle = '#00ff00';
    ctx.font = '14px monospace';
    ctx.textAlign = 'left';
    ctx.fillText(`FPS: ${this.fps}`, 10, 20);
    if ((window as any).DEBUG_PHYSICS) {
      ctx.fillText('Physics Debug: ON (Press P to toggle)', 10, 40);
    }
    ctx.restore();
  }
  
  private renderDebugPhysics(): void {
    // Render physics bodies for debugging
    this.physics.getBodies().forEach(body => {
      if (body.type === 'circle') {
        const circle = body.collider as any;
        this.renderer.renderDebugCircle(
          { x: circle.x, y: circle.y },
          circle.radius,
          body.isStatic ? 'rgba(255, 0, 0, 0.3)' : 'rgba(0, 255, 0, 0.3)'
        );
      } else {
        const rect = body.collider as any;
        this.renderer.renderDebugRect(
          { x: rect.x, y: rect.y },
          rect.width,
          rect.height,
          body.isStatic ? 'rgba(255, 0, 0, 0.3)' : 'rgba(0, 255, 0, 0.3)'
        );
      }
    });
  }
  
  /**
   * Handle radio command from player
   */
  private handleRadioCommand(player: Player, command: string): void {
    // Play player radio command
    const success = this.botVoice.playRadioCommand(command, player.position);
    
    if (success) {
      // Trigger responses from nearby bots
      const nearbyBots = Array.from(this.players.values()).filter(p => 
        p.id !== player.id && 
        p.team === player.team && 
        p.isAlive &&
        this.calculateDistance(p.position, player.position) < 800
      );
      
      // Some bots might respond
      nearbyBots.forEach(bot => {
        if (Math.random() < 0.3) { // 30% chance to respond
          setTimeout(() => {
            this.botVoice.playBotVoice(
              bot.id,
              'radio_response',
              bot.position,
              bot.botPersonality || undefined
            );
          }, 500 + Math.random() * 1000);
        }
      });
    }
  }
  
  /**
   * Trigger bot response to game events
   */
  private triggerBotResponse(player: Player, context: string): void {
    const nearbyBots = Array.from(this.players.values()).filter(p => 
      p.id !== player.id && 
      p.isAlive &&
      this.calculateDistance(p.position, player.position) < 600
    );
    
    nearbyBots.forEach(bot => {
      if (Math.random() < 0.2) { // 20% chance to respond
        setTimeout(() => {
          this.botVoice.playBotVoice(
            bot.id,
            context,
            bot.position,
            bot.botPersonality || undefined
          );
        }, 200 + Math.random() * 800);
      }
    });
  }

  /**
   * Calculate distance between two positions
   */
  private calculateDistance(pos1: Vector2D, pos2: Vector2D): number {
    return Math.sqrt((pos1.x - pos2.x) ** 2 + (pos1.y - pos2.y) ** 2);
  }

  private animationFrameId: number | null = null;
  private isRunning: boolean = false;

  public start(): void {
    if (this.isRunning) {
      console.log('⚠️ Game loop already running');
      return;
    }
    
    this.isRunning = true;
    const gameLoop = () => {
      if (!this.isRunning) return;
      
      const now = performance.now();
      const deltaTime = (now - this.lastUpdateTime) / 1000;
      this.lastUpdateTime = now;
      
      this.update(deltaTime);
      this.render();
      
      this.animationFrameId = requestAnimationFrame(gameLoop);
    };
    
    this.lastUpdateTime = performance.now();
    gameLoop();
  }
  
  public stop(): void {
    this.isRunning = false;
    if (this.animationFrameId !== null) {
      cancelAnimationFrame(this.animationFrameId);
      this.animationFrameId = null;
    }
    console.log('🛑 Game loop stopped');
  }

  /**
   * Get current game state for UI updates
   */
  public getState(): GameState {
    return { ...this.gameState };
  }

  /**
   * Get player by ID
   */
  public getPlayer(playerId: string): Player | undefined {
    return this.players.get(playerId);
  }

  /**
   * Get all players
   */
  public getPlayers(): Player[] {
    return Array.from(this.players.values());
  }

  /**
   * Get current FPS
   */
  public getFPS(): number {
    return this.fps;
  }

  /**
   * Get local player
   */
  public getLocalPlayer(): Player | undefined {
    return this.players.get(this.localPlayerId);
  }

  /**
   * Get state manager for network access
   */
  public getStateManager(): GameStateManager {
    return this.stateManager;
  }

  /**
   * Get damage system for testing and external access
   */
  public getDamageSystem(): DamageSystem {
    return this.damageSystem;
  }

  /**
   * Get bot AIs for testing and monitoring
   */
  public getBotAIs(): Map<string, BotAI> {
    return this.botAIs;
  }
  
  /**
   * Get buy menu system for UI integration
   */
  public getBuyMenuSystem(): BuyMenuSystem {
    return this.buyMenuSystem;
  }
  
  /**
   * Get round system for UI integration
   */
  public getRoundSystem(): RoundSystem {
    return this.roundSystem;
  }
  
  /**
   * Get HUD system for UI integration
   */
  public getHUD(): HUD {
    return this.hud;
  }
  
  /**
   * Get bomb system for UI integration
   */
  public getBombSystem(): BombSystem {
    return this.bombSystem;
  }
  
  /**
   * Get input system for debugging and external access
   */
  public getInputSystem(): InputSystem {
    return this.inputSystem;
  }
}