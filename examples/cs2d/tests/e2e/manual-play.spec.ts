import { test, expect } from '@playwright/test';

/**
 * Manual CS2D gameplay walkthrough.
 *
 * Use headed mode to actually open and interact with the game page.
 */
test('Manual CS2D gameplay with Playwright', async ({ page }) => {
  // Navigate to the live game (static server)
  await page.goto('http://localhost:9293/game.html?room_id=playground&player_id=playtest&nickname=PlayTest');
  // Wait for the game canvas to appear
  await page.waitForSelector('canvas', { timeout: 30000 });
  console.log('✅ Game canvas found');

  // Let the game run in headed mode for observation
  console.log('⚙️ Running game for 10 seconds...');
  await page.waitForTimeout(10000);

  // Take a screenshot of the current state
  await page.screenshot({ path: 'test-results/manual-play.png', fullPage: true });
  console.log('📸 Screenshot saved to test-results/manual-play.png');
});