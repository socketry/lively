import { test as base, type Page } from '@playwright/test';
import { GameHelpers } from '../helpers/game-helpers';
import { LobbyHelpers } from '../helpers/lobby-helpers';

/**
 * Custom test fixtures for CS2D game testing
 */

export type GameFixtures = {
  gameHelpers: GameHelpers;
  lobbyHelpers: LobbyHelpers;
  authenticatedPage: Page;
  gameRoom: { roomId: string; playerId: string };
};

export const test = base.extend<GameFixtures>({
  // Game helpers fixture
  gameHelpers: async ({ page }, use) => {
    const helpers = new GameHelpers(page);
    await use(helpers);
  },

  // Lobby helpers fixture
  lobbyHelpers: async ({ page }, use) => {
    const helpers = new LobbyHelpers(page);
    await use(helpers);
  },

  // Authenticated page fixture (auto-login)
  authenticatedPage: async ({ page }, use) => {
    // Navigate to app
    await page.goto('/');
    await page.waitForSelector('[data-testid="app-container"]');
    
    // Check if login required
    const loginForm = page.locator('[data-testid="login-form"]');
    
    if (await loginForm.isVisible()) {
      // Auto-login with test credentials
      const usernameInput = page.locator('input[name="username"]');
      const passwordInput = page.locator('input[name="password"]');
      
      await usernameInput.fill(process.env.TEST_USERNAME || 'testplayer');
      await passwordInput.fill(process.env.TEST_PASSWORD || 'testpass123');
      
      const loginBtn = page.locator('button[type="submit"]');
      await loginBtn.click();
      
      // Wait for login to complete
      await page.waitForSelector('[data-testid="lobby-container"]', { timeout: 10000 });
    }
    
    // Set player name if needed
    const playerName = process.env.TEST_PLAYER_NAME || `Player_${Date.now()}`;
    await page.evaluate((name) => {
      localStorage.setItem('playerName', name);
    }, playerName);
    
    await use(page);
    
    // Cleanup: logout if needed
    const logoutBtn = page.locator('button').filter({ hasText: /Logout/i });
    if (await logoutBtn.isVisible()) {
      await logoutBtn.click();
    }
  },

  // Game room fixture (auto-creates and joins a room)
  gameRoom: async ({ page, lobbyHelpers }, use) => {
    // Navigate to lobby
    await lobbyHelpers.goToLobby();
    
    // Create a test room
    const roomId = await lobbyHelpers.createRoom({
      name: `Test Room ${Date.now()}`,
      gameMode: 'deathmatch',
      maxPlayers: 8,
      map: 'de_dust2'
    });
    
    // Get player ID
    const playerId = await page.evaluate(() => {
      return localStorage.getItem('playerId') || '';
    });
    
    await use({ roomId, playerId });
    
    // Cleanup: leave room
    const inRoom = page.url().includes('/room/');
    if (inRoom) {
      await lobbyHelpers.leaveRoom();
    }
  }
});

export { expect } from '@playwright/test';

/**
 * Helper function to create multiple player instances for multiplayer testing
 */
export async function createMultiplePlayers(
  browser: any,
  count: number
): Promise<{ pages: Page[]; helpers: GameHelpers[] }> {
  const pages: Page[] = [];
  const helpers: GameHelpers[] = [];
  
  for (let i = 0; i < count; i++) {
    const context = await browser.newContext({
      viewport: { width: 1920, height: 1080 },
      storageState: undefined // Each player gets fresh state
    });
    
    const page = await context.newPage();
    pages.push(page);
    
    // Set unique player name
    await page.evaluate((index) => {
      localStorage.setItem('playerName', `Player_${index + 1}`);
    }, i);
    
    const helper = new GameHelpers(page);
    helpers.push(helper);
  }
  
  return { pages, helpers };
}

/**
 * Helper to simulate network conditions
 */
export async function simulateNetworkConditions(
  page: Page,
  condition: 'slow-3g' | 'fast-3g' | '4g' | 'offline' | 'online'
) {
  const conditions = {
    'slow-3g': { downloadThroughput: 50 * 1024, uploadThroughput: 50 * 1024, latency: 2000 },
    'fast-3g': { downloadThroughput: 180 * 1024, uploadThroughput: 84 * 1024, latency: 562 },
    '4g': { downloadThroughput: 4 * 1024 * 1024, uploadThroughput: 3 * 1024 * 1024, latency: 50 },
    'offline': { offline: true },
    'online': { offline: false }
  };
  
  const config = conditions[condition];
  
  if ('offline' in config) {
    await page.context().setOffline(config.offline);
  } else {
    // Note: This requires CDP (Chrome DevTools Protocol)
    const client = await page.context().newCDPSession(page);
    await client.send('Network.emulateNetworkConditions', {
      offline: false,
      downloadThroughput: config.downloadThroughput,
      uploadThroughput: config.uploadThroughput,
      latency: config.latency
    });
  }
}

