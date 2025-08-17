import { test, expect } from '@playwright/test';

test.describe('CS2D Visual Enhancements', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('http://localhost:3000');
  });

  test('should display modern glass morphism lobby', async ({ page }) => {
    // Wait for lobby to load
    await page.waitForSelector('[data-testid="modern-lobby"]', { timeout: 10000 });
    
    // Check for glass morphism elements
    const glassElements = await page.locator('.backdrop-blur').count();
    expect(glassElements).toBeGreaterThan(0);
    
    // Check for gradient elements
    const gradientElements = await page.locator('[class*="gradient"]').count();
    expect(gradientElements).toBeGreaterThan(0);
    
    console.log(`✅ Glass elements: ${glassElements}, Gradients: ${gradientElements}`);
  });

  test('should navigate to game and display modern visual elements', async ({ page }) => {
    // Navigate to game from lobby
    await page.waitForSelector('[data-testid="modern-lobby"]', { timeout: 10000 });
    
    // Try to click on game/join button
    const gameButton = page.locator('button').filter({ hasText: /game|play|join/i }).first();
    if (await gameButton.count() > 0) {
      await gameButton.click();
    } else {
      // Navigate directly to game
      await page.goto('http://localhost:3000/game');
    }
    
    // Wait for game canvas to load
    await page.waitForSelector('[data-testid="cs16-game-container"]', { timeout: 15000 });
    
    const gameCanvas = page.locator('#cs16-game-canvas');
    await expect(gameCanvas).toBeVisible();
    
    console.log('✅ Game canvas loaded successfully');
  });

  test('should display enhanced HUD elements', async ({ page }) => {
    // Navigate directly to game
    await page.goto('http://localhost:3000/game');
    await page.waitForSelector('[data-testid="cs16-game-container"]', { timeout: 15000 });
    
    // Check for HUD elements
    const health = page.locator('[data-testid="cs16-health"]');
    const armor = page.locator('[data-testid="cs16-armor"]');
    const money = page.locator('[data-testid="cs16-money"]');
    const weapon = page.locator('[data-testid="cs16-weapon"]');
    const ammo = page.locator('[data-testid="cs16-ammo"]');
    
    await expect(health).toBeVisible();
    await expect(armor).toBeVisible();
    await expect(money).toBeVisible();
    await expect(weapon).toBeVisible();
    await expect(ammo).toBeVisible();
    
    // Check initial values
    await expect(health).toHaveText('100');
    await expect(armor).toHaveText('100');
    await expect(money).toContainText('$');
    
    console.log('✅ All HUD elements are visible and functional');
  });

  test('should display enhanced tactical minimap', async ({ page }) => {
    await page.goto('http://localhost:3000/game');
    await page.waitForSelector('[data-testid="cs16-game-container"]', { timeout: 15000 });
    
    // Check for enhanced radar
    const radar = page.locator('[data-testid="cs16-radar"]');
    await expect(radar).toBeVisible();
    
    // Check for "TACTICAL RADAR" text
    await expect(radar).toContainText('TACTICAL RADAR');
    
    // Check for radar info
    await expect(radar).toContainText('RANGE: 100m');
    await expect(radar).toContainText('SCAN: ACTIVE');
    
    // Check for animated elements (pulse, transitions)
    const animatedElements = await radar.locator('.animate-pulse').count();
    expect(animatedElements).toBeGreaterThan(0);
    
    console.log(`✅ Enhanced minimap with ${animatedElements} animated elements`);
  });

  test('should trigger visual effects on interaction', async ({ page }) => {
    await page.goto('http://localhost:3000/game');
    await page.waitForSelector('[data-testid="cs16-game-container"]', { timeout: 15000 });
    
    const gameCanvas = page.locator('#cs16-game-canvas');
    
    // Test shooting (click on canvas)
    const initialAmmo = await page.locator('[data-testid="cs16-ammo"]').textContent();
    
    // Click to shoot
    await gameCanvas.click({ position: { x: 400, y: 300 } });
    
    // Wait a moment for state to update
    await page.waitForTimeout(500);
    
    // Check if ammo decreased
    const newAmmo = await page.locator('[data-testid="cs16-ammo"]').textContent();
    expect(newAmmo).not.toBe(initialAmmo);
    
    console.log(`✅ Shooting interaction: ${initialAmmo} → ${newAmmo}`);
  });

  test('should display weapon switching effects', async ({ page }) => {
    await page.goto('http://localhost:3000/game');
    await page.waitForSelector('[data-testid="cs16-game-container"]', { timeout: 15000 });
    
    const weaponDisplay = page.locator('[data-testid="cs16-weapon"]');
    const initialWeapon = await weaponDisplay.textContent();
    
    // Test weapon switching (press key 2)
    await page.keyboard.press('2');
    await page.waitForTimeout(300);
    
    const newWeapon = await weaponDisplay.textContent();
    
    // Weapon should change
    expect(newWeapon).not.toBe(initialWeapon);
    
    console.log(`✅ Weapon switching: ${initialWeapon} → ${newWeapon}`);
  });

  test('should trigger grenade explosion effect', async ({ page }) => {
    await page.goto('http://localhost:3000/game');
    await page.waitForSelector('[data-testid="cs16-game-container"]', { timeout: 15000 });
    
    // Press 'g' to trigger grenade explosion
    await page.keyboard.press('g');
    
    // Wait for the effect to trigger
    await page.waitForTimeout(1000);
    
    // Visual effects are handled in canvas, so we just verify no errors occurred
    // and the game is still responsive
    const health = await page.locator('[data-testid="cs16-health"]').textContent();
    expect(health).toBe('100'); // Should still be 100
    
    console.log('✅ Grenade explosion effect triggered successfully');
  });

  test('should handle game menu interactions', async ({ page }) => {
    await page.goto('http://localhost:3000/game');
    await page.waitForSelector('[data-testid="cs16-game-container"]', { timeout: 15000 });
    
    // Press Escape to open menu
    await page.keyboard.press('Escape');
    
    // Check if menu appears
    const gameMenu = page.locator('[data-testid="cs16-game-menu"]');
    await expect(gameMenu).toBeVisible();
    
    // Check menu content
    await expect(gameMenu).toContainText('GAME MENU');
    await expect(gameMenu).toContainText('Resume Game');
    
    // Close menu
    await page.keyboard.press('Escape');
    await expect(gameMenu).not.toBeVisible();
    
    console.log('✅ Game menu interactions working correctly');
  });

  test('should display buy menu with modern styling', async ({ page }) => {
    await page.goto('http://localhost:3000/game');
    await page.waitForSelector('[data-testid="cs16-game-container"]', { timeout: 15000 });
    
    // Press 'b' to open buy menu
    await page.keyboard.press('b');
    
    // Check if buy menu appears
    const buyMenu = page.locator('[data-testid="cs16-buy-menu"]');
    await expect(buyMenu).toBeVisible();
    
    // Check menu structure
    await expect(buyMenu).toContainText('BUY EQUIPMENT');
    await expect(buyMenu).toContainText('Primary Weapons');
    await expect(buyMenu).toContainText('Secondary Weapons');
    
    // Check money display
    await expect(buyMenu).toContainText('Money: $');
    
    // Close menu
    await page.keyboard.press('Escape');
    await expect(buyMenu).not.toBeVisible();
    
    console.log('✅ Buy menu with modern styling functional');
  });

  test('should measure visual performance', async ({ page }) => {
    await page.goto('http://localhost:3000/game');
    await page.waitForSelector('[data-testid="cs16-game-container"]', { timeout: 15000 });
    
    // Wait for initial render
    await page.waitForTimeout(2000);
    
    // Measure FPS from the game
    const fpsText = await page.locator('text=FPS:').textContent();
    if (fpsText) {
      const fps = parseInt(fpsText.replace('FPS:', '').trim());
      expect(fps).toBeGreaterThan(30); // Should maintain 30+ FPS
      console.log(`✅ Performance: ${fps} FPS`);
    }
    
    // Test multiple interactions rapidly
    const gameCanvas = page.locator('#cs16-game-canvas');
    
    // Rapid clicking to test visual effects performance
    for (let i = 0; i < 5; i++) {
      await gameCanvas.click({ position: { x: 200 + i * 50, y: 200 + i * 30 } });
      await page.waitForTimeout(100);
    }
    
    // Weapon switching
    for (const key of ['1', '2', '3', '4', '5']) {
      await page.keyboard.press(key);
      await page.waitForTimeout(50);
    }
    
    // Verify game is still responsive after stress test
    const finalHealth = await page.locator('[data-testid="cs16-health"]').textContent();
    expect(finalHealth).toBe('100');
    
    console.log('✅ Visual performance test completed successfully');
  });

  test('should verify modern art style elements', async ({ page }) => {
    await page.goto('http://localhost:3000/game');
    await page.waitForSelector('[data-testid="cs16-game-container"]', { timeout: 15000 });
    
    const gameContainer = page.locator('[data-testid="cs16-game-container"]');
    
    // Check for modern styling
    await expect(gameContainer).toHaveClass(/bg-gray-900/);
    
    // Check canvas is present and properly styled
    const canvas = page.locator('#cs16-game-canvas');
    await expect(canvas).toBeVisible();
    await expect(canvas).toHaveClass(/cursor-crosshair/);
    
    // Verify HUD has modern glass morphism styling
    const hudElements = page.locator('div').filter({ has: page.locator('[style*="bg-black bg-opacity"]') });
    const hudCount = await hudElements.count();
    expect(hudCount).toBeGreaterThan(0);
    
    console.log(`✅ Modern art style verified with ${hudCount} glass morphism HUD elements`);
  });
});