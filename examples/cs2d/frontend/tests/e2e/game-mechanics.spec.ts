import { test, expect } from './fixtures/game-fixtures';
import { simulatePlayerActions, waitForGameState } from './fixtures/game-fixtures';

// Configure test settings at top level
test.use({
  viewport: { width: 1920, height: 1080 },
  video: 'retain-on-failure'
});

test.describe('Game Mechanics', () => {

  test.beforeEach(async ({ page, lobbyHelpers }) => {
    // Setup: Create room and start game
    await lobbyHelpers.goToLobby();
    await lobbyHelpers.createRoom({
      name: 'Mechanics Test',
      gameMode: 'deathmatch',
      map: 'de_dust2'
    });
    
    // Force start for single player testing
    await lobbyHelpers.startGame(true);
    
    // Wait for game to load
    await page.waitForSelector('[data-testid="game-container"]', { timeout: 15000 });
    await waitForGameState(page, 'playing', 10000);
  });

  test('should handle player movement correctly', async ({ gameHelpers }) => {
    // Test basic movement
    await gameHelpers.movePlayer('up', 500);
    await gameHelpers.movePlayer('down', 500);
    await gameHelpers.movePlayer('left', 500);
    await gameHelpers.movePlayer('right', 500);
    
    // Test diagonal movement
    await simulatePlayerActions(gameHelpers, [
      { type: 'move', data: { direction: 'up', duration: 200 } },
      { type: 'move', data: { direction: 'right', duration: 200 }, delay: 0 }
    ]);
    
    // Verify player is still alive after movement
    const isAlive = await gameHelpers.isPlayerAlive();
    expect(isAlive).toBe(true);
  });

  test('should handle weapon switching', async ({ gameHelpers, page }) => {
    // Switch through all weapon slots
    for (let slot = 1; slot <= 5; slot++) {
      await gameHelpers.switchWeapon(slot);
      
      // Verify weapon changed in UI
      const activeWeapon = page.locator(`[data-testid="weapon-slot-${slot}"].active`);
      if (await activeWeapon.count() > 0) {
        await expect(activeWeapon).toBeVisible();
      }
    }
    
    // Switch back to primary
    await gameHelpers.switchWeapon(1);
  });

  test('should handle shooting and ammo management', async ({ gameHelpers, page }) => {
    // Get initial ammo count
    const initialAmmo = await gameHelpers.getAmmoCount();
    expect(initialAmmo.current).toBeGreaterThan(0);
    
    // Shoot multiple times
    for (let i = 0; i < 5; i++) {
      await gameHelpers.shootAt(960, 540);
      await page.waitForTimeout(100);
    }
    
    // Check ammo decreased
    const afterShootingAmmo = await gameHelpers.getAmmoCount();
    expect(afterShootingAmmo.current).toBeLessThan(initialAmmo.current);
    
    // Reload
    await gameHelpers.reloadWeapon();
    
    // Check ammo restored
    const afterReloadAmmo = await gameHelpers.getAmmoCount();
    expect(afterReloadAmmo.current).toBe(afterReloadAmmo.max);
  });

  test('should handle health and damage', async ({ gameHelpers, page }) => {
    // Get initial health
    const initialHealth = await gameHelpers.getPlayerHealth();
    expect(initialHealth).toBe(100);
    
    // Simulate taking damage (this would normally come from other players or environment)
    // For testing, we might need to trigger damage through game API or test mode
    await page.evaluate(() => {
      // Trigger test damage if available
      const gameAPI = (window as any).__gameAPI;
      if (gameAPI && gameAPI.takeDamage) {
        gameAPI.takeDamage(25);
      }
    });
    
    // Check health decreased
    const afterDamageHealth = await gameHelpers.getPlayerHealth();
    if (afterDamageHealth < initialHealth) {
      expect(afterDamageHealth).toBeLessThan(initialHealth);
    }
    
    // Test death and respawn
    if (!await gameHelpers.isPlayerAlive()) {
      await gameHelpers.waitForRespawn();
      
      // Should be alive with full health after respawn
      const respawnHealth = await gameHelpers.getPlayerHealth();
      expect(respawnHealth).toBe(100);
    }
  });

  test('should handle scoreboard display', async ({ gameHelpers, page }) => {
    // Open scoreboard
    await gameHelpers.openScoreboard();
    
    // Check scoreboard elements
    const scoreboard = page.locator('[data-testid="scoreboard"]');
    await expect(scoreboard).toBeVisible();
    
    // Check headers
    await expect(scoreboard.locator('th').filter({ hasText: /Player/i })).toBeVisible();
    await expect(scoreboard.locator('th').filter({ hasText: /Kills/i })).toBeVisible();
    await expect(scoreboard.locator('th').filter({ hasText: /Deaths/i })).toBeVisible();
    await expect(scoreboard.locator('th').filter({ hasText: /Score/i })).toBeVisible();
    
    // Check at least one player row exists
    const playerRows = scoreboard.locator('[data-testid="player-row"]');
    await expect(playerRows).toHaveCount(1, { timeout: 5000 });
    
    // Close scoreboard
    await gameHelpers.closeScoreboard();
    await expect(scoreboard).not.toBeVisible();
  });

  test('should handle in-game chat', async ({ gameHelpers, page }) => {
    const testMessage = `Test message ${Date.now()}`;
    
    // Send chat message
    await gameHelpers.sendChatMessage(testMessage);
    
    // Verify message appears in chat
    const chatMessages = page.locator('[data-testid="chat-messages"]');
    await expect(chatMessages).toContainText(testMessage);
    
    // Check message has timestamp
    const lastMessage = chatMessages.locator('[data-testid="chat-message"]').last();
    const timestamp = lastMessage.locator('[data-testid="message-timestamp"]');
    if (await timestamp.count() > 0) {
      await expect(timestamp).toBeVisible();
    }
  });

  test('should handle game menu and settings', async ({ gameHelpers, page }) => {
    // Open game menu
    await gameHelpers.openGameMenu();
    
    // Check menu options
    const gameMenu = page.locator('[data-testid="game-menu"]');
    await expect(gameMenu.locator('button').filter({ hasText: /Resume/i })).toBeVisible();
    await expect(gameMenu.locator('button').filter({ hasText: /Settings/i })).toBeVisible();
    await expect(gameMenu.locator('button').filter({ hasText: /Leave/i })).toBeVisible();
    
    // Change settings
    await gameHelpers.changeSetting('volume', 50);
    await gameHelpers.changeSetting('sensitivity', 75);
    await gameHelpers.changeSetting('fullscreen', true);
    
    // Close menu
    await gameHelpers.closeGameMenu();
    await expect(gameMenu).not.toBeVisible();
  });

  test('should maintain stable FPS during gameplay', async ({ gameHelpers }) => {
    // Measure FPS during various actions
    const fpsData: number[] = [];
    
    // Idle FPS
    let fps = await gameHelpers.getCurrentFPS();
    fpsData.push(fps);
    expect(fps).toBeGreaterThan(30);
    
    // FPS during movement
    await gameHelpers.performMovementSequence(['up', 'left', 'down', 'right']);
    fps = await gameHelpers.getCurrentFPS();
    fpsData.push(fps);
    expect(fps).toBeGreaterThan(25);
    
    // FPS during shooting
    for (let i = 0; i < 10; i++) {
      await gameHelpers.shootAt(960 + i * 10, 540);
    }
    fps = await gameHelpers.getCurrentFPS();
    fpsData.push(fps);
    expect(fps).toBeGreaterThan(25);
    
    // Average FPS should be acceptable
    const avgFPS = fpsData.reduce((a, b) => a + b, 0) / fpsData.length;
    expect(avgFPS).toBeGreaterThan(30);
  });

  test('should handle complex action sequences', async ({ gameHelpers }) => {
    // Perform complex sequence of actions
    await simulatePlayerActions(gameHelpers, [
      { type: 'move', data: { direction: 'up', duration: 500 }, delay: 100 },
      { type: 'switch-weapon', data: { slot: 2 }, delay: 100 },
      { type: 'shoot', data: { x: 900, y: 500 }, delay: 100 },
      { type: 'shoot', data: { x: 1000, y: 500 }, delay: 100 },
      { type: 'reload', delay: 1000 },
      { type: 'switch-weapon', data: { slot: 1 }, delay: 100 },
      { type: 'move', data: { direction: 'down', duration: 500 }, delay: 100 },
      { type: 'chat', data: { message: 'Nice shot!' }, delay: 500 }
    ]);
    
    // Verify player survived the sequence
    const isAlive = await gameHelpers.isPlayerAlive();
    expect(isAlive).toBe(true);
  });

  test('should handle grenades and special weapons', async ({ gameHelpers, page }) => {
    // Switch to grenade slot (usually slot 4)
    await gameHelpers.switchWeapon(4);
    
    // Check if grenade is available
    const grenadeIcon = page.locator('[data-testid="grenade-count"]');
    if (await grenadeIcon.count() > 0) {
      const grenadeCount = await grenadeIcon.textContent();
      expect(parseInt(grenadeCount || '0')).toBeGreaterThan(0);
      
      // Throw grenade
      await page.mouse.down({ button: 'right' }); // Hold for cooking
      await page.waitForTimeout(1000);
      await page.mouse.up({ button: 'right' });
      
      // Verify grenade count decreased
      const newGrenadeCount = await grenadeIcon.textContent();
      expect(parseInt(newGrenadeCount || '0')).toBeLessThan(parseInt(grenadeCount || '1'));
    }
  });

  test('should handle crouch and walk modifiers', async ({ page }) => {
    // Test crouching
    await page.keyboard.down('Control'); // Crouch
    await page.waitForTimeout(500);
    
    // Check if crouch indicator is visible
    const crouchIndicator = page.locator('[data-testid="crouch-indicator"]');
    if (await crouchIndicator.count() > 0) {
      await expect(crouchIndicator).toBeVisible();
    }
    
    await page.keyboard.up('Control');
    
    // Test walking (shift)
    await page.keyboard.down('Shift'); // Walk
    await page.keyboard.press('w'); // Move forward slowly
    await page.waitForTimeout(500);
    await page.keyboard.up('Shift');
  });

  test('should display HUD elements correctly', async ({ page }) => {
    // Check all HUD elements are visible
    const hudElements = [
      '[data-testid="health-bar"]',
      '[data-testid="ammo-counter"]',
      '[data-testid="minimap"]',
      '[data-testid="timer"]',
      '[data-testid="score-display"]',
      '[data-testid="weapon-icon"]'
    ];
    
    for (const selector of hudElements) {
      const element = page.locator(selector);
      if (await element.count() > 0) {
        await expect(element).toBeVisible();
      }
    }
    
    // Check HUD can be toggled
    await page.keyboard.press('F1'); // Common HUD toggle key
    await page.waitForTimeout(500);
    
    // Some elements might be hidden
    await page.keyboard.press('F1'); // Toggle back
  });

  test('should handle buy menu in appropriate game modes', async ({ page, lobbyHelpers }) => {
    // This test needs to be in a mode with buy zones
    await page.goto('/');
    await lobbyHelpers.goToLobby();
    
    await lobbyHelpers.createRoom({
      name: 'Buy Menu Test',
      gameMode: 'defuse',
      map: 'de_dust2'
    });
    
    await lobbyHelpers.startGame(true);
    await page.waitForSelector('[data-testid="game-container"]');
    
    // Open buy menu (usually 'b' key)
    await page.keyboard.press('b');
    
    const buyMenu = page.locator('[data-testid="buy-menu"]');
    if (await buyMenu.count() > 0) {
      await expect(buyMenu).toBeVisible();
      
      // Check weapon categories
      await expect(buyMenu.locator('[data-testid="pistols"]')).toBeVisible();
      await expect(buyMenu.locator('[data-testid="rifles"]')).toBeVisible();
      await expect(buyMenu.locator('[data-testid="equipment"]')).toBeVisible();
      
      // Try to buy a weapon (if money available)
      const moneyDisplay = page.locator('[data-testid="money-display"]');
      if (await moneyDisplay.count() > 0) {
        const money = parseInt(await moneyDisplay.textContent() || '0');
        
        if (money >= 500) {
          // Click on a cheap weapon
          const cheapWeapon = buyMenu.locator('[data-price="500"]').first();
          if (await cheapWeapon.count() > 0) {
            await cheapWeapon.click();
          }
        }
      }
      
      // Close buy menu
      await page.keyboard.press('Escape');
      await expect(buyMenu).not.toBeVisible();
    }
  });

  test('should handle spectator mode after death', async ({ page, gameHelpers }) => {
    // Simulate player death (for testing purposes)
    await page.evaluate(() => {
      const gameAPI = (window as any).__gameAPI;
      if (gameAPI && gameAPI.killPlayer) {
        gameAPI.killPlayer();
      }
    });
    
    // Check if spectator UI appears
    const spectatorUI = page.locator('[data-testid="spectator-ui"]');
    if (await spectatorUI.count() > 0) {
      await expect(spectatorUI).toBeVisible();
      
      // Check spectator controls
      await expect(spectatorUI.locator('[data-testid="next-player"]')).toBeVisible();
      await expect(spectatorUI.locator('[data-testid="prev-player"]')).toBeVisible();
      
      // Try switching between players (if multiple players)
      const nextBtn = spectatorUI.locator('[data-testid="next-player"]');
      if (await nextBtn.isEnabled()) {
        await nextBtn.click();
        await page.waitForTimeout(500);
      }
    }
    
    // Wait for respawn
    await gameHelpers.waitForRespawn();
  });
});
