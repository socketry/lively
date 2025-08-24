import { PhysicsEngine, Vector2D, RigidBody } from './physics/PhysicsEngine';
import { Renderer, ParticleEffect } from './graphics/Renderer';
import { WeaponSystem } from './weapons/WeaponSystem';
import { CS16AudioManager, SurfaceType } from './audio/CS16AudioManager';
import { CS16BotVoiceSystem, BotPersonality } from './audio/CS16BotVoiceSystem';
import { CS16AmbientSystem } from './audio/CS16AmbientSystem';
import { MapSystem } from './maps/MapSystem';
import { GameStateManager } from './GameStateManager';

// Import new systems
import { DamageSystem, DamageInfo } from './systems/DamageSystem';
import { BuyMenuSystem } from './systems/BuyMenuSystem';
import { RoundSystem } from './systems/RoundSystem';
import { BombSystem } from './systems/BombSystem';
import { BotAI } from './ai/BotAI';
import { HUD, HUDElements } from './ui/HUD';
import { CollisionSystem, CollisionDependencies, CollisionEffects } from './systems/CollisionSystem';

// Import and re-export interfaces
import { Player, GameState } from './GameCore';
export { Player, GameState };

export class EnhancedGameCore {
  private canvas: HTMLCanvasElement;
  private physics: PhysicsEngine;
  private renderer: Renderer;
  private weapons: WeaponSystem;
  private audio: CS16AudioManager;
  private botVoice: CS16BotVoiceSystem;
  private ambient: CS16AmbientSystem;
  private maps: MapSystem;
  private stateManager: GameStateManager;
  
  // New systems
  private damageSystem: DamageSystem;
  private buyMenuSystem: BuyMenuSystem;
  private roundSystem: RoundSystem;
  private bombSystem: BombSystem;
  private hud: HUD;
  private collisionSystem: CollisionSystem;
  private botAI: Map<string, BotAI> = new Map();
  
  private players: Map<string, Player> = new Map();
  private localPlayerId: string = '';
  private gameState: GameState;
  
  private input: {
    keys: Set<string>;
    mouse: { x: number; y: number; buttons: number };
  };
  
  private lastUpdateTime: number = 0;
  private fps: number = 0;
  private frameCount: number = 0;
  private fpsUpdateTime: number = 0;
  
  constructor(canvas: HTMLCanvasElement) {
    this.canvas = canvas;
    
    // Initialize core systems
    this.physics = new PhysicsEngine();
    this.renderer = new Renderer(canvas);
    this.audio = new CS16AudioManager();
    this.botVoice = new CS16BotVoiceSystem(this.audio);
    this.ambient = new CS16AmbientSystem(this.audio);
    this.weapons = new WeaponSystem(this.audio);
    this.maps = new MapSystem();
    this.stateManager = new GameStateManager();
    
    // Initialize game state
    this.gameState = {
      roundNumber: 1,
      roundTime: 115,
      freezeTime: 15,
      bombPlanted: false,
      bombTimer: 40,
      ctScore: 0,
      tScore: 0,
      gameMode: 'competitive',
      maxRounds: 30
    };
    
    // Initialize new systems
    this.damageSystem = new DamageSystem(this.audio);
    this.buyMenuSystem = new BuyMenuSystem(this.weapons, this.audio);
    this.roundSystem = new RoundSystem(this.gameState, this.players, this.audio);
    this.bombSystem = new BombSystem(this.audio);
    this.hud = new HUD(canvas, this.weapons);
    
    // Initialize CollisionSystem with required dependencies
    this.collisionSystem = new CollisionSystem(this.createCollisionDependencies());
    
    // Connect systems
    this.stateManager.connectGameCore(this);
    this.stateManager.connectAudioManager(this.audio);
    
    // Set up system event handlers
    this.setupSystemEvents();
    
    // Initialize CS 1.6 audio system
    this.initializeAudio();
    
    // Initialize input
    this.input = {
      keys: new Set(),
      mouse: { x: 0, y: 0, buttons: 0 }
    };
    
    this.setupEventListeners();
    this.loadDefaultMap();
  }
  
