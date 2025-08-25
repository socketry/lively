import { test, expect } from '@playwright/test';

test.describe('Room bot management and return flow', () => {
  test('remove a bot from the room list', async ({ page }) => {
    const roomId = `room_${Date.now()}`;
    const playerId = `player_${Math.random().toString(36).slice(2, 8)}`;

    await page.goto(`/room.html?room_id=${roomId}&player_id=${playerId}`);

    // Wait for room UI
    await expect(page.locator('#room-content')).toBeVisible({ timeout: 10_000 });
    await expect(page.locator('#bot-controls')).toBeVisible();

    // Add a bot
    await page.getByRole('button', { name: /新增 Bot|Add Bot/i }).click();

    const players = page.locator('#players-list .player-item');
    await expect(players).toHaveCount(2, { timeout: 5000 });

    // Click Remove on the bot entry (host cannot be removed)
    const removeButton = page.locator('#players-list .player-item .btn', {
      hasText: /Remove|移除|刪除/i,
    }).first();
    await removeButton.click();

    // Players count should decrease by 1
    await expect(players).toHaveCount(1);
  });

  test('start game then return to room (confirm dialog)', async ({ page }) => {
    const roomId = `room_${Date.now()}`;
    const playerId = `player_${Math.random().toString(36).slice(2, 8)}`;

    await page.goto(`/room.html?room_id=${roomId}&player_id=${playerId}`);

    await expect(page.locator('#room-content')).toBeVisible({ timeout: 10_000 });
    await expect(page.locator('#start-game-btn')).toBeVisible();

    // Start game
    await page.locator('#start-game-btn').click();
    await page.waitForURL('**/game.html**', { timeout: 20_000 });
    await expect(page.locator('#game-canvas')).toBeVisible({ timeout: 20_000 });

    // Accept confirm dialog when returning to room
    page.once('dialog', async (dialog) => {
      await dialog.accept();
    });

    // Click return to room button
    await page.locator('button[data-i18n="game.returnToRoom"]').click();

    // Back on room page with same room id
    await page.waitForURL(/room\.html.*room_id=/, { timeout: 10_000 });
    await expect(page.locator('#room-content')).toBeVisible();
    await expect(page.locator('#room-id')).toHaveText(roomId);
  });
});

