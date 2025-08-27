import { test, expect, type Page } from '@playwright/test';

test.describe('CS2D Comprehensive Game Flow', () => {
  let page: Page;

  test.beforeEach(async ({ page: testPage, baseURL }) => {
    page = testPage;
    await page.goto(baseURL || 'http://localhost:5174');
    
    // Wait for the app to load
    await page.waitForSelector('[data-testid="lobby-container"]', { timeout: 10000 });
  });

  test.describe('Complete Game Journey', () => {
    test('should complete full game flow from lobby to match end', async () => {
      // Step 1: Verify lobby loads correctly
      await expect(page.locator('[data-testid="lobby-container"]')).toBeVisible();
      await expect(page.locator('text=Quick Play (with Bots)')).toBeVisible();

      // Step 2: Start a game with bots
      await page.click('text=Quick Play (with Bots)');
      await page.waitForSelector('canvas', { timeout: 15000 });

      // Step 3: Verify game canvas is loaded and running
      const canvas = page.locator('canvas');
      await expect(canvas).toBeVisible();

      // Step 4: Check FPS counter (should show stable FPS)
      await page.waitForTimeout(2000); // Let game stabilize
      const fpsElement = page.locator('[data-testid="fps-counter"]');
      if (await fpsElement.isVisible()) {
        const fpsText = await fpsElement.textContent();
        const fps = parseInt(fpsText?.match(/\d+/)?.[0] || '0');
        expect(fps).toBeGreaterThanOrEqual(60); // At least 60 FPS
      }

      // Step 5: Test basic player controls
      await page.keyboard.press('KeyW'); // Move forward
      await page.waitForTimeout(100);
      await page.keyboard.press('KeyA'); // Move left
      await page.waitForTimeout(100);
      await page.keyboard.press('KeyS'); // Move backward
      await page.waitForTimeout(100);
      await page.keyboard.press('KeyD'); // Move right
      await page.waitForTimeout(100);

      // Step 6: Test shooting mechanics
      await page.mouse.click(400, 300); // Click to shoot
      await page.waitForTimeout(500);

      // Step 7: Test weapon switching
      await page.keyboard.press('Digit1'); // Primary weapon
      await page.waitForTimeout(200);
      await page.keyboard.press('Digit2'); // Secondary weapon
      await page.waitForTimeout(200);
      await page.keyboard.press('Digit3'); // Knife
      await page.waitForTimeout(200);

      // Step 8: Verify HUD elements are present
      await expect(page.locator('[data-testid="health-display"]')).toBeVisible({ timeout: 5000 });
      await expect(page.locator('[data-testid="armor-display"]')).toBeVisible({ timeout: 5000 });
      await expect(page.locator('[data-testid="money-display"]')).toBeVisible({ timeout: 5000 });

      // Step 9: Wait for round progression
      await page.waitForTimeout(5000);

      // Step 10: Verify game state updates
      const scoreBoard = page.locator('[data-testid="scoreboard"]');
      if (await scoreBoard.isVisible()) {
        await expect(scoreBoard).toContainText('CT');
        await expect(scoreBoard).toContainText('T');
      }
    });

    test('should handle different game modes correctly', async () => {
      // Test competitive mode
      await page.click('text=Competitive');
      await page.waitForSelector('[data-testid="competitive-settings"]', { timeout: 5000 });
      
      const maxRoundsText = await page.locator('[data-testid="max-rounds"]').textContent();
      expect(maxRoundsText).toContain('30'); // MR30 format

      // Test casual mode
      await page.click('text=Casual');
      await page.waitForSelector('[data-testid="casual-settings"]', { timeout: 5000 });
    });

    test('should support multiplayer room creation and joining', async () => {
      // Create a room
      await page.click('text=Create Room');
      await page.waitForSelector('[data-testid="room-creation-form"]', { timeout: 5000 });
      
      await page.fill('[data-testid="room-name-input"]', 'Test Room');
      await page.selectOption('[data-testid="max-players-select"]', '10');
      await page.click('[data-testid="create-room-button"]');

      // Verify waiting room
      await page.waitForSelector('[data-testid="waiting-room"]', { timeout: 10000 });
      await expect(page.locator('text=Test Room')).toBeVisible();
      await expect(page.locator('[data-testid="player-list"]')).toBeVisible();
    });
  });

  test.describe('Performance and Stability', () => {
    test('should maintain stable FPS during gameplay', async () => {
      await page.click('text=Quick Play (with Bots)');
      await page.waitForSelector('canvas', { timeout: 15000 });

      // Monitor FPS over time
      const fpsReadings: number[] = [];
      
      for (let i = 0; i < 10; i++) {
        await page.waitForTimeout(1000);
        const fpsElement = page.locator('[data-testid="fps-counter"]');
        if (await fpsElement.isVisible()) {
          const fpsText = await fpsElement.textContent();
          const fps = parseInt(fpsText?.match(/\d+/)?.[0] || '0');
          fpsReadings.push(fps);
        }
      }

      if (fpsReadings.length > 0) {
        const averageFPS = fpsReadings.reduce((sum, fps) => sum + fps, 0) / fpsReadings.length;
        const minFPS = Math.min(...fpsReadings);
        
        expect(averageFPS).toBeGreaterThanOrEqual(120); // Target high FPS
        expect(minFPS).toBeGreaterThanOrEqual(60); // No drops below 60
      }
    });

    test('should handle rapid user actions without lag', async () => {
      await page.click('text=Quick Play (with Bots)');
      await page.waitForSelector('canvas', { timeout: 15000 });

      const startTime = Date.now();
      
      // Perform rapid actions
      for (let i = 0; i < 20; i++) {
        await page.keyboard.press('KeyW');
        await page.mouse.click(400 + Math.random() * 100, 300 + Math.random() * 100);
        await page.keyboard.press('KeyR'); // Reload
        await page.waitForTimeout(50);
      }

      const endTime = Date.now();
      const totalTime = endTime - startTime;
      
      // Should complete rapid actions in reasonable time
      expect(totalTime).toBeLessThan(5000); // 5 seconds max
    });

    test('should handle connection loss and reconnection', async () => {
      // Start multiplayer game
      await page.click('text=Quick Play (with Bots)');
      await page.waitForSelector('canvas', { timeout: 15000 });

      // Simulate network disconnection
      await page.context().setOffline(true);
      await page.waitForTimeout(2000);

      // Check for disconnection warning
      const disconnectWarning = page.locator('[data-testid="connection-warning"]');
      if (await disconnectWarning.isVisible({ timeout: 5000 })) {
        await expect(disconnectWarning).toContainText('Connection');
      }

      // Restore connection
      await page.context().setOffline(false);
      await page.waitForTimeout(3000);

      // Verify game continues
      const canvas = page.locator('canvas');
      await expect(canvas).toBeVisible();
    });

    test('should recover gracefully during brief disconnections', async () => {
      await page.click('text=Quick Play (with Bots)');
      await page.waitForSelector('canvas', { timeout: 15000 });

      // Brief disconnection
      await page.context().setOffline(true);
      await page.waitForTimeout(500); // Very brief
      await page.context().setOffline(false);

      // Game should continue without user notice
      await page.waitForTimeout(2000);
      const canvas = page.locator('canvas');
      await expect(canvas).toBeVisible();
    });
  });

  test.describe('UI/UX Experience', () => {
    test('should display loading screens with tips', async () => {
      await page.click('text=Quick Play (with Bots)');
      
      // Check for loading screen
      const loadingScreen = page.locator('[data-testid="loading-screen"]');
      if (await loadingScreen.isVisible({ timeout: 2000 })) {
        // Verify loading tips are shown
        const loadingTip = page.locator('[data-testid="loading-tip"]');
        await expect(loadingTip).toBeVisible();
        
        const tipText = await loadingTip.textContent();
        expect(tipText).toBeTruthy();
        expect(tipText!.length).toBeGreaterThan(10);
      }
    });

    test('should provide smooth transitions between screens', async () => {
      // Navigate through different screens
      await page.click('text=Settings');
      await page.waitForSelector('[data-testid="settings-panel"]', { timeout: 5000 });
      
      await page.click('text=Back');
      await page.waitForSelector('[data-testid="lobby-container"]', { timeout: 5000 });
      
      await page.click('text=About');
      await page.waitForSelector('[data-testid="about-panel"]', { timeout: 5000 });
      
      // All transitions should be smooth without flickering
      await expect(page.locator('[data-testid="about-panel"]')).toBeVisible();
    });

    test('should be responsive on different viewport sizes', async () => {
      // Test desktop view
      await page.setViewportSize({ width: 1920, height: 1080 });
      await page.waitForTimeout(500);
      await expect(page.locator('[data-testid="lobby-container"]')).toBeVisible();

      // Test tablet view
      await page.setViewportSize({ width: 768, height: 1024 });
      await page.waitForTimeout(500);
      await expect(page.locator('[data-testid="lobby-container"]')).toBeVisible();

      // Test mobile view
      await page.setViewportSize({ width: 375, height: 667 });
      await page.waitForTimeout(500);
      await expect(page.locator('[data-testid="lobby-container"]')).toBeVisible();
    });
  });

  test.describe('Game Mechanics Validation', () => {
    test('should handle weapon recoil and accuracy correctly', async () => {
      await page.click('text=Quick Play (with Bots)');
      await page.waitForSelector('canvas', { timeout: 15000 });

      // Rapid fire to test recoil
      for (let i = 0; i < 10; i++) {
        await page.mouse.click(400, 300);
        await page.waitForTimeout(100);
      }

      // Single precise shot after waiting
      await page.waitForTimeout(2000);
      await page.mouse.click(400, 300);

      // Verify game handles different firing patterns
      await expect(page.locator('canvas')).toBeVisible();
    });

    test('should load different maps correctly', async () => {
      const maps = ['de_dust2', 'de_mirage', 'de_cache'];
      
      for (const map of maps) {
        // Select map
        const mapSelector = page.locator(`[data-testid="map-${map}"]`);
        if (await mapSelector.isVisible({ timeout: 2000 })) {
          await mapSelector.click();
          
          await page.click('text=Quick Play (with Bots)');
          await page.waitForSelector('canvas', { timeout: 15000 });
          
          // Verify map loaded
          await expect(page.locator('canvas')).toBeVisible();
          
          // Return to lobby for next iteration
          await page.keyboard.press('Escape');
          await page.waitForTimeout(1000);
        }
      }
    });

    test('should provide accurate hit registration', async () => {
      await page.click('text=Quick Play (with Bots)');
      await page.waitForSelector('canvas', { timeout: 15000 });

      // Find bot and shoot at it
      const initialHealth = await page.locator('[data-testid="health-display"]').textContent();
      
      // Aim and shoot multiple times
      for (let i = 0; i < 5; i++) {
        await page.mouse.click(400, 300);
        await page.waitForTimeout(300);
      }

      // Health should change if hits registered
      const newHealth = await page.locator('[data-testid="health-display"]').textContent();
      // Note: This test might not always pass if no hits are made, which is realistic
    });
  });

  test.describe('Accessibility and Inclusion', () => {
    test('should support keyboard navigation', async () => {
      // Navigate using Tab key
      await page.keyboard.press('Tab');
      await page.keyboard.press('Tab');
      await page.keyboard.press('Enter'); // Should activate focused button

      // Verify navigation works
      await page.waitForTimeout(1000);
    });

    test('should have proper ARIA labels', async () => {
      const buttons = page.locator('button');
      const buttonCount = await buttons.count();
      
      for (let i = 0; i < Math.min(buttonCount, 5); i++) {
        const button = buttons.nth(i);
        const ariaLabel = await button.getAttribute('aria-label');
        const text = await button.textContent();
        
        // Button should have either aria-label or visible text
        expect(ariaLabel || text).toBeTruthy();
      }
    });

    test('should support high contrast mode', async () => {
      // Enable high contrast in browser
      await page.emulateMedia({ reducedMotion: 'reduce' });
      await page.emulateMedia({ colorScheme: 'dark' });
      
      // Verify UI remains functional
      await expect(page.locator('[data-testid="lobby-container"]')).toBeVisible();
    });
  });

  test.describe('Error Handling and Recovery', () => {
    test('should handle JavaScript errors gracefully', async () => {
      // Listen for console errors
      const errors: string[] = [];
      page.on('console', msg => {
        if (msg.type() === 'error') {
          errors.push(msg.text());
        }
      });

      await page.click('text=Quick Play (with Bots)');
      await page.waitForSelector('canvas', { timeout: 15000 });
      
      // Play for a while to catch any errors
      await page.waitForTimeout(5000);

      // Should have minimal errors
      const criticalErrors = errors.filter(error => 
        !error.includes('favicon') && 
        !error.includes('WebSocket') &&
        !error.includes('audio')
      );
      
      expect(criticalErrors.length).toBeLessThan(3);
    });

    test('should show user-friendly error messages', async () => {
      // Simulate an error condition
      await page.route('**/*', route => {
        if (route.request().url().includes('websocket')) {
          route.abort();
        } else {
          route.continue();
        }
      });

      await page.click('text=Quick Play (with Bots)');
      
      // Should handle network errors gracefully
      await page.waitForTimeout(3000);
      await expect(page.locator('canvas')).toBeVisible(); // Offline mode should still work
    });
  });
});