import { Vector2D } from '../physics/PhysicsEngine';
import { GAME_CONSTANTS } from '../config/gameConstants';

export interface InputState {
  keys: Set<string>;
  mouse: { x: number; y: number; buttons: number };
}

export interface InputCommand {
  type: 'movement' | 'weapon_fire' | 'weapon_reload' | 'weapon_switch' | 'jump' | 'duck' | 'walk' | 'radio' | 'buy_menu' | 'bomb_action' | 'test' | 'debug';
  playerId: string;
  data?: any;
  position?: Vector2D;
  direction?: Vector2D;
  key?: string;
  slot?: number;
  button?: number;
}

export interface InputCallbacks {
  onMovementInput: (playerId: string, acceleration: Vector2D) => void;
  onWeaponFire: (playerId: string, direction: Vector2D) => void;
  onWeaponReload: (playerId: string) => void;
  onWeaponSwitch: (playerId: string, slot: number) => void;
  onJump: (playerId: string) => void;
  onDuck: (playerId: string, isDucking: boolean) => void;
  onWalk: (playerId: string, isWalking: boolean) => void;
  onRadioCommand: (playerId: string, command: string) => void;
  onBuyMenuToggle: (playerId: string) => void;
  onBuyMenuPurchase: (playerId: string) => void;
  onBombAction: (playerId: string) => void;
  onDigitKey: (playerId: string, digit: number) => void;
  onTestAction: (playerId: string, action: string) => void;
  onDebugToggle: (key: string) => void;
}

export class InputSystem {
  private canvas: HTMLCanvasElement;
  private input: InputState;
  private localPlayerId: string = '';
  private callbacks: Partial<InputCallbacks> = {};
  private isInitialized: boolean = false;

  constructor(canvas: HTMLCanvasElement) {
    this.canvas = canvas;
    this.input = {
      keys: new Set(),
      mouse: { x: 0, y: 0, buttons: 0 }
    };
  }

  /**
   * Initialize input system and setup event listeners
   */
  public initialize(): void {
    if (this.isInitialized) {
      console.warn('🎮 InputSystem already initialized');
      return;
    }

    console.log('🎮 Initializing InputSystem...');
    this.setupEventListeners();
    this.isInitialized = true;
    console.log('✅ InputSystem initialized');
  }

  /**
   * Set up all event listeners for keyboard and mouse input
   */
  private setupEventListeners(): void {
    console.log('🎮 Setting up input event listeners on canvas');
    
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
      this.handleKeyUp(e.code);
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
    
    console.log('✅ Input event listeners setup complete');
  }

  /**
   * Set the local player ID for input handling
   */
  public setLocalPlayer(playerId: string): void {
    this.localPlayerId = playerId;
    console.log('🎮 InputSystem: Local player set to', playerId);
  }

  /**
   * Register callback functions for input handling
   */
  public setCallbacks(callbacks: Partial<InputCallbacks>): void {
    this.callbacks = { ...this.callbacks, ...callbacks };
  }

  /**
   * Handle key press events
   */
  private handleKeyPress(key: string): void {
    if (!this.localPlayerId) return;
    
    console.log('⌨️ Key pressed:', key, 'LocalPlayer:', this.localPlayerId);
    
    switch (key) {
      case 'KeyB':
        // Open buy menu
        this.callbacks.onBuyMenuToggle?.(this.localPlayerId);
        break;
      
      case 'KeyR':
        // Reload weapon
        this.callbacks.onWeaponReload?.(this.localPlayerId);
        break;
      
      case 'KeyG':
        // Drop weapon (could be added later)
        break;
      
      case 'Space':
        // Jump
        this.callbacks.onJump?.(this.localPlayerId);
        break;
      
      case 'ControlLeft':
        // Duck/Crouch
        this.callbacks.onDuck?.(this.localPlayerId, true);
        break;
      
      case 'ShiftLeft':
        // Walk silently
        this.callbacks.onWalk?.(this.localPlayerId, true);
        break;
      
      // CS 1.6 Radio Commands
      case 'KeyZ':
        this.callbacks.onRadioCommand?.(this.localPlayerId, 'roger');
        break;
      
      case 'KeyX':
        this.callbacks.onRadioCommand?.(this.localPlayerId, 'enemyspotted');
        break;
      
      case 'KeyC':
        this.callbacks.onRadioCommand?.(this.localPlayerId, 'needbackup');
        break;
      
      case 'KeyV':
        this.callbacks.onRadioCommand?.(this.localPlayerId, 'followme');
        break;
      
      case 'KeyF':
        this.callbacks.onRadioCommand?.(this.localPlayerId, 'fireinhole');
        break;
      
      case 'KeyT':
        this.callbacks.onTestAction?.(this.localPlayerId, 'trigger_bot_response');
        break;
      
      case 'KeyP':
        this.callbacks.onDebugToggle?.('physics');
        break;
      
      case 'KeyH':
        this.callbacks.onTestAction?.(this.localPlayerId, 'damage');
        break;
      
      case 'KeyJ':
        this.callbacks.onTestAction?.(this.localPlayerId, 'heal');
        break;
      
      case 'KeyK':
        this.callbacks.onTestAction?.(this.localPlayerId, 'add_bot');
        break;
      
      case 'Digit1':
      case 'Digit2':
      case 'Digit3':
      case 'Digit4':
      case 'Digit5':
        // Handle buy menu category selection or weapon switching
        const slot = parseInt(key.replace('Digit', ''));
        this.callbacks.onDigitKey?.(this.localPlayerId, slot);
        break;
      
      case 'Enter':
        // Buy selected item in buy menu
        this.callbacks.onBuyMenuPurchase?.(this.localPlayerId);
        break;
      
      case 'Escape':
        // Close buy menu
        this.callbacks.onTestAction?.(this.localPlayerId, 'escape_key');
        break;
      
      case 'KeyN':
        this.callbacks.onTestAction?.(this.localPlayerId, 'new_round');
        break;
      
      case 'KeyE':
        // Plant/defuse bomb
        this.callbacks.onBombAction?.(this.localPlayerId);
        break;
      
      case 'F1':
        this.callbacks.onDebugToggle?.('debug_info');
        break;
      
      case 'KeyM':
        this.callbacks.onTestAction?.(this.localPlayerId, 'give_c4');
        break;
    }
  }

