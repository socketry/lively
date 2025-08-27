import { beforeAll, afterAll, beforeEach, afterEach, vi } from 'vitest';
import { mockConfigs } from '../test.config';

// Global test setup for CS2D comprehensive testing

// Mock browser APIs
beforeAll(() => {
  // Mock Canvas API
  global.HTMLCanvasElement = class MockHTMLCanvasElement {
    width = mockConfigs.canvas.width;
    height = mockConfigs.canvas.height;
    
    getContext(contextType: string) {
      if (contextType === '2d' || contextType === 'webgl' || contextType === 'experimental-webgl') {
        return mockConfigs.canvas.getContext();
      }
      return null;
    }
    
    toDataURL() {
      return 'data:image/png;base64,mockdata';
    }
    
    addEventListener() {}
    removeEventListener() {}
  } as any;

  // Mock WebGL Context
  global.WebGLRenderingContext = class MockWebGLRenderingContext {
    canvas = new global.HTMLCanvasElement();
    getExtension() { return null; }
    getParameter() { return ''; }
    createShader() { return {}; }
    createProgram() { return {}; }
  } as any;

  // Mock Web Audio API
  global.AudioContext = class MockAudioContext {
    currentTime = 0;
    destination = {};
    
    createOscillator() {
      return mockConfigs.audioContext.createOscillator();
    }
    
    createGain() {
      return mockConfigs.audioContext.createGain();
    }
    
    decodeAudioData() {
      return Promise.resolve({});
    }
    
    resume() {
      return Promise.resolve();
    }
  } as any;

  global.webkitAudioContext = global.AudioContext;

  // Mock WebSocket
  global.WebSocket = class MockWebSocket {
    static CONNECTING = 0;
    static OPEN = 1;
    static CLOSING = 2;
    static CLOSED = 3;
    
    readyState = 1;
    url = '';
    protocol = '';
    
    constructor(url: string, protocols?: string | string[]) {
      this.url = url;
      setTimeout(() => {
        this.dispatchEvent(new Event('open'));
      }, 10);
    }
    
    send = vi.fn();
    close = vi.fn();
    addEventListener = vi.fn();
    removeEventListener = vi.fn();
    dispatchEvent = vi.fn();
  } as any;

  // Mock Performance API
  global.performance = {
    ...global.performance,
    now: vi.fn(() => Date.now()),
    mark: vi.fn(),
    measure: vi.fn(),
    getEntriesByType: vi.fn(() => []),
    memory: {
      usedJSHeapSize: 128 * 1024 * 1024,
      totalJSHeapSize: 256 * 1024 * 1024,
      jsHeapSizeLimit: 512 * 1024 * 1024,
    },
  };

  // Mock requestAnimationFrame
  global.requestAnimationFrame = vi.fn((callback) => {
    return setTimeout(() => callback(performance.now()), 16);
  });

  global.cancelAnimationFrame = vi.fn((id) => {
    clearTimeout(id);
  });

  // Mock Local Storage
  const localStorageMock = (() => {
    let store: Record<string, string> = {};
    return {
      getItem: (key: string) => store[key] || null,
      setItem: (key: string, value: string) => { store[key] = value.toString(); },
      removeItem: (key: string) => { delete store[key]; },
      clear: () => { store = {}; },
      get length() { return Object.keys(store).length; },
      key: (index: number) => Object.keys(store)[index] || null,
    };
  })();

  global.localStorage = localStorageMock;
  global.sessionStorage = localStorageMock;

  // Mock URL and URLSearchParams
  global.URL = class MockURL {
    href = '';
    origin = 'http://localhost:3000';
    pathname = '/';
    search = '';
    hash = '';
    
    constructor(url: string, base?: string) {
      this.href = url;
    }
  } as any;

  // Mock Fetch API
  global.fetch = vi.fn(() =>
    Promise.resolve({
      ok: true,
      status: 200,
      json: () => Promise.resolve({}),
      text: () => Promise.resolve(''),
      blob: () => Promise.resolve(new Blob()),
    })
  ) as any;

  // Mock ResizeObserver
  global.ResizeObserver = class MockResizeObserver {
    observe = vi.fn();
    unobserve = vi.fn();
    disconnect = vi.fn();
    
    constructor(callback: ResizeObserverCallback) {}
  } as any;

  // Mock IntersectionObserver
  global.IntersectionObserver = class MockIntersectionObserver {
    observe = vi.fn();
    unobserve = vi.fn();
    disconnect = vi.fn();
    
    constructor(callback: IntersectionObserverCallback, options?: IntersectionObserverInit) {}
  } as any;

  // Mock Gamepad API
  global.navigator = {
    ...global.navigator,
    getGamepads: vi.fn(() => []),
    userAgent: 'Mozilla/5.0 (Test Environment)',
    platform: 'Test',
    onLine: true,
    language: 'en-US',
    languages: ['en-US', 'en'],
  };

  // Mock Media Queries
  global.matchMedia = vi.fn((query) => ({
    matches: false,
    media: query,
    onchange: null,
    addListener: vi.fn(),
    removeListener: vi.fn(),
    addEventListener: vi.fn(),
    removeEventListener: vi.fn(),
    dispatchEvent: vi.fn(),
  }));
});

