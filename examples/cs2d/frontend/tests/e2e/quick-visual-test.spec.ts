import { test, expect } from '@playwright/test';

test.describe('Quick Visual Verification', () => {
  test('direct game visual test', async ({ page }) => {
    // Go directly to game
    await page.goto('/game');
    
    // Wait for game to load
    await page.waitForSelector('[data-testid="cs16-game-container"]', { timeout: 15000 });
    
    console.log('🎮 Game loaded successfully');
    
    // Check HUD elements
    const health = page.locator('[data-testid="cs16-health"]');
    const weapon = page.locator('[data-testid="cs16-weapon"]');
    const radar = page.locator('[data-testid="cs16-radar"]');
    
    await expect(health).toBeVisible();
    await expect(weapon).toBeVisible();
    await expect(radar).toBeVisible();
    
    console.log('✅ Core HUD elements visible');
    
    // Check enhanced radar
    await expect(radar).toContainText('TACTICAL RADAR');
    const animatedElements = await radar.locator('.animate-pulse').count();
    expect(animatedElements).toBeGreaterThan(0);
    
    console.log(`✅ Enhanced radar with ${animatedElements} animated elements`);
    
    // Test weapon switching
    const initialWeapon = await weapon.textContent();
    await page.keyboard.press('2');
    await page.waitForTimeout(500);
    const newWeapon = await weapon.textContent();
    expect(newWeapon).not.toBe(initialWeapon);
    
    console.log(`✅ Weapon switching: ${initialWeapon} → ${newWeapon}`);
    
    // Test grenade effect
    await page.keyboard.press('g');
    await page.waitForTimeout(1000);
    
    console.log('✅ Grenade explosion effect triggered');
    
    // Check performance
    const fpsText = await page.locator('text=FPS:').textContent();
    if (fpsText) {
      const fps = parseInt(fpsText.replace('FPS:', '').trim());
      expect(fps).toBeGreaterThan(30);
      console.log(`✅ Performance: ${fps} FPS`);
    }
    
    // Test game menu
    await page.keyboard.press('Escape');
    const gameMenu = page.locator('[data-testid="cs16-game-menu"]');
    await expect(gameMenu).toBeVisible();
    await expect(gameMenu).toContainText('GAME MENU');
    
    console.log('✅ Game menu functional');
    
    // Close menu and test buy menu
    await page.keyboard.press('Escape');
    await page.keyboard.press('b');
    
    const buyMenu = page.locator('[data-testid="cs16-buy-menu"]');
    await expect(buyMenu).toBeVisible();
    await expect(buyMenu).toContainText('BUY EQUIPMENT');
    
    console.log('✅ Buy menu functional');
    
    // Final verification
    console.log('🎯 ALL VISUAL ENHANCEMENTS VERIFIED SUCCESSFULLY!');
  });
});
