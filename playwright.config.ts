import { defineConfig } from '@playwright/test';

export default defineConfig({
  // Restrict to our E2E tests only; avoid picking frontend unit tests
  testDir: 'tests/e2e',
  testMatch: /.*\.spec\.ts$/,
  timeout: 30_000,
  retries: 0,
  reporter: [['list']],
  use: {
    baseURL: 'http://localhost:9293',
    trace: 'on-first-retry',
    actionTimeout: 10_000,
    navigationTimeout: 15_000,
    viewport: { width: 1280, height: 800 },
  },
  webServer: [
    {
      command: 'ruby examples/cs2d/src/servers/static_server.rb 9293',
      url: 'http://localhost:9293/health',
      reuseExistingServer: true,
      stdout: 'pipe',
      stderr: 'pipe',
      timeout: 20_000,
    },
  ],
  projects: [
    { name: 'chromium', use: { browserName: 'chromium' } },
  ],
});
