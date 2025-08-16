import React, { createContext, useContext, useReducer, useEffect, type ReactNode } from 'react';
import type { Player } from '@/types/game';

export interface AuthState {
  player: Player | null;
  token: string | null;
  isGuest: boolean;
}

type AuthAction =
  | { type: 'SET_PLAYER'; payload: Player | null }
  | { type: 'SET_TOKEN'; payload: string | null }
  | { type: 'SET_IS_GUEST'; payload: boolean }
  | { type: 'UPDATE_PLAYER'; payload: Partial<Player> }
  | { type: 'RESET' };

const initialState: AuthState = {
  player: null,
  token: null,
  isGuest: false,
};

function authReducer(state: AuthState, action: AuthAction): AuthState {
  switch (action.type) {
    case 'SET_PLAYER':
      return { ...state, player: action.payload };
    case 'SET_TOKEN':
      return { ...state, token: action.payload };
    case 'SET_IS_GUEST':
      return { ...state, isGuest: action.payload };
    case 'UPDATE_PLAYER':
      return {
        ...state,
        player: state.player ? { ...state.player, ...action.payload } : null,
      };
    case 'RESET':
      return initialState;
    default:
      return state;
  }
}

interface AuthContextType {
  state: AuthState;
  actions: {
    initializePlayer: (name?: string) => Promise<void>;
    updatePlayer: (updates: Partial<Player>) => void;
    setPlayerName: (name: string) => void;
    setPlayerTeam: (team: 'terrorist' | 'counter_terrorist' | 'spectator') => void;
    setPlayerReady: (ready: boolean) => void;
    logout: () => void;
    reset: () => void;
  };
  computed: {
    isAuthenticated: boolean;
    playerName: string;
    playerId: string | null;
  };
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  const [state, dispatch] = useReducer(authReducer, initialState);

  // Load player from storage on mount
  useEffect(() => {
    loadPlayerFromStorage();
  }, []);

  // Save player to storage whenever it changes
  useEffect(() => {
    if (state.player) {
      localStorage.setItem('cs2d_player', JSON.stringify(state.player));
      localStorage.setItem('cs2d_is_guest', state.isGuest.toString());
    }
  }, [state.player, state.isGuest]);

  const loadPlayerFromStorage = () => {
    try {
      const savedPlayer = localStorage.getItem('cs2d_player');
      const savedIsGuest = localStorage.getItem('cs2d_is_guest');

      if (savedPlayer) {
        const player = JSON.parse(savedPlayer);
        dispatch({ type: 'SET_PLAYER', payload: player });
        dispatch({ type: 'SET_IS_GUEST', payload: savedIsGuest === 'true' });
      }
    } catch (error) {
      console.error('Failed to load player from storage:', error);
    }
  };

  const initializePlayer = async (name?: string): Promise<void> => {
    return new Promise((resolve) => {
      // Generate a temporary player for guest access
      const guestPlayer: Player = {
        id: `guest_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
        name: name || `Guest${Math.floor(Math.random() * 1000)}`,
        team: 'spectator',
        position: { x: 0, y: 0 },
        health: 100,
        armor: 0,
        money: 800,
        weapon: {
          id: 'knife',
          name: 'Knife',
          type: 'knife',
          ammo: 0,
          maxAmmo: 0,
          clipSize: 0,
          damage: 50,
          range: 1,
          accuracy: 1,
          fireRate: 1,
          reloadTime: 0,
          price: 0,
          killReward: 0
        },
        alive: true,
        kills: 0,
        deaths: 0,
        assists: 0,
        ping: 0,
        ready: false
      };

      dispatch({ type: 'SET_PLAYER', payload: guestPlayer });
      dispatch({ type: 'SET_IS_GUEST', payload: true });
      resolve();
    });
  };

  const updatePlayer = (updates: Partial<Player>) => {
    dispatch({ type: 'UPDATE_PLAYER', payload: updates });
  };

  const setPlayerName = (name: string) => {
    updatePlayer({ name });
  };

  const setPlayerTeam = (team: 'terrorist' | 'counter_terrorist' | 'spectator') => {
    updatePlayer({ team });
  };

  const setPlayerReady = (ready: boolean) => {
    updatePlayer({ ready });
  };

  const logout = () => {
    dispatch({ type: 'RESET' });
    localStorage.removeItem('cs2d_player');
    localStorage.removeItem('cs2d_token');
    localStorage.removeItem('cs2d_is_guest');
  };

  const reset = () => {
    logout();
  };

  const actions = {
    initializePlayer,
    updatePlayer,
    setPlayerName,
    setPlayerTeam,
    setPlayerReady,
    logout,
    reset,
  };

  const computed = {
    isAuthenticated: state.player !== null,
    playerName: state.player?.name || 'Anonymous',
    playerId: state.player?.id || null,
  };

  return (
    <AuthContext.Provider value={{ state, actions, computed }}>
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = (): AuthContextType => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within AuthProvider');
  }
  return context;
};