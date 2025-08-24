import { PhysicsEngine, Vector2D, RigidBody } from './physics/PhysicsEngine';
import { Renderer, ParticleEffect } from './graphics/Renderer';
import { WeaponSystem } from './weapons/WeaponSystem';
import { CS16AudioManager, SurfaceType } from './audio/CS16AudioManager';
import { CS16BotVoiceSystem, BotPersonality } from './audio/CS16BotVoiceSystem';
import { CS16AmbientSystem } from './audio/CS16AmbientSystem';
import { MapSystem } from './maps/MapSystem';
import { GameStateManager } from './GameStateManager';

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
    
    // Initialize systems
    this.physics = new PhysicsEngine();
    this.renderer = new Renderer(canvas);
    this.audio = new CS16AudioManager();
    this.botVoice = new CS16BotVoiceSystem(this.audio);
    this.ambient = new CS16AmbientSystem(this.audio);
    this.weapons = new WeaponSystem(this.audio);
    this.maps = new MapSystem();
    this.stateManager = new GameStateManager();
    
    // Connect state manager to core systems
    this.stateManager.connectGameCore(this);
    this.stateManager.connectAudioManager(this.audio);
    
    // Initialize CS 1.6 audio system
    this.initializeAudio();
    
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
    
    // Initialize input
    this.input = {
      keys: new Set(),
      mouse: { x: 0, y: 0, buttons: 0 }
    };
    
    this.setupEventListeners();
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
  
  private setupEventListeners(): void {
    console.log('🎮 Setting up event listeners on canvas');
    
    // Make canvas focusable and focus it
    this.canvas.setAttribute('tabindex', '0');
    this.canvas.focus();
    
    // Keyboard events
    window.addEventListener('keydown', (e) => {
      this.input.keys.add(e.code);
      this.handleKeyPress(e.code);
      e.preventDefault(); // Prevent browser shortcuts
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
      this.canvas.focus(); // Ensure focus on click
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
    
    // Prevent text selection and ensure game styling
    this.canvas.style.userSelect = 'none';
    this.canvas.style.outline = 'none';
    this.canvas.style.border = 'none';
    
    console.log('✅ Event listeners setup complete');
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
   * Create visual sprite for a player
   */
  private createPlayerSprite(player: Player): any {
    // Create a simple colored canvas as texture
    const canvas = document.createElement('canvas');
    canvas.width = 32;
    canvas.height = 32;
    const ctx = canvas.getContext('2d')!;
    
    // Choose color based on team
    const teamColor = player.team === 'ct' ? '#4169E1' : '#DC143C'; // Blue for CT, Red for T
    const outlineColor = '#000000';
    
    // Draw player as a circle with team colors
    ctx.fillStyle = teamColor;
    ctx.beginPath();
    ctx.arc(16, 16, 12, 0, Math.PI * 2);
    ctx.fill();
    
    // Add outline
    ctx.strokeStyle = outlineColor;
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.arc(16, 16, 12, 0, Math.PI * 2);
    ctx.stroke();
    
    // Add player indicator (dot in center)
    ctx.fillStyle = '#FFFFFF';
    ctx.beginPath();
    ctx.arc(16, 16, 4, 0, Math.PI * 2);
    ctx.fill();
    
    // Add team label
    ctx.fillStyle = '#FFFFFF';
    ctx.font = '8px monospace';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText(player.team.toUpperCase(), 16, 26);
    
    // Use the canvas directly as the image source
    return {
      image: canvas, // Use canvas directly
      x: player.position.x,
      y: player.position.y,
      width: 32,
      height: 32,
      rotation: 0,
      scale: 1,
      opacity: player.isAlive ? 1 : 0.5
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
    
    // Initialize bot-specific properties
    if (player.isBot) {
      player.botPersonality = {
        aggressiveness: 0.3 + Math.random() * 0.4,
        chattiness: 0.4 + Math.random() * 0.3,
        helpfulness: 0.5 + Math.random() * 0.3,
        responseFrequency: 0.6 + Math.random() * 0.4
      };
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
  }
  
  private handleKeyPress(key: string): void {
    const player = this.players.get(this.localPlayerId);
    console.log('⌨️ Key pressed:', key, 'Player exists:', !!player);
    if (!player) return;
    
    switch (key) {
      case 'KeyB':
        // Open buy menu
        if (this.gameState.freezeTime > 0 || this.gameState.roundTime > 105) {
          this.openBuyMenu();
        }
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
        // Standard radio menu 1
        this.handleRadioCommand(player, 'roger');
        break;
      
      case 'KeyX':
        // Standard radio menu 2
        this.handleRadioCommand(player, 'enemyspotted');
        break;
      
      case 'KeyC':
        // Standard radio menu 3
        this.handleRadioCommand(player, 'needbackup');
        break;
      
      case 'KeyV':
        // Additional radio command
        this.handleRadioCommand(player, 'followme');
        break;
      
      case 'KeyF':
        // Fire in the hole
        this.handleRadioCommand(player, 'fireinhole');
        break;
      
      case 'KeyT':
        // Team chat / voice activation
        this.triggerBotResponse(player, 'round_start');
        break;
      
      case 'KeyP':
        // Toggle physics debug
        (window as any).DEBUG_PHYSICS = !(window as any).DEBUG_PHYSICS;
        console.log('Physics debug:', (window as any).DEBUG_PHYSICS ? 'ON' : 'OFF');
        break;
      
      case 'Digit1':
      case 'Digit2':
      case 'Digit3':
      case 'Digit4':
      case 'Digit5':
        // Switch weapon
        const slot = parseInt(key.replace('Digit', ''));
        this.switchWeapon(player, slot);
        break;
    }
  }
  
  private handleMouseDown(button: number): void {
    const player = this.players.get(this.localPlayerId);
    console.log('🖱️ Mouse click detected:', { button, playerId: this.localPlayerId, playerExists: !!player, isAlive: player?.isAlive });
    
    if (!player || !player.isAlive) return;
    
    if (button === 0) {
      // Left click - Fire weapon
      console.log('🔫 Attempting to fire weapon:', player.currentWeapon);
      this.fireWeapon(player);
    } else if (button === 2) {
      // Right click - Aim/Scope
      this.toggleScope(player);
    }
  }
  
  private updatePlayer(player: Player, deltaTime: number): void {
    if (!player.isAlive) return;
    
    // Store last position for orientation calculation
    player.lastPosition = { ...player.position };
    
    const speed = player.isWalking ? 100 : player.isDucking ? 50 : 200;
    const acceleration = { x: 0, y: 0 };
    
    // Movement input
    if (this.input.keys.has('KeyW')) acceleration.y -= speed;
    if (this.input.keys.has('KeyS')) acceleration.y += speed;
    if (this.input.keys.has('KeyA')) acceleration.x -= speed;
    if (this.input.keys.has('KeyD')) acceleration.x += speed;
    
    // Debug: Log movement input occasionally
    if (Math.random() < 0.01 && (acceleration.x !== 0 || acceleration.y !== 0)) {
      console.log('🎮 Movement input:', { keys: Array.from(this.input.keys), acceleration, position: player.position });
    }
    
    // Calculate orientation for 3D audio
    if (acceleration.x !== 0 || acceleration.y !== 0) {
      player.orientation = Math.atan2(acceleration.y, acceleration.x);
    }
    
    // Normalize diagonal movement
    const mag = Math.sqrt(acceleration.x ** 2 + acceleration.y ** 2);
    if (mag > 0) {
      acceleration.x = (acceleration.x / mag) * speed;
      acceleration.y = (acceleration.y / mag) * speed;
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
      
      // Update player sprite position
      this.renderer.updateSprite(`player_sprite_${player.id}`, {
        x: player.position.x,
        y: player.position.y
      });
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
            timestamp: now,
            position: player.position,
            team: player.team
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
      case 'dirt':
        player.currentSurface = { material: 'dirt', volume: 0.8 };
        break;
      case 'grass':
        player.currentSurface = { material: 'grass', volume: 0.6 };
        break;
      case 'gravel':
        player.currentSurface = { material: 'gravel', volume: 1.3 };
        break;
      case 'sand':
        player.currentSurface = { material: 'sand', volume: 0.7 };
        break;
      case 'metalgrate':
        player.currentSurface = { material: 'metalgrate', volume: 1.4 };
        break;
      case 'chainlink':
        player.currentSurface = { material: 'chainlink', volume: 1.5 };
        break;
      case 'mud':
        player.currentSurface = { material: 'mud', volume: 1.0 };
        break;
      case 'water':
        player.currentSurface = { material: 'water', volume: 1.6 };
        break;
      default:
        player.currentSurface = { material: 'concrete', volume: 1.0 };
        break;
    }
  }
  
  private fireWeapon(player: Player): void {
    // Calculate direction from player to mouse cursor
    // Get canvas bounds for proper coordinate calculation
    const rect = this.canvas.getBoundingClientRect();
    const canvasX = this.input.mouse.x;
    const canvasY = this.input.mouse.y;
    
    // Convert canvas coordinates to world coordinates
    // For a simple 2D game, we can use direct mapping
    const worldPos = {
      x: (canvasX / this.canvas.width) * 1920, // Assuming 1920x1080 world
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
        timestamp: Date.now(),
        position: player.position,
        team: player.team
      });
      
      // Create muzzle flash effect
      this.renderer.createParticleEffect('muzzleFlash', player.position.x, player.position.y);
      
      // Apply recoil
      const recoilOffset = this.weapons.getRecoilOffset(player.id, player.currentWeapon);
      // Apply recoil to camera or crosshair
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
        timestamp: Date.now(),
        position: player.position,
        team: player.team
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
  
  private openBuyMenu(): void {
    // Implement buy menu UI
  }
  
  public update(deltaTime: number): void {
    // Update physics
    this.physics.update(deltaTime);
    
    // Update players
    this.players.forEach(player => {
      if (player.id === this.localPlayerId) {
        this.updatePlayer(player, deltaTime);
      }
    });
    
    // Update weapons
    this.weapons.updateBullets(deltaTime);
    
    // Check bullet collisions
    this.checkBulletCollisions();
    
    // Update particles
    this.renderer.updateParticles(deltaTime);
    
    // Update game state
    this.updateGameState(deltaTime);
    
    // Process network events for multiplayer
    this.stateManager.processNetworkQueue();
    
    // Update FPS
    this.updateFPS();
  }
  
  private checkBulletCollisions(): void {
    const bullets = this.weapons.getBullets();
    
    bullets.forEach(bullet => {
      // Check collision with players
      this.players.forEach(player => {
        if (player.id === bullet.owner || !player.isAlive) return;
        
        const distance = Math.sqrt(
          (bullet.position.x - player.position.x) ** 2 +
          (bullet.position.y - player.position.y) ** 2
        );
        
        if (distance < 16) {
          // Hit!
          const damage = this.weapons.handleBulletHit(bullet.id, player.armor);
          const wasHeadshot = Math.random() > 0.8; // 20% headshot chance
          
          // Apply damage
          const finalDamage = wasHeadshot ? damage * 2 : damage;
          player.health -= finalDamage;
          
          // Mark player as in pain for audio behavior
          player.isInPain = true;
          player.lastDamageTime = Date.now();
          
          // Emit damage event for multiplayer synchronization
          this.stateManager.emit({
            type: 'player_damage',
            playerId: player.id,
            data: { damage: finalDamage, headshot: wasHeadshot, armor: player.armor > 0 },
            timestamp: Date.now(),
            position: player.position,
            team: player.team
          });
          
          // Play authentic CS 1.6 hit sounds
          if (wasHeadshot) {
            this.audio.playPlayerSound('headshot', player.position);
          } else if (player.armor > 0) {
            this.audio.playPlayerSound('kevlar', player.position);
          } else {
            this.audio.playPlayerSound('damage', player.position);
          }
          
          // Create blood effect
          this.renderer.createParticleEffect('blood', player.position.x, player.position.y);
          
          if (player.health <= 0) {
            this.handlePlayerDeath(player, bullet.owner);
          }
        }
      });
      
      // Check collision with map
      const tile = this.maps.getTileAt(bullet.position);
      if (tile && !tile.walkable && !tile.bulletPenetrable) {
        this.weapons.clearBullet(bullet.id);
        this.renderer.createParticleEffect('spark', bullet.position.x, bullet.position.y);
        
        // Play bullet impact sound based on surface
        this.playBulletImpactSound(tile.type || 'concrete', bullet.position);
      }
    });
  }
  
  /**
   * Play bullet impact sounds based on surface material
   */
  private playBulletImpactSound(surfaceType: string, position: Vector2D): void {
    // Use CS 1.6 physics sounds for bullet impacts
    let impactSound = 'hit_wall'; // Default
    
    switch (surfaceType) {
      case 'metal':
      case 'metalgrate':
        impactSound = 'metal_impact';
        break;
      case 'wood':
        impactSound = 'wood_impact';
        break;
      case 'glass':
        impactSound = 'glass_impact';
        break;
      case 'concrete':
      default:
        impactSound = 'concrete_impact';
        break;
    }
    
    // Note: CS 1.6 uses generic debris sounds, so we'll use those
    this.audio.play('weapons/debris1.wav', position, { category: 'weapons' });
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
      timestamp: Date.now(),
      position: player.position,
      team: player.team
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
  
  private updateGameState(deltaTime: number): void {
    if (this.gameState.freezeTime > 0) {
      this.gameState.freezeTime -= deltaTime;
      if (this.gameState.freezeTime <= 0) {
        this.audio.play('round_start');
      }
    } else {
      this.gameState.roundTime -= deltaTime;
      
      if (this.gameState.bombPlanted) {
        this.gameState.bombTimer -= deltaTime;
        if (this.gameState.bombTimer <= 0) {
          this.handleBombExplosion();
        }
      }
      
      if (this.gameState.roundTime <= 0) {
        this.endRound('time');
      }
    }
  }
  
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
    
    // Respawn players
    this.players.forEach(player => {
      player.isAlive = true;
      player.health = 100;
      player.armor = 0;
      
      // Reset to spawn point
      const spawnPoints = this.maps.getSpawnPoints(player.team);
      if (spawnPoints.length > 0) {
        const spawn = spawnPoints[Math.floor(Math.random() * spawnPoints.length)];
        player.position = { ...spawn.position };
      }
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
    
    // Render FPS counter
    this.renderFPS();
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
}