  private setupSystemEvents(): void {
    // Round system events
    this.roundSystem.onEvent('round_start', (data) => {
      console.log('🔄 Round started:', data);
      // Close all buy menus
      this.players.forEach(player => {
        this.buyMenuSystem.closeBuyMenu(player.id);
      });
    });
    
    this.roundSystem.onEvent('round_end', (data) => {
      console.log('🏁 Round ended:', data);
      // Reset bomb system
      this.bombSystem.reset();
    });
    
    // Bomb system events
    this.bombSystem.onEvent('bomb_planted', (data) => {
      console.log('💣 Bomb planted:', data);
      this.gameState.bombPlanted = true;
      this.gameState.bombPosition = data.position;
      
      // Update HUD
      this.hud.addKillFeedEntry('BOMB', 'PLANTED', 'C4');
    });
    
    this.bombSystem.onEvent('bomb_defused', (data) => {
      console.log('✅ Bomb defused:', data);
      this.gameState.bombPlanted = false;
      
      // Award round to CTs
      this.endRound('bomb_defused', 'ct');
      
      // Update HUD
      this.hud.addKillFeedEntry('BOMB', 'DEFUSED', 'DEFUSE_KIT');
    });
    
    this.bombSystem.onEvent('bomb_exploded', (data) => {
      console.log('💥 Bomb exploded:', data);
      
      // Apply explosion damage to all players
      this.players.forEach(player => {
        if (player.isAlive) {
          const damage = this.bombSystem.calculateExplosionDamage(data.position, player.position);
          if (damage > 0) {
            const damageInfo: DamageInfo = {
              amount: damage,
              source: 'bomb',
              position: data.position,
              weapon: 'c4'
            };
            this.damageSystem.applyDamage(player, damageInfo);
          }
        }
      });
      
      // Award round to Ts
      this.endRound('bomb_exploded', 't');
      
      // Update HUD
      this.hud.addKillFeedEntry('BOMB', 'EXPLODED', 'C4');
    });
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
  
  private async initializeAudio(): Promise<void> {
    try {
      console.log('🎵 Initializing Enhanced CS 1.6 audio system...');
      await this.audio.initialize();
      this.ambient.setEnvironment('outdoor');
      console.log('✅ Enhanced CS 1.6 audio system ready');
    } catch (error) {
      console.error('❌ Failed to initialize CS 1.6 audio:', error);
    }
  }
  
  private setupEventListeners(): void {
    console.log('🎮 Setting up enhanced event listeners...');
    
    this.canvas.setAttribute('tabindex', '0');
    this.canvas.focus();
    
    // Keyboard events
    window.addEventListener('keydown', (e) => {
      this.input.keys.add(e.code);
      this.handleKeyPress(e.code);
      e.preventDefault();
    });
    
    window.addEventListener('keyup', (e) => {
      this.input.keys.delete(e.code);
      e.preventDefault();
    });
    
    // Mouse events
    this.canvas.addEventListener('mousemove', (e) => {
      const rect = this.canvas.getBoundingClientRect();
      this.input.mouse.x = e.clientX - rect.left;
      this.input.mouse.y = e.clientY - rect.top;
    });
    
    this.canvas.addEventListener('mousedown', (e) => {
      this.canvas.focus();
      this.input.mouse.buttons = e.buttons;
      this.handleMouseDown(e.button);
      e.preventDefault();
    });
    
    this.canvas.addEventListener('mouseup', (e) => {
      this.input.mouse.buttons = e.buttons;
      e.preventDefault();
    });
    
    this.canvas.addEventListener('contextmenu', (e) => {
      e.preventDefault();
    });
    
    // Styling
    this.canvas.style.userSelect = 'none';
    this.canvas.style.outline = 'none';
    this.canvas.style.border = 'none';
    
    console.log('✅ Enhanced event listeners setup complete');
  }
  
  private handleKeyPress(key: string): void {
    const player = this.players.get(this.localPlayerId);
    if (!player) return;
    
    switch (key) {
      case 'KeyB':
        // Open buy menu
        const canBuy = this.buyMenuSystem.canPlayerBuy(player, this.gameState);
        if (canBuy) {
          const timeLeft = Math.max(0, this.gameState.freezeTime > 0 ? this.gameState.freezeTime : this.gameState.roundTime - 105);
          this.buyMenuSystem.openBuyMenu(player.id, canBuy, timeLeft);
        } else {
          console.log('❌ Cannot buy now');
        }
        break;
      
      case 'KeyE':
        // Use/Interact
        this.handleInteraction(player);
        break;
      
      case 'KeyR':
        // Reload weapon
        this.reloadWeapon(player);
        break;
      
      case 'KeyG':
        // Drop weapon
        this.dropWeapon(player);
        break;
      
      case 'Space':
        // Jump
        this.playerJump(player);
        break;
      
      case 'ControlLeft':
        // Duck/Crouch
        player.isDucking = true;
        break;
      
      case 'ShiftLeft':
        // Walk silently
        player.isWalking = true;
        break;
      
      // CS 1.6 Radio Commands
      case 'KeyZ':
        this.handleRadioCommand(player, 'roger');
        break;
      
      case 'KeyX':
        this.handleRadioCommand(player, 'enemyspotted');
        break;
      
      case 'KeyC':
        this.handleRadioCommand(player, 'needbackup');
        break;
      
      case 'KeyV':
        this.handleRadioCommand(player, 'followme');
        break;
      
      case 'KeyF':
        this.handleRadioCommand(player, 'fireinhole');
        break;
      
      case 'KeyT':
        this.triggerBotResponse(player, 'round_start');
        break;
      
      case 'KeyP':
        // Toggle physics debug
        (window as any).DEBUG_PHYSICS = !(window as any).DEBUG_PHYSICS;
        console.log('Physics debug:', (window as any).DEBUG_PHYSICS ? 'ON' : 'OFF');
        break;
      
      case 'KeyH':
        // Toggle HUD debug info
        this.hud.toggleDebugInfo();
        break;
      
      // Weapon switching
      case 'Digit1':
      case 'Digit2':
      case 'Digit3':
      case 'Digit4':
      case 'Digit5':
        const slot = parseInt(key.replace('Digit', ''));
        this.switchWeapon(player, slot);
        break;
    }
  }
  
  private handleInteraction(player: Player): void {
    // Check for bomb planting/defusing
    if (player.team === 't' && player.weapons.includes('c4')) {
      const plantCheck = this.bombSystem.canPlantBomb(player);
      if (plantCheck.canPlant) {
        this.bombSystem.startPlantBomb(player);
        return;
      }
    }
    
    if (player.team === 'ct' && this.bombSystem.isBombPlanted()) {
      const defuseCheck = this.bombSystem.canDefuseBomb(player);
      if (defuseCheck.canDefuse) {
        this.bombSystem.startDefuseBomb(player);
        return;
      }
    }
    
    // Other interactions could be added here (doors, items, etc.)
  }
  
  private handleMouseDown(button: number): void {
    const player = this.players.get(this.localPlayerId);
    if (!player || !player.isAlive) return;
    
    if (button === 0) {
      // Left click - Fire weapon
      this.fireWeapon(player);
    } else if (button === 2) {
      // Right click - Aim/Scope
      this.toggleScope(player);
    }
  }
  
  private fireWeapon(player: Player): void {
    // Same firing logic as before, but with enhanced damage system
    const rect = this.canvas.getBoundingClientRect();
    const canvasX = this.input.mouse.x;
    const canvasY = this.input.mouse.y;
    
    const worldPos = {
      x: (canvasX / this.canvas.width) * 1920,
      y: (canvasY / this.canvas.height) * 1080
    };
    
    const direction = {
      x: worldPos.x - player.position.x,
      y: worldPos.y - player.position.y
    };
    
    const mag = Math.sqrt(direction.x ** 2 + direction.y ** 2);
    if (mag > 0) {
      direction.x /= mag;
      direction.y /= mag;
    } else {
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
      this.stateManager.emit({
        type: 'weapon_fire',
        playerId: player.id,
        data: { weaponId: player.currentWeapon, direction },
        timestamp: Date.now(),
        position: player.position,
        team: player.team
      });
      
      this.renderer.createParticleEffect('muzzleFlash', player.position.x, player.position.y);
    }
  }
  
  private reloadWeapon(player: Player): void {
    const reloaded = this.weapons.reload(player.currentWeapon, player.id, player.position);
    if (reloaded) {
      this.stateManager.emit({
        type: 'weapon_reload',
        playerId: player.id,
        data: { weaponId: player.currentWeapon },
        timestamp: Date.now(),
        position: player.position,
        team: player.team
      });
    }
  }
  
  private dropWeapon(player: Player): void {
    this.audio.playUISound('item_pickup');
  }
  
  private playerJump(player: Player): void {
    if (player.isDucking) return;
    // Enhanced jump logic could be added here
  }
  
  private switchWeapon(player: Player, slot: number): void {
    const newWeapon = player.weapons[slot - 1];
    if (newWeapon && newWeapon !== player.currentWeapon) {
      this.weapons.switchWeapon(player.currentWeapon, newWeapon, player.id, player.position);
      player.currentWeapon = newWeapon;
    }
  }
  
  private toggleScope(player: Player): void {
    player.isScoped = !player.isScoped;
  }
  
  public addPlayer(player: Player): void {
    // Enhanced player initialization
    player.lastPosition = { ...player.position };
    player.currentSurface = { material: 'concrete', volume: 1.0 };
    player.lastDamageTime = 0;
    player.isInPain = false;
    player.orientation = 0;
    player.lastVoiceTime = 0;
    
    if (player.isBot) {
      player.botPersonality = {
        aggressiveness: 0.3 + Math.random() * 0.4,
        chattiness: 0.4 + Math.random() * 0.3,
        helpfulness: 0.5 + Math.random() * 0.3,
        responseFrequency: 0.6 + Math.random() * 0.4
      };
      
      // Initialize bot AI
      const botAI = new BotAI(player, this.weapons, 'normal', this.botVoice);
      this.botAI.set(player.id, botAI);
    }
    
    this.players.set(player.id, player);
    
    // Create visual sprite and physics body
    const playerSprite = this.createPlayerSprite(player);
    this.renderer.addSprite(`player_sprite_${player.id}`, playerSprite, 5);
    
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
  
  public update(deltaTime: number): void {
    // Update all systems
    this.physics.update(deltaTime);
    this.roundSystem.update(deltaTime);
    this.bombSystem.update(deltaTime);
    
    // Update players
    this.players.forEach(player => {
      if (player.id === this.localPlayerId) {
        this.updatePlayer(player, deltaTime);
      }
      
      // Update bot AI
      const botAI = this.botAI.get(player.id);
      if (botAI && player.isBot) {
        botAI.update(deltaTime, this.gameState, this.players);
      }
      
      // Update buy menu timer
      this.buyMenuSystem.updateBuyMenu(player.id, deltaTime);
    });
    
    this.weapons.updateBullets(deltaTime);
    this.checkBulletCollisions();
    this.renderer.updateParticles(deltaTime);
    this.stateManager.processNetworkQueue();
    this.updateFPS();
  }
  
  /**
   * Check bullet collisions using the dedicated CollisionSystem
   * This method replaces the previous 50+ line implementation
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
        killer.money += 300; // CS 1.6 style kill reward
      }
    }
    
    // Check if round should end due to elimination
    const ctPlayers = Array.from(this.players.values()).filter(p => p.team === 'ct' && p.isAlive);
    const tPlayers = Array.from(this.players.values()).filter(p => p.team === 't' && p.isAlive);
    
    if (ctPlayers.length === 0) {
      this.endRound('elimination', 't');
    } else if (tPlayers.length === 0) {
      this.endRound('elimination', 'ct');
    }
  }
  
  private endRound(condition: string, winner: 'ct' | 't'): void {
    // Let round system handle this
    console.log('🏁 Ending round:', condition, winner);
  }
  
  public render(): void {
    this.renderer.render();
    
    // Render enhanced HUD
    const localPlayer = this.players.get(this.localPlayerId);
    if (localPlayer) {
      const hudElements: HUDElements = {
        health: localPlayer.health,
        armor: localPlayer.armor,
        money: localPlayer.money,
        kills: localPlayer.kills,
        deaths: localPlayer.deaths,
        assists: localPlayer.assists,
        currentWeapon: localPlayer.currentWeapon,
        currentAmmo: this.weapons.getCurrentAmmo(localPlayer.id, localPlayer.currentWeapon).current,
        reserveAmmo: this.weapons.getCurrentAmmo(localPlayer.id, localPlayer.currentWeapon).reserve,
        isReloading: this.weapons.isReloading(localPlayer.id, localPlayer.currentWeapon),
        reloadProgress: this.weapons.getReloadProgress(localPlayer.id, localPlayer.currentWeapon),
        roundTime: this.formatTime(Math.max(0, this.gameState.roundTime)),
        bombTimer: this.bombSystem.isBombPlanted() ? this.formatTime(this.gameState.bombTimer) : undefined,
        ctScore: this.gameState.ctScore,
        tScore: this.gameState.tScore,
        playersAlive: this.getPlayersAlive(),
        gameMode: this.gameState.gameMode,
        fps: this.fps
      };
      
      this.hud.render(localPlayer, this.gameState, hudElements);
    }
    
    // Render debug physics if enabled
    if ((window as any).DEBUG_PHYSICS) {
      this.renderDebugPhysics();
    }
  }
  
  private getPlayersAlive(): { ct: number; t: number } {
    const alive = { ct: 0, t: 0 };
    this.players.forEach(player => {
      if (player.isAlive) {
        alive[player.team]++;
      }
    });
    return alive;
  }
  
  private formatTime(seconds: number): string {
    const minutes = Math.floor(seconds / 60);
    const remainingSeconds = Math.floor(seconds % 60);
    return `${minutes}:${remainingSeconds.toString().padStart(2, '0')}`;
  }
  
  // Re-implement other methods from original GameCore...
  private loadDefaultMap(): void {
    // Same implementation as original
    const dustMap = this.maps.getCurrentMap();
    if (dustMap) {
      this.maps.loadMap(dustMap);
      
      dustMap.tiles.forEach(row => {
        row.forEach(tile => {
          const tileSprite = this.createTileSprite(tile);
          this.renderer.addSprite(`tile_sprite_${tile.x}_${tile.y}`, tileSprite, 1);
          
          if (!tile.walkable) {
            this.physics.addBody({
              id: `tile_${tile.x}_${tile.y}`,
              position: { x: tile.x + 16, y: tile.y + 16 },
              velocity: { x: 0, y: 0 },
              acceleration: { x: 0, y: 0 },
              mass: Infinity,
              friction: 0,
              restitution: 0.5,
              isStatic: true,
              collider: { 
                x: tile.x + 16,
                y: tile.y + 16,
                width: 32, 
                height: 32 
              },
              type: 'rectangle'
            });
          }
        });
      });
      
      dustMap.objects.forEach(obj => {
        const objectSprite = this.createObjectSprite(obj);
        this.renderer.addSprite(`object_sprite_${obj.id}`, objectSprite, 3);
        
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
            x: obj.position.x,
            y: obj.position.y,
            width: obj.size.x,
            height: obj.size.y
          },
          type: 'rectangle'
        });
      });
    }
  }
  
  // ... (include other private methods from original GameCore)
  
  public start(): void {
    const gameLoop = () => {
      const now = performance.now();
      const deltaTime = (now - this.lastUpdateTime) / 1000;
      this.lastUpdateTime = now;
      
      this.update(deltaTime);
      this.render();
      
      requestAnimationFrame(gameLoop);
    };
    
    this.lastUpdateTime = performance.now();
    gameLoop();
  }
  
  // Public API methods
  public setLocalPlayer(playerId: string): void {
    this.localPlayerId = playerId;
    const player = this.players.get(playerId);
    if (player) {
      this.renderer.followTarget(player.position);
      this.audio.setListenerPosition(player.position, player.orientation);
    }
  }
  
  public getState(): GameState {
    return { ...this.gameState };
  }
  
  public getPlayer(playerId: string): Player | undefined {
    return this.players.get(playerId);
  }
  
  public getPlayers(): Player[] {
    return Array.from(this.players.values());
  }
  
  public getFPS(): number {
    return this.fps;
  }
  
  public getLocalPlayer(): Player | undefined {
    return this.players.get(this.localPlayerId);
  }
  
  public getStateManager(): GameStateManager {
    return this.stateManager;
  }
  
  // System accessors
  public getDamageSystem(): DamageSystem {
    return this.damageSystem;
  }
  
  public getBuyMenuSystem(): BuyMenuSystem {
    return this.buyMenuSystem;
  }
  
  public getRoundSystem(): RoundSystem {
    return this.roundSystem;
  }
  
  public getBombSystem(): BombSystem {
    return this.bombSystem;
  }
  
  public getHUD(): HUD {
    return this.hud;
  }
  
  // Include placeholder methods that need full implementation
  private createTileSprite(tile: any): any {
    // Implementation from original GameCore
    const canvas = document.createElement('canvas');
    canvas.width = 32;
    canvas.height = 32;
    const ctx = canvas.getContext('2d')!;
    
    let color: string;
    switch (tile.type) {
      case 'wall': color = '#8B4513'; break;
      case 'floor': color = '#D2B48C'; break;
      case 'metal': color = '#708090'; break;
      case 'wood': color = '#A0522D'; break;
      case 'water': color = '#4682B4'; break;
      case 'glass': color = '#87CEEB'; break;
      default: color = '#D2B48C';
    }
    
    ctx.fillStyle = color;
    ctx.fillRect(0, 0, 32, 32);
    
    if (tile.type === 'wall') {
      ctx.strokeStyle = '#654321';
      ctx.lineWidth = 2;
      ctx.strokeRect(1, 1, 30, 30);
    }
    
    return {
      image: canvas,
      x: tile.x + 16,
      y: tile.y + 16,
      width: 32,
      height: 32,
      rotation: 0,
      scale: 1,
      opacity: 1
    };
  }
  
  private createObjectSprite(obj: any): any {
    // Implementation from original GameCore
    const canvas = document.createElement('canvas');
    canvas.width = obj.size.x;
    canvas.height = obj.size.y;
    const ctx = canvas.getContext('2d')!;
    
    let color: string;
    switch (obj.type) {
      case 'crate': color = '#A0522D'; break;
      case 'barrel': color = '#8B0000'; break;
      case 'car': color = '#2F4F4F'; break;
      default: color = '#696969';
    }
    
    ctx.fillStyle = color;
    ctx.fillRect(0, 0, obj.size.x, obj.size.y);
    ctx.strokeStyle = '#000000';
    ctx.lineWidth = 2;
    ctx.strokeRect(1, 1, obj.size.x - 2, obj.size.y - 2);
    
    return {
      image: canvas,
      x: obj.position.x,
      y: obj.position.y,
      width: obj.size.x,
      height: obj.size.y,
      rotation: obj.rotation || 0,
      scale: 1,
      opacity: 1
    };
  }
  
  private createPlayerSprite(player: Player): any {
    // Implementation from original GameCore
    const canvas = document.createElement('canvas');
    canvas.width = 32;
    canvas.height = 32;
    const ctx = canvas.getContext('2d')!;
    
    const teamColor = player.team === 'ct' ? '#4169E1' : '#DC143C';
    const outlineColor = '#000000';
    
    ctx.fillStyle = teamColor;
    ctx.beginPath();
    ctx.arc(16, 16, 12, 0, Math.PI * 2);
    ctx.fill();
    
    ctx.strokeStyle = outlineColor;
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.arc(16, 16, 12, 0, Math.PI * 2);
    ctx.stroke();
    
    ctx.fillStyle = '#FFFFFF';
    ctx.beginPath();
    ctx.arc(16, 16, 4, 0, Math.PI * 2);
    ctx.fill();
    
    ctx.fillStyle = '#FFFFFF';
    ctx.font = '8px monospace';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText(player.team.toUpperCase(), 16, 26);
    
    return {
      image: canvas,
      x: player.position.x,
      y: player.position.y,
      width: 32,
      height: 32,
      rotation: 0,
      scale: 1,
      opacity: player.isAlive ? 1 : 0.5
    };
  }
  
  private updatePlayer(player: Player, deltaTime: number): void {
    if (!player.isAlive) return;
    
    player.lastPosition = { ...player.position };
    
    const speed = player.isWalking ? 100 : player.isDucking ? 50 : 200;
    const acceleration = { x: 0, y: 0 };
    
    // Movement input
    if (this.input.keys.has('KeyW')) acceleration.y -= speed;
    if (this.input.keys.has('KeyS')) acceleration.y += speed;
    if (this.input.keys.has('KeyA')) acceleration.x -= speed;
    if (this.input.keys.has('KeyD')) acceleration.x += speed;
    
    if (acceleration.x !== 0 || acceleration.y !== 0) {
      player.orientation = Math.atan2(acceleration.y, acceleration.x);
    }
    
    const mag = Math.sqrt(acceleration.x ** 2 + acceleration.y ** 2);
    if (mag > 0) {
      acceleration.x = (acceleration.x / mag) * speed;
      acceleration.y = (acceleration.y / mag) * speed;
    }
    
    const physicsBody = this.physics.getBody(`player_${player.id}`);
    if (physicsBody) {
      physicsBody.acceleration.x = acceleration.x;
      physicsBody.acceleration.y = acceleration.y;
      
      player.position = { ...physicsBody.position };
      player.velocity = { ...physicsBody.velocity };
      
      this.renderer.updateSprite(`player_sprite_${player.id}`, {
        x: player.position.x,
        y: player.position.y
      });
    }
    
    // Update surface and audio
    this.updatePlayerSurface(player);
    
    const isMoving = Math.abs(player.velocity.x) > 10 || Math.abs(player.velocity.y) > 10;
    if (isMoving && player.isAlive) {
      const now = Date.now();
      let stepInterval = 400;
      if (player.isWalking) stepInterval = 600;
      if (player.isDucking) stepInterval = 800;
      
      if (now - player.lastStepTime > stepInterval) {
        this.audio.playFootstep(player.position, player.currentSurface);
        player.lastStepTime = now;
      }
    }
    
    if (player.id === this.localPlayerId) {
      this.audio.setListenerPosition(player.position, player.orientation);
    }
    
    if (player.isInPain && Date.now() - player.lastDamageTime > 2000) {
      player.isInPain = false;
    }
  }
  
  private updatePlayerSurface(player: Player): void {
    const tile = this.maps.getTileAt(player.position);
    
    if (!tile) {
      player.currentSurface = { material: 'concrete', volume: 1.0 };
      return;
    }
    
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
    }
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
  
  private renderDebugPhysics(): void {
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
  
  private handleRadioCommand(player: Player, command: string): void {
    const success = this.botVoice.playRadioCommand(command, player.position);
    
    if (success) {
      const nearbyBots = Array.from(this.players.values()).filter(p => 
        p.id !== player.id && 
        p.team === player.team && 
        p.isAlive &&
        this.calculateDistance(p.position, player.position) < 800
      );
      
      nearbyBots.forEach(bot => {
        if (Math.random() < 0.3) {
          setTimeout(() => {
            this.botVoice.playBotVoice(
              bot.id,
              'radio_response',
              bot.position,
              bot.botPersonality
            );
          }, 500 + Math.random() * 1000);
        }
      });
    }
  }
  
  private triggerBotResponse(player: Player, context: string): void {
    const nearbyBots = Array.from(this.players.values()).filter(p => 
      p.id !== player.id && 
      p.isAlive &&
      this.calculateDistance(p.position, player.position) < 600
    );
    
    nearbyBots.forEach(bot => {
      if (Math.random() < 0.2) {
        setTimeout(() => {
          this.botVoice.playBotVoice(
            bot.id,
            context,
            bot.position,
            bot.botPersonality
          );
        }, 200 + Math.random() * 800);
      }
    });
  }
  
  private calculateDistance(pos1: Vector2D, pos2: Vector2D): number {
    return Math.sqrt((pos1.x - pos2.x) ** 2 + (pos1.y - pos2.y) ** 2);
  }
}