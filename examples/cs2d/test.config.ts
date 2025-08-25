import { defineConfig } from 'vitest/config';
import path from 'path';

// Test configuration for comprehensive CS2D testing
export default defineConfig({
  test: {
    globals: true,
    environment: 'jsdom',
    setupFiles: ['./tests/setup.ts'],
    include: [
      'tests/**/*.{test,spec}.{js,mjs,cjs,ts,mts,cts,jsx,tsx}',
      'src/**/*.{test,spec}.{js,mjs,cjs,ts,mts,cts,jsx,tsx}',
    ],
    exclude: [
      'node_modules',
      'dist',
      '.idea',
      '.git',
      '.cache',
      'tests/e2e/**', // E2E tests run separately with Playwright
    ],
    coverage: {
      provider: 'v8',
      reporter: ['text', 'json', 'html', 'lcov'],
      reportsDirectory: './coverage',
      exclude: [
        'node_modules/',
        'tests/',
        'coverage/',
        'dist/',
        '*.config.ts',
        '**/*.d.ts',
        '**/*.test.ts',
        '**/*.spec.ts',
        'src/main.tsx',
        'src/vite-env.d.ts',
        '**/mockData/',
        '**/test-utils/',
      ],
      thresholds: {
        global: {
          branches: 80,
          functions: 80,
          lines: 80,
          statements: 80,
        },
        // Critical game systems require higher coverage
        'src/game/GameCore.ts': {
          branches: 90,
          functions: 90,
          lines: 90,
          statements: 90,
        },
        'src/game/systems/': {
          branches: 85,
          functions: 85,
          lines: 85,
          statements: 85,
        },
        'src/game/physics/': {
          branches: 85,
          functions: 85,
          lines: 85,
          statements: 85,
        },
      },
    },
    // Test categorization
    testTimeout: 10000, // 10 seconds for most tests
    hookTimeout: 30000, // 30 seconds for setup/teardown
    pool: 'threads',
    poolOptions: {
      threads: {
        singleThread: false,
        maxThreads: 4,
        minThreads: 2,
      },
    },
    // Performance testing configuration
    benchmark: {
      include: ['tests/performance/**/*.bench.{js,mjs,cjs,ts,mts,cts,jsx,tsx}'],
      reporters: ['default', 'json'],
      outputFile: './test-results/benchmark-results.json',
    },
    // Test reporter configuration
    reporters: [
      'default',
      'json',
      'html',
      ['junit', { outputFile: './test-results/junit.xml' }],
    ],
    outputFile: {
      json: './test-results/test-results.json',
      html: './test-results/test-report.html',
    },
  },
  resolve: {
    alias: {
      '@': path.resolve(__dirname, './src'),
      '@components': path.resolve(__dirname, './src/components'),
      '@game': path.resolve(__dirname, './src/game'),
      '@utils': path.resolve(__dirname, './src/utils'),
      '@types': path.resolve(__dirname, './src/types'),
      '@tests': path.resolve(__dirname, './tests'),
    },
  },
});

// Custom test configurations for different test types
export const unitTestConfig = defineConfig({
  ...defineConfig().test,
  include: ['tests/unit/**/*.{test,spec}.{ts,tsx}'],
  testTimeout: 5000,
});

export const integrationTestConfig = defineConfig({
  ...defineConfig().test,
  include: ['tests/integration/**/*.{test,spec}.{ts,tsx}'],
  testTimeout: 15000,
});

export const performanceTestConfig = defineConfig({
  ...defineConfig().test,
  include: ['tests/performance/**/*.{test,spec}.{ts,tsx}'],
  testTimeout: 30000,
  maxConcurrency: 1, // Performance tests should run sequentially
});

export const securityTestConfig = defineConfig({
  ...defineConfig().test,
  include: ['tests/security/**/*.{test,spec}.{ts,tsx}'],
  testTimeout: 10000,
});

export const multiplayerTestConfig = defineConfig({
  ...defineConfig().test,
  include: ['tests/multiplayer/**/*.{test,spec}.{ts,tsx}'],
  testTimeout: 20000,
  setupFiles: ['./tests/multiplayer/setup.ts'],
});

