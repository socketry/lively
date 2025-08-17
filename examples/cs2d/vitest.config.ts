import { defineConfig } from 'vitest/config';
import path from 'path';

export default defineConfig({
  test: {
    globals: true,
    environment: 'node',
    include: [
      'src/**/*.{test,spec}.{js,mjs,cjs,ts,mts,cts,jsx,tsx}',
      'tests/**/*.{test,spec}.{js,mjs,cjs,ts,mts,cts,jsx,tsx}'
    ],
    exclude: [
      'node_modules',
      'dist',
      '.idea',
      '.git',
      '.cache',
      // Exclude all frontend tests - they should be run from the frontend directory
      'frontend/**',
      'frontend/**/*',
      // Exclude e2e tests - they should be run with Playwright
      'tests/e2e/**',
      'tests/e2e/**/*',
      '**/playwright.config.ts'
    ],
    coverage: {
      provider: 'v8',
      reporter: ['text', 'json', 'html'],
      exclude: [
        'node_modules/',
        'tests/',
        'frontend/',
        '*.config.ts',
        '**/*.d.ts',
        '**/*.test.ts',
        '**/*.spec.ts',
        '**/mockData',
        '**/test-utils'
      ]
    }
  },
  resolve: {
    alias: {
      '@': path.resolve(__dirname, './src'),
      '@frontend': path.resolve(__dirname, './frontend'),
      '@lib': path.resolve(__dirname, './lib'),
      '@spec': path.resolve(__dirname, './spec'),
      '@types': path.resolve(__dirname, './src/types'),
    },
  },
});