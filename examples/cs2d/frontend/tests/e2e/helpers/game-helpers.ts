import { type Page, expect } from '@playwright/test';

/**
 * Game helper functions for Playwright tests
 */

export class GameHelpers {
  constructor(private page: Page) {}

  /**
   * Wait for the game to fully load
   */
  async waitForGameLoad() {
    // Wait for React app root
    await this.page.waitForSelector('#root', {
      state: 'visible',
      timeout: 15000
    });
    
    // Look for game container or canvas
    const gameContainer = this.page.locator('[data-testid="game-container"], .game-container, #game, canvas');
    if (await gameContainer.count() > 0) {
      await expect(gameContainer.first()).toBeVisible();
    }
    
    // Wait for canvas to be ready if present
    const canvas = this.page.locator('canvas');
    if (await canvas.count() > 0) {
      await expect(canvas.first()).toBeVisible();
      
      // Wait for WebGL/2D context to be initialized
      await this.page.waitForFunction(() => {
        const canvasEl = document.querySelector('canvas') as HTMLCanvasElement;
        return canvasEl && (canvasEl.getContext('webgl') || canvasEl.getContext('2d'));
      }).catch(() => {}); // Don't fail if no canvas context
    }
  }

  /**
   * Get current player health
   */
  async getPlayerHealth(): Promise<number> {
    const healthBar = this.page.locator('[data-testid="health-bar"]');
    const health = await healthBar.getAttribute('data-health');
    return parseInt(health || '0', 10);
  }

  /**
   * Get current ammo count
   */
  async getAmmoCount(): Promise<{ current: number; max: number }> {
    const ammoCounter = this.page.locator('[data-testid="ammo-counter"]');
    const ammoText = await ammoCounter.textContent();
    const match = ammoText?.match(/(\d+)\/(\d+)/);
    
    if (match) {
      return {
        current: parseInt(match[1], 10),
        max: parseInt(match[2], 10)
      };
    }
    
    return { current: 0, max: 0 };
  }

  /**
   * Move player in a direction
   */
  async movePlayer(direction: 'up' | 'down' | 'left' | 'right', duration: number = 100) {
    const keyMap = {
      up: 'w',
      down: 's',
      left: 'a',
      right: 'd'
    };
    
    await this.page.keyboard.down(keyMap[direction]);
    await this.page.waitForTimeout(duration);
    await this.page.keyboard.up(keyMap[direction]);
  }

  /**
   * Perform a sequence of movements
   */
  async performMovementSequence(sequence: Array<'up' | 'down' | 'left' | 'right'>) {
    for (const direction of sequence) {
      await this.movePlayer(direction);
      await this.page.waitForTimeout(50);
    }
  }

  /**
   * Shoot at specific coordinates
   */
  async shootAt(x: number, y: number) {
    await this.page.mouse.move(x, y);
    await this.page.mouse.down();
    await this.page.waitForTimeout(50);
    await this.page.mouse.up();
  }

  /**
   * Switch to a specific weapon
   */
  async switchWeapon(slot: number) {
    if (slot < 1 || slot > 5) {
      throw new Error('Weapon slot must be between 1 and 5');
    }
    await this.page.keyboard.press(slot.toString());
    await this.page.waitForTimeout(100);
  }

  /**
   * Reload current weapon
   */
  async reloadWeapon() {
    await this.page.keyboard.press('r');
    
    // Wait for reload animation
    const reloadIndicator = this.page.locator('[data-testid="reload-indicator"]');
    if (await reloadIndicator.count() > 0) {
      await expect(reloadIndicator).toBeVisible();
      await expect(reloadIndicator).not.toBeVisible({ timeout: 5000 });
    }
  }

  /**
   * Open in-game scoreboard
   */
  async openScoreboard() {
    await this.page.keyboard.down('Tab');
    const scoreboard = this.page.locator('[data-testid="scoreboard"]');
    await expect(scoreboard).toBeVisible();
  }

  /**
   * Close in-game scoreboard
   */
  async closeScoreboard() {
    await this.page.keyboard.up('Tab');
    const scoreboard = this.page.locator('[data-testid="scoreboard"]');
    await expect(scoreboard).not.toBeVisible();
  }

