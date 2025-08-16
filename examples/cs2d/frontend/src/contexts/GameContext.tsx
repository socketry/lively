import React, { createContext, useContext, useReducer, type ReactNode } from 'react';
import type { Player, GameState, GameStatus, Weapon, Position, PlayerInput } from '@/types/game';

// Event data types for game events
interface GameStateUpdateData {
  players?: Player[];
  localPlayer?: Player;
  gameState?: GameState;
  scores?: { ct: number; t: number };
  lastProcessedInput?: number;
}

interface PlayerSpawnData {
  playerId: string;
  position: Position;
  armor?: number;
  weapons?: Weapon[];
  weapon: Weapon;
}

interface PlayerMoveData {
  playerId: string;
  position: Position;
  velocity?: { x: number; y: number };
}

interface PlayerShootData {
  playerId: string;
  weapon: Weapon;
  angle: number;
  position: Position;
}

interface PlayerHitData {
  playerId: string;
  damage: number;
  health: number;
  armor?: number;
}

interface PlayerDeathData {
  playerId: string;
  killerId?: string;
  weapon?: Weapon;
}

interface RoundStartData {
  roundNumber: number;
  roundTime: number;
  freezeTime?: number;
}

interface RoundEndData {
  winner: 'ct' | 't';
  reason: string;
  scores: { ct: number; t: number };
}

interface BombPlantedData {
  position: Position;
  timer: number;
  planterId: string;
}

interface GameContextState {
  gameStatus: GameStatus;
  gameState: GameState | null;
  currentRoomId: string | null;
  players: Map<string, Player>;
  localPlayer: Player | null;
  spectatingPlayerId: string | null;
  roundTime: number;
  roundNumber: number;
  teamScores: { ct: number; t: number };
  bombPlanted: boolean;
  bombPosition: Position | null;
  bombTimer: number;
  pendingInputs: PlayerInput[];
  inputSequence: number;
  fps: number;
  ping: number;
  packetLoss: number;
}

type GameAction =
  | { type: 'SET_GAME_STATUS'; payload: GameStatus }
  | { type: 'SET_GAME_STATE'; payload: GameState | null }
  | { type: 'SET_CURRENT_ROOM_ID'; payload: string | null }
  | { type: 'SET_PLAYERS'; payload: Player[] }
  | { type: 'UPDATE_PLAYER'; payload: { id: string; updates: Partial<Player> } }
  | { type: 'SET_LOCAL_PLAYER'; payload: Player | null }
  | { type: 'SET_SPECTATING_PLAYER_ID'; payload: string | null }
  | { type: 'SET_ROUND_TIME'; payload: number }
  | { type: 'SET_ROUND_NUMBER'; payload: number }
  | { type: 'SET_TEAM_SCORES'; payload: { ct: number; t: number } }
  | { type: 'SET_BOMB_PLANTED'; payload: boolean }
  | { type: 'SET_BOMB_POSITION'; payload: Position | null }
  | { type: 'SET_BOMB_TIMER'; payload: number }
  | { type: 'ADD_PENDING_INPUT'; payload: PlayerInput }
  | { type: 'REMOVE_PENDING_INPUTS'; payload: number }
  | { type: 'INCREMENT_INPUT_SEQUENCE' }
  | { type: 'UPDATE_PERFORMANCE_METRICS'; payload: { fps: number; ping: number; packetLoss: number } }
  | { type: 'RESET' };

const initialState: GameContextState = {
  gameStatus: 'idle',
  gameState: null,
  currentRoomId: null,
  players: new Map(),
  localPlayer: null,
  spectatingPlayerId: null,
  roundTime: 0,
  roundNumber: 0,
  teamScores: { ct: 0, t: 0 },
  bombPlanted: false,
  bombPosition: null,
  bombTimer: 0,
  pendingInputs: [],
  inputSequence: 0,
  fps: 0,
  ping: 0,
  packetLoss: 0
};

