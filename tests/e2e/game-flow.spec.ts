import { test, expect } from '@playwright/test';

test.describe('CS2D Game Flow', () => {
  test('host adds a bot, starts game, and performs basic actions', async ({ page }) => {
    const roomId = `room_${Date.now()}`;
    const playerId = `player_${Math.random().toString(36).slice(2, 8)}`;

    // Go to room page as host (fallback makes creator_id === playerId)
    await page.goto(`/room.html?room_id=${roomId}&player_id=${playerId}`);

    // Wait for room UI to be ready
    await expect(page.locator('#loading')).toBeVisible();
    await expect(page.locator('#room-content')).toBeVisible({ timeout: 10_000 });

    // Verify basic room details
    await expect(page.locator('#room-id')).toHaveText(roomId);
    await expect(page.locator('#start-game-btn')).toBeVisible();
    await expect(page.locator('#bot-controls')).toBeVisible();

    // Add a bot (falls back to local add when API not available)
    await page.getByRole('button', { name: /新增 Bot|Add Bot/i }).click();
    // Players should increase (> 1 because host + bot at least)
    await expect(page.locator('#players-list .player-item')).toHaveCount(2, { timeout: 5000 });

    // Start the game
    await page.locator('#start-game-btn').click();
    await page.waitForURL('**/game.html**', { timeout: 20_000 });

    // Game loading sequence completes and canvas becomes visible
    const canvas = page.locator('#game-canvas');
    await expect(canvas).toBeVisible({ timeout: 20_000 });

    // Verify HUD elements
    const currentAmmo = page.locator('#current-ammo');
    const reserveAmmo = page.locator('#reserve-ammo');
    await expect(currentAmmo).toBeVisible();
    await expect(reserveAmmo).toBeVisible();

    // Record ammo, click to shoot once, ammo should decrease
    const ammoBefore = parseInt(await currentAmmo.innerText(), 10);
    await canvas.click({ position: { x: 200, y: 200 } });
    await expect(currentAmmo).not.toHaveText(String(ammoBefore));

    // Show scoreboard with Tab, then hide
    await page.keyboard.down('Tab');
    await expect(page.locator('#scoreboard')).toBeVisible();
    await page.keyboard.up('Tab');
    await expect(page.locator('#scoreboard')).toBeHidden();

    // Send a chat message
    await page.keyboard.press('Enter');
    await page.locator('#chat-input').fill('hello world');
    await page.keyboard.press('Enter');
    await expect(page.locator('#chat-messages .chat-message:last-child')).toContainText('hello world');
  });
});

