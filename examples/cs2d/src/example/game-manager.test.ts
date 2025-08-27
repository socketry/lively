import { describe, it, expect, beforeEach } from 'vitest';
import { GameManager } from './game-manager';

describe('GameManager', () => {
  let gameManager: GameManager;

  beforeEach(() => {
    gameManager = new GameManager();
  });

  describe('Player Management', () => {
    it('should add a player correctly', () => {
      const player = {
        id: 'player1',
        name: 'TestPlayer',
        team: 'ct' as const,
        score: 0,
        health: 100,
        position: { x: 0, y: 0, z: 0 },
        inventory: {
          primary: null,
          secondary: null,
          grenades: [],
          money: 800,
        },
      };

      gameManager.addPlayer(player);
      expect(gameManager.getPlayerCount()).toBe(1);
      expect(gameManager.getTeamPlayers('ct')).toContainEqual(player);
    });

    it('should remove a player correctly', () => {
      const player = {
        id: 'player1',
        name: 'TestPlayer',
        team: 't' as const,
        score: 0,
        health: 100,
        position: { x: 0, y: 0, z: 0 },
        inventory: {
          primary: null,
          secondary: null,
          grenades: [],
          money: 800,
        },
      };

      gameManager.addPlayer(player);
      const removed = gameManager.removePlayer('player1');

      expect(removed).toBe(true);
      expect(gameManager.getPlayerCount()).toBe(0);
    });

    it('should return false when removing non-existent player', () => {
      const removed = gameManager.removePlayer('non-existent');
      expect(removed).toBe(false);
    });

    it('should update player health correctly', () => {
      const player = {
        id: 'player1',
        name: 'TestPlayer',
        team: 'ct' as const,
        score: 0,
        health: 100,
        position: { x: 0, y: 0, z: 0 },
        inventory: {
          primary: null,
          secondary: null,
          grenades: [],
          money: 800,
        },
      };

      gameManager.addPlayer(player);
      gameManager.updatePlayerHealth('player1', 50);

      const state = gameManager.getState();
      expect(state.players.get('player1')?.health).toBe(50);
    });

    it('should clamp health between 0 and 100', () => {
      const player = {
        id: 'player1',
        name: 'TestPlayer',
        team: 'ct' as const,
        score: 0,
        health: 100,
        position: { x: 0, y: 0, z: 0 },
        inventory: {
          primary: null,
          secondary: null,
          grenades: [],
          money: 800,
        },
      };

      gameManager.addPlayer(player);

      gameManager.updatePlayerHealth('player1', 150);
      let state = gameManager.getState();
      expect(state.players.get('player1')?.health).toBe(100);

      gameManager.updatePlayerHealth('player1', -50);
      state = gameManager.getState();
      expect(state.players.get('player1')?.health).toBe(0);
    });

    it('should throw error when updating non-existent player health', () => {
      expect(() => gameManager.updatePlayerHealth('non-existent', 50)).toThrowError(
        'Player with ID non-existent not found',
      );
    });
  });

  describe('Bomb Management', () => {
    it('should plant bomb correctly', () => {
      gameManager.plantBomb();
      const state = gameManager.getState();
      expect(state.bombPlanted).toBe(true);
      expect(state.timeLeft).toBe(45);
    });

    it('should throw error when planting bomb twice', () => {
      gameManager.plantBomb();
      expect(() => gameManager.plantBomb()).toThrowError('Bomb is already planted');
    });

    it('should defuse bomb correctly', () => {
      gameManager.plantBomb();
      gameManager.defuseBomb();
      const state = gameManager.getState();
      // After defusing, a new round starts so bombDefused is reset to false
      expect(state.bombDefused).toBe(false);
      expect(state.ctScore).toBe(1);
    });

    it('should throw error when defusing without planted bomb', () => {
      expect(() => gameManager.defuseBomb()).toThrowError('No bomb to defuse');
    });
  });

  describe('Team Management', () => {
    it('should calculate team health correctly', () => {
      const ctPlayer = {
        id: 'ct1',
        name: 'CT Player',
        team: 'ct' as const,
        score: 0,
        health: 80,
        position: { x: 0, y: 0, z: 0 },
        inventory: {
          primary: null,
          secondary: null,
          grenades: [],
          money: 800,
        },
      };

      const tPlayer = {
        id: 't1',
        name: 'T Player',
        team: 't' as const,
        score: 0,
        health: 60,
        position: { x: 0, y: 0, z: 0 },
        inventory: {
          primary: null,
          secondary: null,
          grenades: [],
          money: 800,
        },
      };

      gameManager.addPlayer(ctPlayer);
      gameManager.addPlayer(tPlayer);

      expect(gameManager.calculateTeamHealth('ct')).toBe(80);
      expect(gameManager.calculateTeamHealth('t')).toBe(60);
    });

    it('should get team players correctly', () => {
      const ctPlayer1 = {
        id: 'ct1',
        name: 'CT1',
        team: 'ct' as const,
        score: 0,
        health: 100,
        position: { x: 0, y: 0, z: 0 },
        inventory: {
          primary: null,
          secondary: null,
          grenades: [],
          money: 800,
        },
      };

      const ctPlayer2 = {
        id: 'ct2',
        name: 'CT2',
        team: 'ct' as const,
        score: 0,
        health: 100,
        position: { x: 0, y: 0, z: 0 },
        inventory: {
          primary: null,
          secondary: null,
          grenades: [],
          money: 800,
        },
      };

      const tPlayer = {
        id: 't1',
        name: 'T1',
        team: 't' as const,
        score: 0,
        health: 100,
        position: { x: 0, y: 0, z: 0 },
        inventory: {
          primary: null,
          secondary: null,
          grenades: [],
          money: 800,
        },
      };

      gameManager.addPlayer(ctPlayer1);
      gameManager.addPlayer(ctPlayer2);
      gameManager.addPlayer(tPlayer);

      const ctPlayers = gameManager.getTeamPlayers('ct');
      const tPlayers = gameManager.getTeamPlayers('t');

      expect(ctPlayers).toHaveLength(2);
      expect(tPlayers).toHaveLength(1);
    });
  });

  describe('Game State', () => {
    it('should initialize with correct default state', () => {
      const state = gameManager.getState();
      expect(state.round).toBe(1);
      expect(state.timeLeft).toBe(120);
      expect(state.ctScore).toBe(0);
      expect(state.tScore).toBe(0);
      expect(state.bombPlanted).toBe(false);
      expect(state.bombDefused).toBe(false);
      expect(state.players.size).toBe(0);
    });

    it('should detect game over correctly', () => {
      expect(gameManager.isGameOver()).toBe(false);

      // Simulate CT winning 16 rounds
      const gameWithScore = new GameManager({
        ctScore: 16,
        tScore: 14,
      });

      expect(gameWithScore.isGameOver()).toBe(true);
    });

    it('should determine round winner correctly', () => {
      // No winner initially
      expect(gameManager.getRoundWinner()).toBe(null);

      // CT wins by defusing
      gameManager.plantBomb();
      gameManager.defuseBomb();
      expect(gameManager.getState().ctScore).toBe(1);
    });
  });
});