function gameReducer(state: GameContextState, action: GameAction): GameContextState {
  switch (action.type) {
    case 'SET_GAME_STATUS':
      return { ...state, gameStatus: action.payload };
    case 'SET_GAME_STATE':
      return { ...state, gameState: action.payload };
    case 'SET_CURRENT_ROOM_ID':
      return { ...state, currentRoomId: action.payload };
    case 'SET_PLAYERS': {
      const newPlayersMap = new Map();
      action.payload.forEach(player => newPlayersMap.set(player.id, player));
      return { ...state, players: newPlayersMap };
    }
    case 'UPDATE_PLAYER': {
      const updatedPlayers = new Map(state.players);
      const existingPlayer = updatedPlayers.get(action.payload.id);
      if (existingPlayer) {
        updatedPlayers.set(action.payload.id, { ...existingPlayer, ...action.payload.updates });
      }
      return { ...state, players: updatedPlayers };
    }
    case 'SET_LOCAL_PLAYER':
      return { ...state, localPlayer: action.payload };
    case 'SET_SPECTATING_PLAYER_ID':
      return { ...state, spectatingPlayerId: action.payload };
    case 'SET_ROUND_TIME':
      return { ...state, roundTime: action.payload };
    case 'SET_ROUND_NUMBER':
      return { ...state, roundNumber: action.payload };
    case 'SET_TEAM_SCORES':
      return { ...state, teamScores: action.payload };
    case 'SET_BOMB_PLANTED':
      return { ...state, bombPlanted: action.payload };
    case 'SET_BOMB_POSITION':
      return { ...state, bombPosition: action.payload };
    case 'SET_BOMB_TIMER':
      return { ...state, bombTimer: action.payload };
    case 'ADD_PENDING_INPUT':
      return { ...state, pendingInputs: [...state.pendingInputs, action.payload] };
    case 'REMOVE_PENDING_INPUTS':
      return {
        ...state,
        pendingInputs: state.pendingInputs.filter(input => input.sequence > action.payload)
      };
    case 'INCREMENT_INPUT_SEQUENCE':
      return { ...state, inputSequence: state.inputSequence + 1 };
    case 'UPDATE_PERFORMANCE_METRICS':
      return {
        ...state,
        fps: action.payload.fps,
        ping: action.payload.ping,
        packetLoss: action.payload.packetLoss
      };
    case 'RESET':
      return { ...initialState, players: new Map() };
    default:
      return state;
  }
}

interface GameContextType {
  state: GameContextState;
  actions: {
    initializeGame: (roomId: string) => void;
    movePlayer: (dx: number, dy: number) => void;
    shoot: (weapon: Weapon) => void;
    leaveGame: () => void;
    updatePerformanceMetrics: (metrics: { fps: number; ping: number; packetLoss: number }) => void;
    handleGameStateUpdate: (data: GameStateUpdateData) => void;
    handlePlayerSpawn: (data: PlayerSpawnData) => void;
    handlePlayerMove: (data: PlayerMoveData) => void;
    handlePlayerShoot: (data: PlayerShootData) => void;
    handlePlayerHit: (data: PlayerHitData) => void;
    handlePlayerDeath: (data: PlayerDeathData) => void;
    handleRoundStart: (data: RoundStartData) => void;
    handleRoundEnd: (data: RoundEndData) => void;
    handleBombPlanted: (data: BombPlantedData) => void;
    handleBombDefused: () => void;
    handleBombExploded: () => void;
  };
  computed: {
    isPlaying: boolean;
    isSpectating: boolean;
    isAlive: boolean;
    currentTeam: string | undefined;
    alivePlayersCount: { ct: number; t: number };
  };
}

const GameContext = createContext<GameContextType | undefined>(undefined);

