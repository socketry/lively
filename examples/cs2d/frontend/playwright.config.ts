import { defineConfig, devices } from '@playwright/test'

/**
 * Read environment variables from file.
 * https://github.com/motdotla/dotenv
 */
// require('dotenv').config();

/**
 * See https://playwright.dev/docs/test-configuration.
 */
const startBackends = process.env.START_BACKENDS !== '0'
const skipWebServer = process.env.SKIP_WEB_SERVER === '1'

export default defineConfig({
  testDir: './tests/e2e',
  fullyParallel: true,
  forbidOnly: !!process.env.CI,
  retries: process.env.CI ? 2 : 0,
  workers: process.env.CI ? 1 : undefined,
  reporter: [
    ['html'],
    ['json', { outputFile: 'test-results/results.json' }],
    ['junit', { outputFile: 'test-results/junit.xml' }]
  ],
  use: {
    baseURL: process.env.BASE_URL || 'http://localhost:5174',
    trace: 'on-first-retry',
    screenshot: 'only-on-failure',
    video: 'retain-on-failure',
    actionTimeout: 10000,
    navigationTimeout: 30000
  },

  /* Configure projects for major browsers */
  projects: [
    {
      name: 'chromium',
      use: { ...devices['Desktop Chrome'] }
    },

    {
      name: 'firefox',
      use: { ...devices['Desktop Firefox'] }
    },

    {
      name: 'webkit',
      use: { ...devices['Desktop Safari'] }
    },

    /* Test against mobile viewports. */
    {
      name: 'Mobile Chrome',
      use: { ...devices['Pixel 5'] }
    },
    {
      name: 'Mobile Safari',
      use: { ...devices['iPhone 12'] }
    },

    /* Test against branded browsers. */
    {
      name: 'Microsoft Edge',
      use: { ...devices['Desktop Edge'], channel: 'msedge' }
    },
    {
      name: 'Google Chrome',
      use: { ...devices['Desktop Chrome'], channel: 'chrome' }
    }
  ],

  /* Run local servers before starting the tests (SPA + API + WS) */
  webServer: skipWebServer ? [] : [
    {
      command: 'npm run dev -- --port=5174',
      url: 'http://localhost:5174',
      reuseExistingServer: !process.env.CI,
      timeout: 120 * 1000,
      stdout: 'pipe',
      stderr: 'pipe',
    },
    // Optionally start API + WS backends; skip in local CI where Ruby gems may be missing
    ...(
      startBackends
        ? [
            {
              command: 'ruby ../src/servers/api_bridge_server.rb 9294',
              url: 'http://localhost:9294/api/rooms',
              reuseExistingServer: true,
              timeout: 60 * 1000,
              stdout: 'pipe',
              stderr: 'pipe',
            },
            {
              command: 'ruby ../src/servers/start_server.rb',
              url: 'http://localhost:9292/',
              reuseExistingServer: true,
              timeout: 60 * 1000,
              stdout: 'pipe',
              stderr: 'pipe',
            },
          ]
        : []
    )
  ]
})
