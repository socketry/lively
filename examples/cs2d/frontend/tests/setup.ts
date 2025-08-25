import '@testing-library/jest-dom';
import { cleanup } from '@testing-library/react';
import { afterEach, beforeEach, vi } from 'vitest';

// Cleanup after each test
afterEach(() => {
  cleanup();
  // Clear localStorage after each test to prevent test pollution
  localStorage.clear();
  sessionStorage.clear();
});

// Setup before each test
beforeEach(() => {
  // Reset any environment-specific mocks
  vi.clearAllMocks();
});

// Mock window.matchMedia for responsive design tests
Object.defineProperty(window, 'matchMedia', {
  writable: true,
  value: vi.fn().mockImplementation(query => ({
    matches: false,
    media: query,
    onchange: null,
    addListener: vi.fn(),
    removeListener: vi.fn(),
    addEventListener: vi.fn(),
    removeEventListener: vi.fn(),
    dispatchEvent: vi.fn(),
  })),
});

// Mock IntersectionObserver
global.IntersectionObserver = vi.fn().mockImplementation(() => ({
  observe: vi.fn(),
  unobserve: vi.fn(),
  disconnect: vi.fn(),
}));

// Mock ResizeObserver
global.ResizeObserver = vi.fn().mockImplementation(() => ({
  observe: vi.fn(),
  unobserve: vi.fn(),
  disconnect: vi.fn(),
}));

// Mock requestFullscreen and exitFullscreen for the AppProvider
Object.defineProperty(document.documentElement, 'requestFullscreen', {
  writable: true,
  value: vi.fn().mockResolvedValue(undefined),
});

Object.defineProperty(document, 'exitFullscreen', {
  writable: true,
  value: vi.fn().mockResolvedValue(undefined),
});

Object.defineProperty(document, 'fullscreenElement', {
  writable: true,
  value: null,
});

// Mock navigator.onLine for AppProvider's online/offline detection
Object.defineProperty(navigator, 'onLine', {
  writable: true,
  value: true,
});

// Provide a minimal window.location mock
Object.defineProperty(window, 'location', {
  writable: true,
  value: {
    href: 'http://localhost:3000/',
    origin: 'http://localhost:3000',
    protocol: 'http:',
    hostname: 'localhost',
    port: '3000',
    pathname: '/',
    search: '',
    hash: '',
    assign: vi.fn(),
    replace: vi.fn(),
    reload: vi.fn(),
  },
});

// Mock console.error to reduce noise in tests (real providers may log errors)
const originalConsoleError = console.error;
console.error = vi.fn((message, ...args) => {
  // Only suppress expected errors from our real providers in test environment
  if (typeof message === 'string') {
    if (
      message.includes('Failed to load') ||
      message.includes('WebSocket') ||
      message.includes('localStorage') ||
      message.includes('sessionStorage')
    ) {
      return; // Suppress these expected errors in tests
    }
  }
  originalConsoleError(message, ...args);
});

// Setup import.meta.env for Vite
Object.defineProperty(import.meta, 'env', {
  value: {
    DEV: true,
    PROD: false,
    MODE: 'test',
    VITE_API_URL: 'http://localhost:3000/api',
    VITE_WS_URL: 'ws://localhost:3000/ws',
  },
});