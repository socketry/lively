// Vitest test setup file
import { beforeAll, afterEach, afterAll } from 'vitest';

// Add any global test setup here
beforeAll(() => {
  // Setup code that runs once before all tests
});

afterEach(() => {
  // Cleanup after each test
});

afterAll(() => {
  // Cleanup after all tests
});

// Mock global objects if needed
global.ResizeObserver = class ResizeObserver {
  observe(): void {
    // Mock implementation
  }
  unobserve(): void {
    // Mock implementation
  }
  disconnect(): void {
    // Mock implementation
  }
};
