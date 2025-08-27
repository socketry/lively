/**
 * Global Type Definitions for CS2D
 * Extends Window and global types
 */

import type { GameManager } from '../example/game-manager';
import type { EventEmitter, MapData } from './game';

// Extend Window interface
declare global {
  interface Window {
    CS2D: CS2DGlobal;
    gameManager?: GameManager;
    debugMode?: boolean;
  }

  interface CS2DGlobal {
    readonly version: string;
    readonly buildDate: string;
    readonly environment: 'development' | 'production' | 'test';
    readonly config: CS2DConfig;
    readonly api: CS2DAPI;
    readonly events: EventEmitter;
    readonly performance: PerformanceMonitor;
  }

  interface CS2DConfig {
    readonly apiUrl: string;
    readonly wsUrl: string;
    readonly assetsPath: string;
    readonly maxReconnectAttempts: number;
    readonly reconnectDelay: number;
  }

  interface CS2DAPI {
    getMaps(): Promise<readonly MapData[]>;
    getMap(id: string): Promise<MapData>;
    saveMap(map: MapData): Promise<{ success: boolean; id: string }>;
    deleteMap(id: string): Promise<{ success: boolean }>;
    getServers(): Promise<readonly ServerInfo[]>;
    connectToServer(serverId: string): Promise<Connection>;
    createRoom(config: RoomConfig): Promise<Room>;
    joinRoom(roomId: string): Promise<Room>;
    leaveRoom(): Promise<void>;
    getPlayerStats(playerId: string): Promise<PlayerStats>;
    updateSettings(settings: GameSettings): Promise<void>;
  }

  interface PerformanceMonitor {
    readonly fps: number;
    readonly ping: number;
    readonly memoryUsage: number;
    readonly drawCalls: number;
    startMonitoring(): void;
    stopMonitoring(): void;
    getMetrics(): PerformanceMetrics;
  }

  interface PerformanceMetrics {
    readonly averageFps: number;
    readonly minFps: number;
    readonly maxFps: number;
    readonly frameTime: number;
    readonly renderTime: number;
    readonly updateTime: number;
    readonly networkLatency: number;
    readonly packetLoss: number;
  }

  interface ServerInfo {
    readonly id: string;
    readonly name: string;
    readonly region: string;
    readonly playerCount: number;
    readonly maxPlayers: number;
    readonly map: string;
    readonly gameMode: string;
    readonly ping: number;
    readonly isPasswordProtected: boolean;
  }

  interface Connection {
    readonly id: string;
    readonly serverId: string;
    readonly status: ConnectionStatus;
    readonly latency: number;
    send(message: NetworkMessage): void;
    disconnect(): void;
    on(event: string, handler: (data: unknown) => void): void;
    off(event: string, handler: (data: unknown) => void): void;
  }

  type ConnectionStatus = 'connecting' | 'connected' | 'disconnecting' | 'disconnected' | 'error';

  interface NetworkMessage {
    readonly type: string;
    readonly payload: unknown;
    readonly timestamp: number;
    readonly sequenceNumber?: number;
  }

  interface Room {
    readonly id: string;
    readonly name: string;
    readonly hostId: string;
    readonly players: readonly PlayerInfo[];
    readonly maxPlayers: number;
    readonly map: string;
    readonly gameMode: string;
    readonly status: RoomStatus;
    readonly config: RoomConfig;
    sendMessage(message: string): void;
    kickPlayer(playerId: string): void;
    startGame(): void;
    updateConfig(config: Partial<RoomConfig>): void;
  }

  type RoomStatus = 'waiting' | 'starting' | 'in_progress' | 'ending' | 'ended';

  interface RoomConfig {
    readonly name: string;
    readonly password?: string;
    readonly maxPlayers: number;
    readonly map: string;
    readonly gameMode: string;
    readonly roundTime: number;
    readonly maxRounds: number;
    readonly friendlyFire: boolean;
    readonly autoBalance: boolean;
  }

  interface PlayerInfo {
    readonly id: string;
    readonly name: string;
    readonly team: 'ct' | 't' | 'spectator';
    readonly isReady: boolean;
    readonly ping: number;
    readonly isHost: boolean;
  }

  interface PlayerStats {
    readonly playerId: string;
    readonly totalKills: number;
    readonly totalDeaths: number;
    readonly totalAssists: number;
    readonly winRate: number;
    readonly accuracy: number;
    readonly headshotRate: number;
    readonly favoriteWeapon: string;
    readonly totalPlayTime: number;
    readonly matchesPlayed: number;
    readonly matchesWon: number;
    readonly ranking: number;
    readonly experience: number;
    readonly level: number;
  }

  interface GameSettings {
    readonly graphics: GraphicsSettings;
    readonly audio: AudioSettings;
    readonly controls: ControlSettings;
    readonly gameplay: GameplaySettings;
  }

  interface GraphicsSettings {
    readonly resolution: { width: number; height: number };
    readonly fullscreen: boolean;
    readonly vsync: boolean;
    readonly antiAliasing: string;
    readonly textureQuality: string;
    readonly shadowQuality: string;
    readonly effectQuality: string;
    readonly brightness: number;
    readonly contrast: number;
  }

  interface AudioSettings {
    readonly masterVolume: number;
    readonly effectsVolume: number;
    readonly musicVolume: number;
    readonly voiceVolume: number;
    readonly voiceEnabled: boolean;
    readonly pushToTalk: boolean;
    readonly voiceKey: string;
  }

  interface ControlSettings {
    readonly mouseSensitivity: number;
    readonly mouseAcceleration: boolean;
    readonly invertY: boolean;
    readonly keyBindings: KeyBindings;
  }

  interface KeyBindings {
    readonly forward: string;
    readonly backward: string;
    readonly left: string;
    readonly right: string;
    readonly fire: string;
    readonly altFire: string;
    readonly reload: string;
    readonly use: string;
    readonly jump: string;
    readonly duck: string;
    readonly walk: string;
    readonly drop: string;
    readonly buy: string;
    readonly scoreboard: string;
    readonly chat: string;
    readonly teamChat: string;
    readonly voice: string;
    readonly [key: string]: string;
  }

  interface GameplaySettings {
    readonly crosshairStyle: string;
    readonly crosshairColor: { r: number; g: number; b: number };
    readonly hudScale: number;
    readonly hudOpacity: number;
    readonly showFps: boolean;
    readonly showPing: boolean;
    readonly showNetGraph: boolean;
    readonly autoReload: boolean;
    readonly autoSwitch: boolean;
    readonly viewmodel: ViewmodelSettings;
  }

  interface ViewmodelSettings {
    readonly fov: number;
    readonly offsetX: number;
    readonly offsetY: number;
    readonly offsetZ: number;
    readonly bobbing: boolean;
  }

  // Canvas Types
  interface CanvasRenderingContext2D {
    roundRect(x: number, y: number, width: number, height: number, radius: number): void;
  }

  // Storage Types
  interface Storage {
    getObject<T>(key: string): T | null;
    setObject<T>(key: string, value: T): void;
  }
}