export const GameProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  const [state, dispatch] = useReducer(gameReducer, initialState);

  // Helper function to calculate distance
  const calculateDistance = (pos1: Position, pos2: Position): number => {
    const dx = pos1.x - pos2.x;
    const dy = pos1.y - pos2.y;
    return Math.sqrt(dx * dx + dy * dy);
  };

  // Helper function to auto-spectate
  const autoSpectate = () => {
    const alivePlayer = Array.from(state.players.values()).find(
      (p: Player) => p.alive || p.isAlive
    );
    if (alivePlayer) {
      dispatch({ type: 'SET_SPECTATING_PLAYER_ID', payload: alivePlayer.id });
    }
  };

  const actions = {
    initializeGame: (roomId: string) => {
      dispatch({ type: 'SET_CURRENT_ROOM_ID', payload: roomId });
      dispatch({ type: 'SET_GAME_STATUS', payload: 'loading' });

      // Note: WebSocket logic would be handled by a separate hook
      console.log('Initializing game for room:', roomId);
    },

    movePlayer: (dx: number, dy: number) => {
      if (!state.localPlayer || state.localPlayer.health <= 0) return;

      dispatch({ type: 'INCREMENT_INPUT_SEQUENCE' });
      
      const input = {
        sequence: state.inputSequence + 1,
        dx,
        dy,
        timestamp: Date.now()
      };

      // Apply immediately (client-side prediction)
      const updatedPlayer = {
        ...state.localPlayer,
        position: {
          x: state.localPlayer.position.x + dx,
          y: state.localPlayer.position.y + dy
        }
      };
      
      dispatch({ type: 'SET_LOCAL_PLAYER', payload: updatedPlayer });
      dispatch({ type: 'ADD_PENDING_INPUT', payload: input });

      // Note: WebSocket emission would be handled by a separate hook
      console.log('Moving player:', input);
    },

    shoot: (weapon: Weapon) => {
      if (!state.localPlayer || state.localPlayer.health <= 0) return;

      dispatch({ type: 'INCREMENT_INPUT_SEQUENCE' });
      
      const input = {
        sequence: state.inputSequence + 1,
        weapon: weapon.id,
        angle: state.localPlayer.angle || 0,
        timestamp: Date.now()
      };

      // Note: WebSocket emission would be handled by a separate hook
      console.log('Shooting weapon:', input);
    },

    leaveGame: () => {
      dispatch({ type: 'RESET' });
      console.log('Leaving game');
    },

    updatePerformanceMetrics: (metrics: { fps: number; ping: number; packetLoss: number }) => {
      dispatch({ type: 'UPDATE_PERFORMANCE_METRICS', payload: metrics });
    },

    handleGameStateUpdate: (data: GameStateUpdateData) => {
      if (data.players) {
        dispatch({ type: 'SET_PLAYERS', payload: data.players });
      }

      if (data.localPlayer) {
        dispatch({ type: 'SET_LOCAL_PLAYER', payload: data.localPlayer });
      }

      if (data.gameState) {
        dispatch({ type: 'SET_GAME_STATE', payload: data.gameState });
      }

      if (data.scores) {
        dispatch({ type: 'SET_TEAM_SCORES', payload: data.scores });
      }

      if (data.lastProcessedInput) {
        dispatch({ type: 'REMOVE_PENDING_INPUTS', payload: data.lastProcessedInput });
      }
    },

    handlePlayerSpawn: (data: PlayerSpawnData) => {
      dispatch({
        type: 'UPDATE_PLAYER',
        payload: {
          id: data.playerId,
          updates: {
            position: data.position,
            health: 100,
            armor: data.armor || 0,
            weapons: data.weapons || [],
            weapon: data.weapon
          }
        }
      });
    },

    handlePlayerMove: (data: PlayerMoveData) => {
      if (data.playerId !== state.localPlayer?.id) {
        dispatch({
          type: 'UPDATE_PLAYER',
          payload: {
            id: data.playerId,
            updates: { position: data.position }
          }
        });
      }
    },

    handlePlayerShoot: (data: PlayerShootData) => {
      // Handle shooting animation/sound and ammo updates
      console.log('Player shoot:', data);
    },

    handlePlayerHit: (data: PlayerHitData) => {
      dispatch({
        type: 'UPDATE_PLAYER',
        payload: {
          id: data.playerId,
          updates: { health: Math.max(0, data.health) }
        }
      });

      if (data.playerId === state.localPlayer?.id) {
        // Show damage indicator
        window.dispatchEvent(new CustomEvent('damage-indicator', { 
          detail: { damage: data.damage } 
        }));
      }
    },

    handlePlayerDeath: (data: PlayerDeathData) => {
      dispatch({
        type: 'UPDATE_PLAYER',
        payload: {
          id: data.playerId,
          updates: { health: 0, alive: false, isAlive: false }
        }
      });

      if (data.playerId === state.localPlayer?.id) {
        dispatch({ type: 'SET_GAME_STATUS', payload: 'spectating' });
        autoSpectate();
      }
    },

    handleRoundStart: (data: RoundStartData) => {
      dispatch({ type: 'SET_ROUND_NUMBER', payload: data.roundNumber });
      dispatch({ type: 'SET_ROUND_TIME', payload: data.roundTime });
      dispatch({ type: 'SET_BOMB_PLANTED', payload: false });
      dispatch({ type: 'SET_BOMB_POSITION', payload: null });

      // Reset all players
      const resetPlayers = Array.from(state.players.values()).map(player => ({
        ...player,
        health: 100,
        alive: true,
        isAlive: true
      }));
      dispatch({ type: 'SET_PLAYERS', payload: resetPlayers });
    },

    handleRoundEnd: (data: RoundEndData) => {
      dispatch({ type: 'SET_TEAM_SCORES', payload: data.scores });
      dispatch({ type: 'SET_GAME_STATUS', payload: 'round-end' });
    },

    handleBombPlanted: (data: BombPlantedData) => {
      dispatch({ type: 'SET_BOMB_PLANTED', payload: true });
      dispatch({ type: 'SET_BOMB_POSITION', payload: data.position });
      dispatch({ type: 'SET_BOMB_TIMER', payload: 40 });
    },

    handleBombDefused: () => {
      dispatch({ type: 'SET_BOMB_PLANTED', payload: false });
      dispatch({ type: 'SET_BOMB_POSITION', payload: null });
      dispatch({ type: 'SET_BOMB_TIMER', payload: 0 });
    },

    handleBombExploded: () => {
      dispatch({ type: 'SET_BOMB_PLANTED', payload: false });

      // Damage nearby players
      if (state.bombPosition) {
        const explosionRadius = 500;
        const bombPos = state.bombPosition;
        const damagedPlayers = Array.from(state.players.values()).map(player => {
          const distance = calculateDistance(player.position, bombPos);
          if (distance < explosionRadius) {
            const damage = Math.floor((1 - distance / explosionRadius) * 200);
            return { ...player, health: Math.max(0, player.health - damage) };
          }
          return player;
        });
        dispatch({ type: 'SET_PLAYERS', payload: damagedPlayers });
      }
    }
  };

  const computed = {
    isPlaying: state.gameStatus === 'playing',
    isSpectating: state.gameStatus === 'spectating',
    isAlive: (state.localPlayer?.health ?? 0) > 0,
    currentTeam: state.localPlayer?.team,
    alivePlayersCount: (() => {
      const count = { ct: 0, t: 0 };
      state.players.forEach((player: Player) => {
        if (player.health > 0) {
          if (player.team === 'terrorist') {
            count.t++;
          } else if (player.team === 'counter_terrorist') {
            count.ct++;
          }
        }
      });
      return count;
    })()
  };

  return (
    <GameContext.Provider value={{ state, actions, computed }}>
      {children}
    </GameContext.Provider>
  );
};

export const useGame = (): GameContextType => {
  const context = useContext(GameContext);
  if (!context) {
    throw new Error('useGame must be used within GameProvider');
  }
  return context;
};