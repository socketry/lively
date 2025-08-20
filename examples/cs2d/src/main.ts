/**
 * Main entry point for CS2D TypeScript application
 */

import { GameManager } from './example/game-manager';
import type { CS2DGlobal } from './types/global';

// Initialize CS2D global namespace
const initializeCS2D = (): CS2DGlobal => {
  const cs2d: CS2DGlobal = {
    version: '0.2.0',
    buildDate: new Date().toISOString(),
    environment: process.env['NODE_ENV'] === 'production' ? 'production' : 'development',
    config: {
      apiUrl:
        import.meta.env.VITE_API_URL.length > 0
          ? import.meta.env.VITE_API_URL
          : 'http://localhost:9294/api',
      wsUrl:
        import.meta.env.VITE_WS_URL.length > 0
          ? import.meta.env.VITE_WS_URL
          : 'ws://localhost:9292',
      assetsPath: '/cstrike',
      maxReconnectAttempts: 5,
      reconnectDelay: 1000,
    },
    api: createAPI(),
    events: createEventEmitter(),
    performance: createPerformanceMonitor(),
  };

  return cs2d;
};

// Create API implementation
const createAPI = (): CS2DGlobal['api'] => {
  return {
    async getMaps() {
      const response = await fetch('/api/maps');
      if (!response.ok) throw new Error('Failed to fetch maps');
      return response.json() as Promise<readonly MapData[]>;
    },

    async getMap(id: string) {
      const response = await fetch(`/api/maps/${id}`);
      if (!response.ok) throw new Error('Failed to fetch map');
      return response.json() as Promise<MapData>;
    },

    async saveMap(map: MapData) {
      const response = await fetch('/api/maps', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(map),
      });
      if (!response.ok) throw new Error('Failed to save map');
      return response.json() as Promise<{ success: boolean; id: string }>;
    },

    async deleteMap(id: string) {
      const response = await fetch(`/api/maps/${id}`, {
        method: 'DELETE',
      });
      if (!response.ok) throw new Error('Failed to delete map');
      return response.json() as Promise<{ success: boolean }>;
    },

    async getServers() {
      const response = await fetch('/api/servers');
      if (!response.ok) throw new Error('Failed to fetch servers');
      return response.json() as Promise<readonly ServerInfo[]>;
    },

    connectToServer(serverId: string) {
      // WebSocket connection implementation
      return Promise.resolve(createConnection(serverId));
    },

    async createRoom(config: RoomConfig) {
      const response = await fetch('/api/rooms', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(config),
      });
      if (!response.ok) throw new Error('Failed to create room');
      return response.json() as Promise<Room>;
    },

    async joinRoom(roomId: string) {
      const response = await fetch(`/api/rooms/${roomId}/join`, {
        method: 'POST',
      });
      if (!response.ok) throw new Error('Failed to join room');
      return response.json() as Promise<Room>;
    },

    async leaveRoom() {
      const response = await fetch('/api/rooms/leave', {
        method: 'POST',
      });
      if (!response.ok) throw new Error('Failed to leave room');
    },

    async getPlayerStats(playerId: string) {
      const response = await fetch(`/api/players/${playerId}/stats`);
      if (!response.ok) throw new Error('Failed to fetch player stats');
      return response.json() as Promise<PlayerStats>;
    },

    async updateSettings(settings: GameSettings) {
      const response = await fetch('/api/settings', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(settings),
      });
      if (!response.ok) throw new Error('Failed to update settings');
    },
  };
};

// Create WebSocket connection
const createConnection = (serverId: string): Connection => {
  const wsUrl =
    import.meta.env.VITE_WS_URL.length > 0 ? import.meta.env.VITE_WS_URL : 'ws://localhost:9292';
  const ws = new WebSocket(`${wsUrl}/servers/${serverId}`);
  const handlers = new Map<string, Set<(data: unknown) => void>>();

  let status: ConnectionStatus = 'connecting';
  const latency = 0;

  const connection: Connection = {
    id: crypto.randomUUID(),
    serverId,
    get status() {
      return status;
    },
    get latency() {
      return latency;
    },

    send(message: NetworkMessage) {
      if (ws.readyState === WebSocket.OPEN) {
        ws.send(JSON.stringify(message));
      }
    },

    disconnect() {
      status = 'disconnecting';
      ws.close();
    },

    on(event: string, handler: (data: unknown) => void) {
      if (!handlers.has(event)) {
        handlers.set(event, new Set());
      }
      handlers.get(event)?.add(handler);
    },

    off(event: string, handler: (data: unknown) => void) {
      handlers.get(event)?.delete(handler);
    },
  };

  ws.onopen = () => {
    status = 'connected';
    const openHandlers = handlers.get('open');
    if (openHandlers !== undefined) {
      openHandlers.forEach((handler) => handler({ type: 'open' }));
    }
  };

  ws.onclose = () => {
    status = 'disconnected';
    const closeHandlers = handlers.get('close');
    if (closeHandlers !== undefined) {
      closeHandlers.forEach((handler) => handler({ type: 'close' }));
    }
  };

  ws.onerror = (error) => {
    status = 'error';
    const errorHandlers = handlers.get('error');
    if (errorHandlers !== undefined) {
      errorHandlers.forEach((handler) => handler({ type: 'error', error }));
    }
  };

  ws.onmessage = (event) => {
    const data = JSON.parse(event.data as string) as NetworkMessage;
    const messageHandlers = handlers.get(data.type);
    if (messageHandlers !== undefined) {
      messageHandlers.forEach((handler) => handler(data));
    }
  };

  return connection;
};