// Extend Storage prototype
Storage.prototype.getObject = function <T>(key: string): T | null {
  const item = this.getItem(key);
  if (item === null) return null;
  try {
    return JSON.parse(item) as T;
  } catch {
    return null;
  }
};

Storage.prototype.setObject = function <T>(key: string, value: T): void {
  this.setItem(key, JSON.stringify(value));
};

// Module declarations
declare module '*.json' {
  const value: unknown;
  export default value;
}

declare module '*.png' {
  const value: string;
  export default value;
}

declare module '*.jpg' {
  const value: string;
  export default value;
}

declare module '*.svg' {
  const value: string;
  export default value;
}

declare module '*.wav' {
  const value: string;
  export default value;
}

declare module '*.mp3' {
  const value: string;
  export default value;
}

// Export all types
export type {
  CS2DGlobal,
  CS2DConfig,
  CS2DAPI,
  PerformanceMonitor,
  PerformanceMetrics,
  ServerInfo,
  Connection,
  ConnectionStatus,
  NetworkMessage,
  Room,
  RoomStatus,
  RoomConfig,
  PlayerInfo,
  PlayerStats,
  GameSettings,
  GraphicsSettings,
  AudioSettings,
  ControlSettings,
  KeyBindings,
  GameplaySettings,
  ViewmodelSettings,
};

// Re-export from game types
export type { EventEmitter, GameEvent, MapData, EventHandler } from './game';
