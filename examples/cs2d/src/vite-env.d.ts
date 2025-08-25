/// <reference types="vite/client" />

interface ImportMetaEnv {
  readonly VITE_API_URL: string;
  readonly VITE_WS_URL: string;
}

interface ImportMeta {
  readonly env: ImportMetaEnv;
}

// Game-specific interfaces
interface GameState {
  bombPlanted?: boolean;
  round?: unknown;
  [key: string]: unknown;
}

interface GamePlayer {
  x?: number;
  y?: number;
  moveTo?: (x: number, y: number) => void;
  [key: string]: unknown;
}

interface GameInstance {
  gameState?: GameState;
  player?: GamePlayer;
  checkCollision?: unknown;
  collisionSystem?: unknown;
  bombPlanted?: boolean;
  roundState?: unknown;
  [key: string]: unknown;
}

// Extended Window interface for game-specific properties
interface ExtendedWindow extends Window {
  game?: GameInstance;
  gameState?: GameState;
  __gameAPI?: {
    (): unknown;
    killPlayer?: () => void;
  };
  __spectatorErrors?: unknown[];
  __collisionErrors?: unknown[];
  ReactDOM?: unknown;
  React?: unknown;
  ws?: unknown;
  socket?: unknown;
  gameSocket?: unknown;
  checkCollision?: unknown;
  CollisionSystem?: unknown;
  gc?: () => void;
  CS2D?: unknown;
  gameManager?: unknown;
}

// Extended Performance interface
interface ExtendedPerformance extends Performance {
  memory?: {
    usedJSHeapSize: number;
    totalJSHeapSize: number;
    jsHeapSizeLimit: number;
  };
}

declare global {
  interface Window extends ExtendedWindow {}
  interface Performance extends ExtendedPerformance {}
}