// Setup before each test
beforeEach(() => {
  // Reset all mocks
  vi.clearAllMocks();
  
  // Reset timers
  vi.useFakeTimers();
  
  // Reset DOM
  document.body.innerHTML = '';
  document.head.innerHTML = '';
  
  // Reset localStorage
  global.localStorage.clear();
  global.sessionStorage.clear();
  
  // Reset performance timing
  (performance.now as any).mockReturnValue(0);
});

// Cleanup after each test
afterEach(() => {
  // Restore real timers
  vi.useRealTimers();
  
  // Clear all intervals and timeouts
  vi.clearAllTimers();
  
  // Reset DOM
  document.body.innerHTML = '';
  document.head.innerHTML = '';
});

// Global cleanup
afterAll(() => {
  // Restore all mocks
  vi.restoreAllMocks();
});

// Test utilities
export const testUtils = {
  // Create mock canvas element
  createMockCanvas: (width = 800, height = 600) => {
    const canvas = document.createElement('canvas');
    canvas.width = width;
    canvas.height = height;
    return canvas;
  },

  // Create mock WebSocket
  createMockWebSocket: (url = 'ws://localhost:8080') => {
    return new global.WebSocket(url);
  },

  // Create mock audio context
  createMockAudioContext: () => {
    return new global.AudioContext();
  },

  // Create mock game state
  createMockGameState: () => ({
    roundNumber: 1,
    roundTime: 115,
    freezeTime: 3,
    bombPlanted: false,
    bombTimer: 35,
    ctScore: 0,
    tScore: 0,
    gameMode: 'competitive' as const,
    maxRounds: 30,
  }),

  // Create mock player
  createMockPlayer: (id = 'test-player') => ({
    id,
    name: 'Test Player',
    team: 'ct' as const,
    position: { x: 100, y: 100 },
    velocity: { x: 0, y: 0 },
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
    lastPosition: { x: 100, y: 100 },
    currentSurface: 'concrete' as const,
    lastDamageTime: 0,
    isInPain: false,
    orientation: 0,
    isBot: false,
    lastVoiceTime: 0,
  }),

  // Wait for condition with timeout
  waitFor: async (condition: () => boolean, timeout = 5000, interval = 50) => {
    const start = Date.now();
    while (!condition() && Date.now() - start < timeout) {
      await new Promise(resolve => setTimeout(resolve, interval));
    }
    if (!condition()) {
      throw new Error(`Condition not met within ${timeout}ms`);
    }
  },
};

// Export commonly used mocks
export const mocks = {
  canvas: mockConfigs.canvas,
  websocket: mockConfigs.websocket,
  audioContext: mockConfigs.audioContext,
};

console.log('✅ Test setup complete - CS2D comprehensive testing environment ready');