  /**
   * Get player score from scoreboard
   */
  async getPlayerScore(playerName: string): Promise<{ kills: number; deaths: number }> {
    await this.openScoreboard();
    
    const playerRow = this.page.locator(`[data-testid="player-row"][data-player="${playerName}"]`);
    const kills = await playerRow.locator('[data-testid="kills"]').textContent();
    const deaths = await playerRow.locator('[data-testid="deaths"]').textContent();
    
    await this.closeScoreboard();
    
    return {
      kills: parseInt(kills || '0', 10),
      deaths: parseInt(deaths || '0', 10)
    };
  }

  /**
   * Send chat message
   */
  async sendChatMessage(message: string) {
    // Open chat
    await this.page.keyboard.press('Enter');
    
    const chatInput = this.page.locator('input[data-testid="chat-input"]');
    await expect(chatInput).toBeVisible();
    await chatInput.fill(message);
    await chatInput.press('Enter');
    
    // Verify message sent
    const chatMessages = this.page.locator('[data-testid="chat-messages"]');
    await expect(chatMessages).toContainText(message);
  }

  /**
   * Open in-game menu
   */
  async openGameMenu() {
    await this.page.keyboard.press('Escape');
    const gameMenu = this.page.locator('[data-testid="game-menu"]');
    await expect(gameMenu).toBeVisible();
  }

  /**
   * Close in-game menu
   */
  async closeGameMenu() {
    await this.page.keyboard.press('Escape');
    const gameMenu = this.page.locator('[data-testid="game-menu"]');
    await expect(gameMenu).not.toBeVisible();
  }

  /**
   * Change game setting
   */
  async changeSetting(settingName: string, value: string | boolean | number) {
    await this.openGameMenu();
    
    const settingsBtn = this.page.locator('button').filter({ hasText: /Settings/i });
    await settingsBtn.click();
    
    const settingsModal = this.page.locator('[data-testid="settings-modal"]');
    await expect(settingsModal).toBeVisible();
    
    // Find and update setting
    const settingInput = this.page.locator(`[name="${settingName}"]`);
    
    if (typeof value === 'boolean') {
      const checkbox = settingInput.locator('input[type="checkbox"]');
      if (value) {
        await checkbox.check();
      } else {
        await checkbox.uncheck();
      }
    } else if (typeof value === 'number') {
      const range = settingInput.locator('input[type="range"]');
      await range.fill(value.toString());
    } else {
      await settingInput.fill(value);
    }
    
    // Save and close
    const saveBtn = this.page.locator('button').filter({ hasText: /Save|Apply/i });
    await saveBtn.click();
    
    await this.closeGameMenu();
  }

  /**
   * Get current FPS
   */
  async getCurrentFPS(): Promise<number> {
    return await this.page.evaluate(() => {
      return new Promise<number>((resolve) => {
        const lastTime = performance.now();
        let frames = 0;
        
        const measureFPS = () => {
          frames++;
          const currentTime = performance.now();
          
          if (currentTime - lastTime >= 1000) {
            resolve(frames);
          } else {
            requestAnimationFrame(measureFPS);
          }
        };
        
        requestAnimationFrame(measureFPS);
      });
    });
  }

  /**
   * Simulate lag spike
   */
  async simulateLag(duration: number = 1000) {
    await this.page.evaluate((ms) => {
      const start = Date.now();
      while (Date.now() - start < ms) {
        // Block thread
      }
    }, duration);
  }

  /**
   * Take game screenshot
   */
  async takeGameScreenshot(name: string) {
    const gameContainer = this.page.locator('[data-testid="game-container"]');
    await gameContainer.screenshot({ 
      path: `tests/e2e/screenshots/${name}.png`
    });
  }

  /**
   * Check if player is alive
   */
  async isPlayerAlive(): Promise<boolean> {
    const health = await this.getPlayerHealth();
    return health > 0;
  }

  /**
   * Wait for respawn
   */
  async waitForRespawn(timeout: number = 10000) {
    const respawnTimer = this.page.locator('[data-testid="respawn-timer"]');
    
    if (await respawnTimer.count() > 0) {
      await expect(respawnTimer).toBeVisible();
      await expect(respawnTimer).not.toBeVisible({ timeout });
    }
    
    // Verify player is alive after respawn
    const health = await this.getPlayerHealth();
    expect(health).toBeGreaterThan(0);
  }
}
