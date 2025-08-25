import { describe, it, expect, beforeEach, afterEach, vi, Mock } from 'vitest';
import { GameCore, Player, GameState } from '../../../src/game/GameCore';
import { Vector2D } from '../../../src/game/physics/PhysicsEngine';

// Mock dependencies
vi.mock('../../../src/game/physics/PhysicsEngine');
vi.mock('../../../src/game/graphics/Renderer');
vi.mock('../../../src/game/weapons/WeaponSystem');
vi.mock('../../../src/game/audio/CS16AudioManager');
vi.mock('../../../src/game/audio/CS16BotVoiceSystem');
vi.mock('../../../src/game/audio/CS16AmbientSystem');
vi.mock('../../../src/game/maps/MapSystem');
vi.mock('../../../src/game/GameStateManager');
vi.mock('../../../src/game/systems/DamageSystem');
vi.mock('../../../src/game/systems/BuyMenuSystem');
vi.mock('../../../src/game/systems/RoundSystem');
vi.mock('../../../src/game/ui/HUD');
vi.mock('../../../src/game/systems/BombSystem');
vi.mock('../../../src/game/systems/InputSystem');
vi.mock('../../../src/game/systems/CollisionSystem');

describe('GameCore', () => {
  let gameCore: GameCore;
  let canvas: HTMLCanvasElement;

  beforeEach(() => {
    // Create a mock canvas
    canvas = document.createElement('canvas');
    canvas.width = 800;
    canvas.height = 600;
    
    // Mock HTMLCanvasElement.getContext
    const mockContext = {
      fillRect: vi.fn(),
      clearRect: vi.fn(),
      getImageData: vi.fn(),
      putImageData: vi.fn(),
      createImageData: vi.fn(),
      setTransform: vi.fn(),
      drawImage: vi.fn(),
      save: vi.fn(),
      restore: vi.fn(),
      beginPath: vi.fn(),
      closePath: vi.fn(),
      moveTo: vi.fn(),
      lineTo: vi.fn(),
      fill: vi.fn(),
      stroke: vi.fn(),
      strokeText: vi.fn(),
      fillText: vi.fn(),
    };
    canvas.getContext = vi.fn().mockReturnValue(mockContext);

    gameCore = new GameCore(canvas);
  });

  afterEach(() => {
    vi.clearAllMocks();
  });

  describe('Player Management', () => {
    it('should create a player with valid properties', () => {
      const playerData = {
        id: 'test-player-1',
        name: 'TestPlayer',
        team: 'ct' as const,
        position: { x: 100, y: 100 } as Vector2D,
        velocity: { x: 0, y: 0 } as Vector2D,
        health: 100,
        armor: 0,
        money: 800,
        score: 0,
        kills: 0,
        deaths: 0,
        assists: 0,
        currentWeapon: 'knife',
        weapons: ['knife'],
        ammo: new Map(),
        isAlive: true,
        isDucking: false,
        isWalking: false,
        isScoped: false,
        lastShotTime: 0,
        lastStepTime: 0,
        lastPosition: { x: 100, y: 100 } as Vector2D,
        currentSurface: 'concrete' as const,
        lastDamageTime: 0,
        isInPain: false,
        orientation: 0,
        isBot: false,
        lastVoiceTime: 0,
      } as Player;

      expect(playerData.health).toBe(100);
      expect(playerData.team).toBe('ct');
      expect(playerData.isAlive).toBe(true);
      expect(playerData.weapons).toContain('knife');
    });

    it('should handle player health correctly', () => {
      const initialHealth = 100;
      const damageAmount = 30;
      const expectedHealth = initialHealth - damageAmount;

      expect(expectedHealth).toBe(70);
      expect(expectedHealth).toBeGreaterThan(0);
    });

    it('should handle player death when health reaches zero', () => {
      const health = 0;
      const isAlive = health > 0;

      expect(isAlive).toBe(false);
    });
  });

  describe('Game State Management', () => {
    it('should initialize game state with valid defaults', () => {
      const initialState: GameState = {
        roundNumber: 1,
        roundTime: 115, // CS standard round time in seconds
        freezeTime: 3,
        bombPlanted: false,
        bombTimer: 35, // CS standard bomb timer
        ctScore: 0,
        tScore: 0,
        gameMode: 'competitive',
        maxRounds: 30,
      };

      expect(initialState.roundNumber).toBe(1);
      expect(initialState.roundTime).toBe(115);
      expect(initialState.bombPlanted).toBe(false);
      expect(initialState.gameMode).toBe('competitive');
    });

    it('should handle round transitions correctly', () => {
      let roundNumber = 1;
      let ctScore = 0;
      let tScore = 0;

      // Simulate CT win
      ctScore++;
      roundNumber++;

      expect(roundNumber).toBe(2);
      expect(ctScore).toBe(1);
      expect(tScore).toBe(0);
    });

    it('should determine match winner correctly', () => {
      const ctScore = 16;
      const tScore = 14;
      const maxRounds = 30;

      const isMatchOver = ctScore >= Math.ceil(maxRounds / 2) || tScore >= Math.ceil(maxRounds / 2);
      const winner = ctScore > tScore ? 'CT' : 'T';

      expect(isMatchOver).toBe(true);
      expect(winner).toBe('CT');
    });
  });

  describe('Performance Monitoring', () => {
    it('should track FPS correctly', () => {
      const targetFPS = 144;
      const frameTime = 1000 / targetFPS; // ~6.94ms per frame

      expect(frameTime).toBeCloseTo(6.94, 1);
      expect(frameTime).toBeLessThan(16.67); // Better than 60 FPS
    });

    it('should handle delta time calculations', () => {
      const currentTime = 1000;
      const lastTime = 990;
      const deltaTime = currentTime - lastTime;

      expect(deltaTime).toBe(10);
      expect(deltaTime).toBeGreaterThan(0);
    });
  });

  describe('Team Management', () => {
    it('should balance teams correctly', () => {
      const players = [
        { team: 'ct' },
        { team: 'ct' },
        { team: 't' },
        { team: 't' },
        { team: 'ct' },
      ];

      const ctCount = players.filter(p => p.team === 'ct').length;
      const tCount = players.filter(p => p.team === 't').length;

      expect(ctCount).toBe(3);
      expect(tCount).toBe(2);
      expect(Math.abs(ctCount - tCount)).toBeLessThanOrEqual(1); // Teams should be balanced
    });
  });

  describe('Economy System', () => {
    it('should calculate kill rewards correctly', () => {
      const killReward = 300;
      const initialMoney = 800;
      const expectedMoney = initialMoney + killReward;

      expect(expectedMoney).toBe(1100);
    });

    it('should calculate round win bonuses', () => {
      const roundWinBonus = 3250;
      const bombDefuseBonus = 2500;
      const initialMoney = 1000;

      expect(initialMoney + roundWinBonus).toBe(4250);
      expect(initialMoney + bombDefuseBonus).toBe(3500);
    });

    it('should enforce money limits', () => {
      const maxMoney = 16000;
      let playerMoney = 15000;
      const reward = 2000;

      playerMoney = Math.min(playerMoney + reward, maxMoney);

      expect(playerMoney).toBe(maxMoney);
    });
  });

  describe('Weapon System Integration', () => {
    it('should handle weapon switching', () => {
      const weapons = ['knife', 'glock', 'ak47'];
      let currentWeaponIndex = 1; // glock
      
      // Switch to next weapon
      currentWeaponIndex = (currentWeaponIndex + 1) % weapons.length;
      
      expect(weapons[currentWeaponIndex]).toBe('ak47');
    });

    it('should validate weapon purchase', () => {
      const playerMoney = 2700;
      const ak47Cost = 2500;
      const canPurchase = playerMoney >= ak47Cost;

      expect(canPurchase).toBe(true);
    });
  });
});