// Test environment setup for different scenarios
export const testEnvironments = {
  // Development environment - faster, less comprehensive
  development: {
    coverage: {
      enabled: false,
    },
    testTimeout: 5000,
    include: ['tests/unit/**/*.{test,spec}.{ts,tsx}'],
  },
  
  // CI environment - comprehensive testing
  ci: {
    coverage: {
      enabled: true,
      thresholds: {
        global: {
          branches: 90,
          functions: 90,
          lines: 90,
          statements: 90,
        },
      },
    },
    testTimeout: 15000,
    pool: 'threads',
    poolOptions: {
      threads: {
        maxThreads: 2, // Limited resources in CI
      },
    },
  },
  
  // Production validation - critical tests only
  production: {
    include: [
      'tests/unit/game/GameCore.test.ts',
      'tests/unit/game/systems/*.test.ts',
      'tests/integration/GameCoreIntegration.test.ts',
      'tests/security/**/*.test.ts',
    ],
    testTimeout: 20000,
  },
};

// Game-specific test configurations
export const gameTestConfig = {
  // FPS targets for performance tests
  performance: {
    targetFPS: {
      minimum: 60,
      target: 144,
      maximum: 240,
    },
    memoryLimits: {
      initial: 128 * 1024 * 1024, // 128 MB
      maximum: 512 * 1024 * 1024, // 512 MB
      warning: 256 * 1024 * 1024,  // 256 MB
    },
    networkLimits: {
      latency: {
        good: 50,
        acceptable: 100,
        poor: 200,
      },
      packetLoss: {
        good: 0.01, // 1%
        acceptable: 0.05, // 5%
        poor: 0.1, // 10%
      },
    },
  },
  
  // Game balance testing
  balance: {
    weapons: {
      ak47: { damage: 36, headShotMultiplier: 4.0, armorPenetration: 77.5 },
      m4a1: { damage: 33, headShotMultiplier: 4.0, armorPenetration: 70.0 },
      awp: { damage: 115, headShotMultiplier: 4.0, armorPenetration: 99.0 },
    },
    economy: {
      startMoney: 800,
      killReward: 300,
      roundWinBonus: 3250,
      maxMoney: 16000,
    },
    rounds: {
      maxRounds: 30,
      roundTime: 115, // seconds
      freezeTime: 3, // seconds
      bombTimer: 35, // seconds
    },
  },
  
  // Browser compatibility matrix
  browsers: {
    supported: ['chromium', 'firefox', 'webkit'],
    features: {
      webgl: { required: true },
      websocket: { required: true },
      webAudio: { required: true },
      localStorage: { required: true },
      es6: { required: true },
    },
  },
  
  // Accessibility requirements
  accessibility: {
    colorContrast: {
      normal: 4.5, // AA standard
      large: 3.0,  // AA standard for large text
    },
    keyboardNavigation: true,
    screenReader: true,
    reducedMotion: true,
    highContrast: true,
  },
};

// Mock configurations for testing
export const mockConfigs = {
  canvas: {
    width: 800,
    height: 600,
    getContext: () => ({
      fillRect: () => {},
      clearRect: () => {},
      drawImage: () => {},
      save: () => {},
      restore: () => {},
      setTransform: () => {},
      beginPath: () => {},
      closePath: () => {},
      moveTo: () => {},
      lineTo: () => {},
      fill: () => {},
      stroke: () => {},
      fillText: () => {},
      strokeText: () => {},
    }),
  },
  
  websocket: {
    url: 'ws://localhost:8080',
    protocols: [],
    readyState: 1, // WebSocket.OPEN
    send: () => {},
    close: () => {},
    addEventListener: () => {},
    removeEventListener: () => {},
  },
  
  audioContext: {
    createOscillator: () => ({
      connect: () => {},
      start: () => {},
      stop: () => {},
    }),
    createGain: () => ({
      connect: () => {},
      gain: { value: 1 },
    }),
    destination: {},
    currentTime: 0,
  },
};

export default defineConfig();