// Create event emitter
const createEventEmitter = (): EventEmitter => {
  const events = new Map<string, Set<EventHandler<unknown>>>();

  return {
    on<T>(event: string, handler: EventHandler<T>) {
      if (!events.has(event)) {
        events.set(event, new Set());
      }
      events.get(event)?.add(handler as EventHandler<unknown>);
    },

    off<T>(event: string, handler: EventHandler<T>) {
      events.get(event)?.delete(handler as EventHandler<unknown>);
    },

    emit<T>(event: string, data: T) {
      const handlers = events.get(event);
      if (handlers !== undefined) {
        const gameEvent: GameEvent<T> = {
          type: event,
          timestamp: Date.now(),
          data,
        };
        handlers.forEach((handler) => handler(gameEvent));
      }
    },

    once<T>(event: string, handler: EventHandler<T>) {
      const onceHandler: EventHandler<T> = (evt: GameEvent<T>) => {
        handler(evt);
        this.off(event, onceHandler);
      };
      this.on(event, onceHandler);
    },
  };
};

// Create performance monitor
const createPerformanceMonitor = (): PerformanceMonitor => {
  let monitoring = false;
  let fps = 0;
  const ping = 0;
  let memoryUsage = 0;
  const drawCalls = 0;
  let lastTime = performance.now();
  let frameCount = 0;
  let animationId: number | null = null;

  const fpsHistory: number[] = [];
  const maxHistorySize = 60;

  const update = (): void => {
    if (!monitoring) return;

    const currentTime = performance.now();
    const deltaTime = currentTime - lastTime;
    frameCount++;

    if (deltaTime >= 1000) {
      fps = Math.round((frameCount * 1000) / deltaTime);
      fpsHistory.push(fps);
      if (fpsHistory.length > maxHistorySize) {
        fpsHistory.shift();
      }

      frameCount = 0;
      lastTime = currentTime;

      // Update memory usage if available
      if ('memory' in performance) {
        const perfMemory = (performance as unknown as { memory: { usedJSHeapSize: number } })
          .memory;
        memoryUsage = Math.round(perfMemory.usedJSHeapSize / 1048576); // Convert to MB
      }
    }

    animationId = requestAnimationFrame(update);
  };

  return {
    get fps() {
      return fps;
    },
    get ping() {
      return ping;
    },
    get memoryUsage() {
      return memoryUsage;
    },
    get drawCalls() {
      return drawCalls;
    },

    startMonitoring() {
      if (!monitoring) {
        monitoring = true;
        lastTime = performance.now();
        frameCount = 0;
        update();
      }
    },

    stopMonitoring() {
      monitoring = false;
      if (animationId !== null) {
        cancelAnimationFrame(animationId);
        animationId = null;
      }
    },

    getMetrics() {
      const avgFps =
        fpsHistory.length > 0
          ? Math.round(fpsHistory.reduce((a, b) => a + b, 0) / fpsHistory.length)
          : 0;
      const minFps = fpsHistory.length > 0 ? Math.min(...fpsHistory) : 0;
      const maxFps = fpsHistory.length > 0 ? Math.max(...fpsHistory) : 0;

      return {
        averageFps: avgFps,
        minFps,
        maxFps,
        frameTime: fps > 0 ? Math.round(1000 / fps) : 0,
        renderTime: 0,
        updateTime: 0,
        networkLatency: ping,
        packetLoss: 0,
      };
    },
  };
};

// Type imports for API methods
import type {
  MapData,
  ServerInfo,
  Connection,
  ConnectionStatus,
  NetworkMessage,
  EventHandler,
  Room,
  RoomConfig,
  PlayerStats,
  GameSettings,
  EventEmitter,
  GameEvent,
  PerformanceMonitor,
} from './types/global';

// Initialize application
const init = (): void => {
  // Initialize CS2D global
  window.CS2D = initializeCS2D();

  // Create game manager instance
  window.gameManager = new GameManager();

  // Start performance monitoring
  window.CS2D.performance.startMonitoring();

  // Log initialization
  console.warn(`CS2D v${window.CS2D.version} initialized`);
  console.warn(`Environment: ${window.CS2D.environment}`);
  console.warn(`Build Date: ${window.CS2D.buildDate}`);

  // Set up error handling
  window.addEventListener('error', (event) => {
    console.error('Global error:', event.error);
    window.CS2D.events.emit('error', event.error);
  });

  window.addEventListener('unhandledrejection', (event) => {
    console.error('Unhandled promise rejection:', event.reason);
    window.CS2D.events.emit('unhandledRejection', event.reason);
  });
};

// Initialize when DOM is ready
if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', init);
} else {
  init();
}

export { GameManager };
