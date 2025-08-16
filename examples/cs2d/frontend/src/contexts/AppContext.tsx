import React, { createContext, useContext, useReducer, useEffect, ReactNode } from 'react';
import type { GameNotification } from '@/types/game';

export interface AppState {
  loading: boolean;
  title: string;
  theme: 'dark' | 'light';
  language: 'en' | 'zh-TW';
  notifications: GameNotification[];
  online: boolean;
  fullscreen: boolean;
  soundEnabled: boolean;
  musicEnabled: boolean;
  volume: number;
  debugMode: boolean;
}

type AppAction =
  | { type: 'SET_LOADING'; payload: boolean }
  | { type: 'SET_TITLE'; payload: string }
  | { type: 'SET_THEME'; payload: 'dark' | 'light' }
  | { type: 'SET_LANGUAGE'; payload: 'en' | 'zh-TW' }
  | { type: 'ADD_NOTIFICATION'; payload: GameNotification }
  | { type: 'REMOVE_NOTIFICATION'; payload: string }
  | { type: 'CLEAR_NOTIFICATIONS' }
  | { type: 'MARK_NOTIFICATION_READ'; payload: string }
  | { type: 'SET_ONLINE'; payload: boolean }
  | { type: 'SET_FULLSCREEN'; payload: boolean }
  | { type: 'SET_SOUND_ENABLED'; payload: boolean }
  | { type: 'SET_MUSIC_ENABLED'; payload: boolean }
  | { type: 'SET_VOLUME'; payload: number }
  | { type: 'SET_DEBUG_MODE'; payload: boolean }
  | { type: 'RESET' }
  | { type: 'LOAD_SETTINGS'; payload: Partial<AppState> };

const initialState: AppState = {
  loading: false,
  title: 'CS2D - Counter-Strike 2D',
  theme: 'dark',
  language: 'en',
  notifications: [],
  online: navigator.onLine,
  fullscreen: false,
  soundEnabled: true,
  musicEnabled: true,
  volume: 0.8,
  debugMode: import.meta.env.DEV,
};

function appReducer(state: AppState, action: AppAction): AppState {
  switch (action.type) {
    case 'SET_LOADING':
      return { ...state, loading: action.payload };
    case 'SET_TITLE':
      return { ...state, title: action.payload };
    case 'SET_THEME':
      return { ...state, theme: action.payload };
    case 'SET_LANGUAGE':
      return { ...state, language: action.payload };
    case 'ADD_NOTIFICATION':
      return { ...state, notifications: [...state.notifications, action.payload] };
    case 'REMOVE_NOTIFICATION':
      return {
        ...state,
        notifications: state.notifications.filter(n => n.id !== action.payload),
      };
    case 'CLEAR_NOTIFICATIONS':
      return { ...state, notifications: [] };
    case 'MARK_NOTIFICATION_READ':
      return {
        ...state,
        notifications: state.notifications.map(n =>
          n.id === action.payload ? { ...n, id: `read_${n.id}` } : n
        ),
      };
    case 'SET_ONLINE':
      return { ...state, online: action.payload };
    case 'SET_FULLSCREEN':
      return { ...state, fullscreen: action.payload };
    case 'SET_SOUND_ENABLED':
      return { ...state, soundEnabled: action.payload };
    case 'SET_MUSIC_ENABLED':
      return { ...state, musicEnabled: action.payload };
    case 'SET_VOLUME':
      return { ...state, volume: Math.max(0, Math.min(1, action.payload)) };
    case 'SET_DEBUG_MODE':
      return { ...state, debugMode: action.payload };
    case 'LOAD_SETTINGS':
      return { ...state, ...action.payload };
    case 'RESET':
      return { ...initialState, debugMode: import.meta.env.DEV };
    default:
      return state;
  }
}

interface AppContextType {
  state: AppState;
  actions: {
    setLoading: (loading: boolean) => void;
    setTitle: (title: string) => void;
    setTheme: (theme: 'dark' | 'light') => void;
    setLanguage: (language: 'en' | 'zh-TW') => void;
    addNotification: (notification: Omit<GameNotification, 'id' | 'timestamp'>) => void;
    removeNotification: (id: string) => void;
    clearNotifications: () => void;
    markNotificationAsRead: (id: string) => void;
    toggleFullscreen: () => void;
    setSoundEnabled: (enabled: boolean) => void;
    setMusicEnabled: (enabled: boolean) => void;
    setVolume: (volume: number) => void;
    setDebugMode: (enabled: boolean) => void;
    reset: () => void;
  };
  computed: {
    isLoading: boolean;
    currentTheme: 'dark' | 'light';
    currentLanguage: 'en' | 'zh-TW';
    unreadNotifications: GameNotification[];
    isOnline: boolean;
    isFullscreen: boolean;
    audioSettings: { soundEnabled: boolean; musicEnabled: boolean; volume: number };
  };
}

const AppContext = createContext<AppContextType | undefined>(undefined);