/**
 * Helper to record game session for debugging
 */
export async function recordGameSession(
  page: Page,
  testName: string
): Promise<{ stop: () => Promise<void> }> {
  const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
  const videoPath = `tests/e2e/recordings/${testName}-${timestamp}.webm`;
  
  await page.video()?.saveAs(videoPath);
  
  return {
    stop: async () => {
      await page.video()?.delete();
    }
  };
}

/**
 * Helper to measure performance metrics
 */
export async function measurePerformance(page: Page): Promise<{
  fps: number;
  memoryUsage: number;
  cpuUsage: number;
  networkLatency: number;
}> {
  const metrics = await page.evaluate(() => {
    return new Promise<any>((resolve) => {
      // Measure FPS
      let fps = 0;
      const lastTime = performance.now();
      let frameCount = 0;
      
      const measureFPS = () => {
        frameCount++;
        const currentTime = performance.now();
        
        if (currentTime - lastTime >= 1000) {
          fps = frameCount;
          
          // Get memory usage if available
          const memory = (performance as any).memory;
          const memoryUsage = memory ? memory.usedJSHeapSize / 1048576 : 0;
          
          // Estimate CPU usage (simplified)
          const cpuUsage = 100 - (fps / 60) * 100;
          
          // Get network latency from WebSocket if available
          const wsLatency = (window as any).__wsLatency || 0;
          
          resolve({
            fps,
            memoryUsage,
            cpuUsage: Math.max(0, cpuUsage),
            networkLatency: wsLatency
          });
        } else if (frameCount < 100) {
          requestAnimationFrame(measureFPS);
        } else {
          // Timeout fallback
          resolve({
            fps: frameCount,
            memoryUsage: 0,
            cpuUsage: 0,
            networkLatency: 0
          });
        }
      };
      
      requestAnimationFrame(measureFPS);
    });
  });
  
  return metrics;
}

/**
 * Helper to wait for game state
 */
export async function waitForGameState(
  page: Page,
  state: 'loading' | 'ready' | 'playing' | 'paused' | 'ended',
  timeout: number = 30000
): Promise<boolean> {
  const startTime = Date.now();
  
  while (Date.now() - startTime < timeout) {
    const currentState = await page.evaluate(() => {
      return (window as any).__gameState || 'unknown';
    });
    
    if (currentState === state) {
      return true;
    }
    
    await page.waitForTimeout(500);
  }
  
  return false;
}

/**
 * Helper to inject test data
 */
export async function injectTestData(page: Page, data: any) {
  await page.evaluate((testData) => {
    (window as any).__testData = testData;
    
    // Dispatch custom event
    window.dispatchEvent(new CustomEvent('test-data-injected', {
      detail: testData
    }));
  }, data);
}

/**
 * Helper to capture game state snapshot
 */
export async function captureGameState(page: Page): Promise<any> {
  return await page.evaluate(() => {
    const gameState = (window as any).__gameState || {};
    const players = (window as any).__players || [];
    const map = (window as any).__currentMap || '';
    const score = (window as any).__score || {};
    
    return {
      state: gameState,
      players,
      map,
      score,
      timestamp: Date.now()
    };
  });
}

/**
 * Helper to simulate player actions
 */
export async function simulatePlayerActions(
  gameHelper: GameHelpers,
  actions: Array<{
    type: 'move' | 'shoot' | 'reload' | 'switch-weapon' | 'chat';
    data?: any;
    delay?: number;
  }>
) {
  for (const action of actions) {
    switch (action.type) {
      case 'move':
        await gameHelper.movePlayer(action.data.direction, action.data.duration);
        break;
      case 'shoot':
        await gameHelper.shootAt(action.data.x, action.data.y);
        break;
      case 'reload':
        await gameHelper.reloadWeapon();
        break;
      case 'switch-weapon':
        await gameHelper.switchWeapon(action.data.slot);
        break;
      case 'chat':
        await gameHelper.sendChatMessage(action.data.message);
        break;
    }
    
    if (action.delay) {
      await gameHelper['page'].waitForTimeout(action.delay);
    }
  }
}