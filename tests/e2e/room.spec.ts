import { test, expect } from '@playwright/test';

test.describe('Room Waiting Layout', () => {
  test('loads room UI and shows players/actions', async ({ page }) => {
    const roomId = 'room_test_123';
    const playerId = 'player_test_abc';
    await page.goto(`/room.html?room_id=${roomId}&player_id=${playerId}`);

    await expect(page.getByRole('heading', { name: /房間等待|Room Waiting|房間/ })).toBeVisible();

    await expect(page.locator('#loading')).toBeVisible();
    await expect(page.locator('#room-content')).toBeHidden();

    await expect(page.locator('#room-content')).toBeVisible({ timeout: 5000 });

    await expect(page.locator('#room-title')).toContainText(roomId, { timeout: 2000 });
    await expect(page.locator('#room-id')).toHaveText(roomId);

    const playerCount = page.locator('#player-count');
    await expect(playerCount).toHaveText(/\d+/);
    await expect(page.locator('#players-list .player-item')).toHaveCountGreaterThan(0);

    await expect(page.locator('#leave-room-btn')).toBeVisible();
    await expect(page.locator('#start-game-btn')).toBeVisible();
  });
});

declare global {
  interface Locator {
    toHaveCountGreaterThan(count: number): Promise<void>;
  }
}

expect.extend({
  async toHaveCountGreaterThan(locator, minimum: number) {
    const count = await locator.count();
    const pass = count > minimum;
    return {
      pass,
      message: () => `expected count ${count} to be > ${minimum}`,
    };
  },
});