export const AppProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  const [state, dispatch] = useReducer(appReducer, initialState);

  // Initialize app on mount
  useEffect(() => {
    // Load settings from localStorage
    loadSettings();

    // Set up online/offline detection
    const handleOnline = () => {
      dispatch({ type: 'SET_ONLINE', payload: true });
      addNotification({
        type: 'success',
        title: 'Connection Restored',
        message: 'You are back online!'
      });
    };

    const handleOffline = () => {
      dispatch({ type: 'SET_ONLINE', payload: false });
      addNotification({
        type: 'warning',
        title: 'Connection Lost',
        message: 'You are currently offline'
      });
    };

    const handleFullscreenChange = () => {
      dispatch({ type: 'SET_FULLSCREEN', payload: !!document.fullscreenElement });
    };

    const handleVisibilityChange = () => {
      if (document.hidden) {
        dispatch({ type: 'SET_LOADING', payload: false });
      }
    };

    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);
    document.addEventListener('fullscreenchange', handleFullscreenChange);
    document.addEventListener('visibilitychange', handleVisibilityChange);

    console.log('[App] Initialized successfully');

    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
      document.removeEventListener('fullscreenchange', handleFullscreenChange);
      document.removeEventListener('visibilitychange', handleVisibilityChange);
    };
  }, []);

  // Save settings whenever they change
  useEffect(() => {
    saveSettings();
  }, [state.theme, state.language, state.soundEnabled, state.musicEnabled, state.volume]);

  // Apply theme changes
  useEffect(() => {
    document.documentElement.setAttribute('data-theme', state.theme);
  }, [state.theme]);

  // Apply title changes
  useEffect(() => {
    document.title = state.title;
  }, [state.title]);

  const loadSettings = () => {
    try {
      const saved = localStorage.getItem('cs2d_app_settings');
      if (saved) {
        const settings = JSON.parse(saved);
        dispatch({
          type: 'LOAD_SETTINGS',
          payload: {
            theme: settings.theme || 'dark',
            language: settings.language || 'en',
            soundEnabled: settings.soundEnabled !== undefined ? settings.soundEnabled : true,
            musicEnabled: settings.musicEnabled !== undefined ? settings.musicEnabled : true,
            volume: settings.volume !== undefined ? settings.volume : 0.8,
          }
        });
      }
    } catch (error) {
      console.error('Failed to load app settings:', error);
    }
  };

  const saveSettings = () => {
    const settings = {
      theme: state.theme,
      language: state.language,
      soundEnabled: state.soundEnabled,
      musicEnabled: state.musicEnabled,
      volume: state.volume
    };

    try {
      localStorage.setItem('cs2d_app_settings', JSON.stringify(settings));
    } catch (error) {
      console.error('Failed to save app settings:', error);
    }
  };

  const addNotification = (notification: Omit<GameNotification, 'id' | 'timestamp'>) => {
    const newNotification: GameNotification = {
      id: `notification_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
      timestamp: Date.now(),
      duration: notification.duration || 5000,
      ...notification
    };

    dispatch({ type: 'ADD_NOTIFICATION', payload: newNotification });

    // Auto-remove notification after duration
    if (newNotification.duration && newNotification.duration > 0) {
      setTimeout(() => {
        dispatch({ type: 'REMOVE_NOTIFICATION', payload: newNotification.id });
      }, newNotification.duration);
    }
  };

  const toggleFullscreen = () => {
    if (!document.fullscreenElement) {
      document.documentElement.requestFullscreen().catch((err) => {
        addNotification({
          type: 'error',
          title: 'Fullscreen Failed',
          message: `Error attempting to enable fullscreen: ${err.message}`
        });
      });
    } else {
      document.exitFullscreen();
    }
  };

  const actions = {
    setLoading: (loading: boolean) => dispatch({ type: 'SET_LOADING', payload: loading }),
    setTitle: (title: string) => dispatch({ type: 'SET_TITLE', payload: title }),
    setTheme: (theme: 'dark' | 'light') => dispatch({ type: 'SET_THEME', payload: theme }),
    setLanguage: (language: 'en' | 'zh-TW') => dispatch({ type: 'SET_LANGUAGE', payload: language }),
    addNotification,
    removeNotification: (id: string) => dispatch({ type: 'REMOVE_NOTIFICATION', payload: id }),
    clearNotifications: () => dispatch({ type: 'CLEAR_NOTIFICATIONS' }),
    markNotificationAsRead: (id: string) => dispatch({ type: 'MARK_NOTIFICATION_READ', payload: id }),
    toggleFullscreen,
    setSoundEnabled: (enabled: boolean) => dispatch({ type: 'SET_SOUND_ENABLED', payload: enabled }),
    setMusicEnabled: (enabled: boolean) => dispatch({ type: 'SET_MUSIC_ENABLED', payload: enabled }),
    setVolume: (volume: number) => dispatch({ type: 'SET_VOLUME', payload: volume }),
    setDebugMode: (enabled: boolean) => dispatch({ type: 'SET_DEBUG_MODE', payload: enabled }),
    reset: () => {
      dispatch({ type: 'RESET' });
      localStorage.removeItem('cs2d_app_settings');
    }
  };

  const computed = {
    isLoading: state.loading,
    currentTheme: state.theme,
    currentLanguage: state.language,
    unreadNotifications: state.notifications.filter(n => !n.id.startsWith('read_')),
    isOnline: state.online,
    isFullscreen: state.fullscreen,
    audioSettings: {
      soundEnabled: state.soundEnabled,
      musicEnabled: state.musicEnabled,
      volume: state.volume
    }
  };

  return (
    <AppContext.Provider value={{ state, actions, computed }}>
      {children}
    </AppContext.Provider>
  );
};

export const useApp = (): AppContextType => {
  const context = useContext(AppContext);
  if (!context) {
    throw new Error('useApp must be used within AppProvider');
  }
  return context;
};