  /**
   * Handle key release events
   */
  private handleKeyUp(key: string): void {
    if (!this.localPlayerId) return;
    
    switch (key) {
      case 'ControlLeft':
        // Stop ducking
        this.callbacks.onDuck?.(this.localPlayerId, false);
        break;
      
      case 'ShiftLeft':
        // Stop walking
        this.callbacks.onWalk?.(this.localPlayerId, false);
        break;
    }
  }

  /**
   * Handle mouse button press events
   */
  private handleMouseDown(button: number): void {
    if (!this.localPlayerId) return;
    
    console.log('🖱️ Mouse click detected:', { button, playerId: this.localPlayerId });
    
    if (button === 0) {
      // Left click - Fire weapon
      const direction = this.calculateFireDirection();
      console.log('🔫 Fire weapon command with direction:', direction);
      this.callbacks.onWeaponFire?.(this.localPlayerId, direction);
    } else if (button === 2) {
      // Right click - Toggle scope (could be added later)
    }
  }

  /**
   * Calculate fire direction from player position to mouse cursor
   */
  private calculateFireDirection(): Vector2D {
    // Get canvas bounds for proper coordinate calculation
    const canvasX = this.input.mouse.x;
    const canvasY = this.input.mouse.y;
    
    // Convert canvas coordinates to world coordinates
    // For a simple 2D game, we can use direct mapping
    const worldPos = {
      x: (canvasX / this.canvas.width) * 1920, // Assuming 1920x1080 world
      y: (canvasY / this.canvas.height) * 1080
    };
    
    // Return normalized direction (GameCore will use player position)
    return {
      x: worldPos.x,
      y: worldPos.y
    };
  }

  /**
   * Get movement input and return acceleration vector
   */
  public getMovementInput(speed: number = GAME_CONSTANTS.MOVEMENT.BASE_SPEED, isWalking: boolean = false, isDucking: boolean = false): Vector2D {
    const actualSpeed = isWalking ? speed * GAME_CONSTANTS.MOVEMENT.WALK_SPEED_MULTIPLIER : 
                       isDucking ? speed * GAME_CONSTANTS.MOVEMENT.DUCK_SPEED_MULTIPLIER : speed;
    const acceleration = { x: 0, y: 0 };
    
    // Movement input
    if (this.input.keys.has('KeyW')) acceleration.y -= actualSpeed;
    if (this.input.keys.has('KeyS')) acceleration.y += actualSpeed;
    if (this.input.keys.has('KeyA')) acceleration.x -= actualSpeed;
    if (this.input.keys.has('KeyD')) acceleration.x += actualSpeed;
    
    // Normalize diagonal movement
    const mag = Math.sqrt(acceleration.x ** 2 + acceleration.y ** 2);
    if (mag > 0) {
      acceleration.x = (acceleration.x / mag) * actualSpeed;
      acceleration.y = (acceleration.y / mag) * actualSpeed;
    }
    
    return acceleration;
  }

  /**
   * Check if a specific key is currently pressed
   */
  public isKeyPressed(key: string): boolean {
    return this.input.keys.has(key);
  }

  /**
   * Get current mouse position in canvas coordinates
   */
  public getMousePosition(): { x: number; y: number } {
    return { ...this.input.mouse };
  }

  /**
   * Get current input state (for debugging)
   */
  public getInputState(): InputState {
    return {
      keys: new Set(this.input.keys),
      mouse: { ...this.input.mouse }
    };
  }

  /**
   * Check if any movement keys are pressed
   */
  public hasMovementInput(): boolean {
    return this.input.keys.has('KeyW') || 
           this.input.keys.has('KeyS') || 
           this.input.keys.has('KeyA') || 
           this.input.keys.has('KeyD');
  }

  /**
   * Cleanup event listeners
   */
  public dispose(): void {
    if (!this.isInitialized) return;
    
    console.log('🎮 Disposing InputSystem...');
    
    // Remove event listeners
    // Note: We need to store references to bound functions to properly remove them
    // For now, we'll just clear the input state
    this.input.keys.clear();
    this.input.mouse = { x: 0, y: 0, buttons: 0 };
    this.callbacks = {};
    this.isInitialized = false;
    
    console.log('✅ InputSystem disposed');
  }
}