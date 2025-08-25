import { test, expect, type Page, type BrowserContext } from '@playwright/test';

test.describe('CS2D Complete Game Flow', () => {
  let context: BrowserContext;
  let playerOnePage: Page;
  let playerTwoPage: Page;

  test.beforeAll(async ({ browser }) => {
    // Create persistent context for testing
    context = await browser.newContext({
      viewport: { width: 1920, height: 1080 },
      permissions: ['microphone', 'camera'],
    });
  });

  test.afterAll(async () => {
    await context.close();
  });

  test.describe('Single Player Flow', () => {
    test('should complete full user journey from landing to game', async ({ page }) => {
      // 1. Landing and Initial Load
      await test.step('Navigate to landing page', async () => {
        await page.goto('/');
        await expect(page).toHaveTitle(/CS2D/);
        
        // Check if app loads properly
        await expect(page.locator('#root')).toBeVisible();
        
        // Wait for React app to mount
        await page.waitForSelector('[data-testid="app-container"]', { 
          state: 'visible',
          timeout: 10000 
        });
      });

      // 2. Enter Lobby
      await test.step('Enter lobby and view available rooms', async () => {
        // Check if we're in lobby view
        const lobbyTitle = page.locator('h1').filter({ hasText: /Lobby|Game Rooms/i });
        await expect(lobbyTitle).toBeVisible({ timeout: 5000 });

        // Check for room list container
        const roomList = page.locator('[data-testid="room-list"]');
        if (await roomList.isVisible()) {
          // Count available rooms
          const rooms = await roomList.locator('[data-testid="room-item"]').count();
          console.log(`Found ${rooms} available rooms`);
        }

        // Check WebSocket connection status
        const connectionStatus = page.locator('[data-testid="connection-status"]');
        if (await connectionStatus.isVisible()) {
          await expect(connectionStatus).toHaveAttribute('data-status', 'connected');
        }
      });

      // 3. Create a New Room
      await test.step('Create a new game room', async () => {
        const createRoomBtn = page.locator('button').filter({ hasText: /Create Room|New Game/i });
        await expect(createRoomBtn).toBeVisible();
        await createRoomBtn.click();

        // Fill room creation form if it appears
        const roomNameInput = page.locator('input[name="roomName"]');
        if (await roomNameInput.isVisible()) {
          await roomNameInput.fill(`Test Room ${Date.now()}`);
          
          // Select game mode if available
          const gameModeSelect = page.locator('select[name="gameMode"]');
          if (await gameModeSelect.isVisible()) {
            await gameModeSelect.selectOption('deathmatch');
          }

          // Set max players
          const maxPlayersInput = page.locator('input[name="maxPlayers"]');
          if (await maxPlayersInput.isVisible()) {
            await maxPlayersInput.fill('8');
          }

          // Submit room creation
          const submitBtn = page.locator('button[type="submit"]').filter({ hasText: /Create|Start/i });
          await submitBtn.click();
        }

        // Wait for navigation to room
        await page.waitForURL(/\/room\/[\w-]+/, { timeout: 10000 });
      });

      // 4. Room Waiting Area
      await test.step('Configure room settings and wait for players', async () => {
        // Verify we're in a room
        const roomId = page.url().match(/\/room\/([\w-]+)/)?.[1];
        expect(roomId).toBeTruthy();

        // Check room info display
        const roomInfo = page.locator('[data-testid="room-info"]');
        await expect(roomInfo).toBeVisible();

        // Check player list
        const playerList = page.locator('[data-testid="player-list"]');
        await expect(playerList).toBeVisible();
        
        // Verify we're shown as host
        const hostBadge = page.locator('[data-testid="host-badge"]');
        await expect(hostBadge).toBeVisible();

        // Configure game settings
        const mapSelect = page.locator('select[name="map"]');
        if (await mapSelect.isVisible()) {
          await mapSelect.selectOption('de_dust2');
        }

        // Toggle ready status
        const readyBtn = page.locator('button').filter({ hasText: /Ready/i });
        if (await readyBtn.isVisible()) {
          await readyBtn.click();
          await expect(readyBtn).toHaveText(/Not Ready|Cancel/i);
        }
      });

      // 5. Start Game (as host)
      await test.step('Start the game', async () => {
        const startGameBtn = page.locator('button').filter({ hasText: /Start Game|Begin/i });
        
        // For single player testing, we might need to bypass player requirements
        const bypassBtn = page.locator('button').filter({ hasText: /Start Anyway|Practice/i });
        
        if (await startGameBtn.isEnabled()) {
          await startGameBtn.click();
        } else if (await bypassBtn.isVisible()) {
          await bypassBtn.click();
        }

        // Wait for game to load
        await page.waitForURL(/\/game\/[\w-]+/, { timeout: 15000 });
      });

      // 6. In-Game Testing
      await test.step('Test in-game mechanics', async () => {
        // Wait for game canvas or container
        const gameCanvas = page.locator('canvas#game-canvas, [data-testid="game-container"]');
        await expect(gameCanvas).toBeVisible({ timeout: 10000 });

        // Check HUD elements
        const healthBar = page.locator('[data-testid="health-bar"]');
        const ammoCounter = page.locator('[data-testid="ammo-counter"]');
        const scoreBoard = page.locator('[data-testid="scoreboard"]');
        
        if (await healthBar.isVisible()) {
          await expect(healthBar).toHaveAttribute('data-health', '100');
        }
        
        if (await ammoCounter.isVisible()) {
          const ammoText = await ammoCounter.textContent();
          expect(ammoText).toMatch(/\d+\/\d+/); // Format: current/max
        }

        // Test movement controls
        await page.keyboard.press('w'); // Move forward
        await page.waitForTimeout(100);
        await page.keyboard.press('s'); // Move backward
        await page.waitForTimeout(100);
        await page.keyboard.press('a'); // Move left
        await page.waitForTimeout(100);
        await page.keyboard.press('d'); // Move right
        await page.waitForTimeout(100);

        // Test weapon switching
        await page.keyboard.press('1'); // Primary weapon
        await page.waitForTimeout(100);
        await page.keyboard.press('2'); // Secondary weapon
        await page.waitForTimeout(100);

        // Test shooting
        await page.mouse.click(960, 540); // Click center of screen
        await page.waitForTimeout(100);

        // Test reload
        await page.keyboard.press('r');
        await page.waitForTimeout(100);

        // Open scoreboard
        await page.keyboard.down('Tab');
        await page.waitForTimeout(500);
        
        if (await scoreBoard.isVisible()) {
          // Check scoreboard has player info
          const playerRows = await scoreBoard.locator('tr[data-testid="player-row"]').count();
          expect(playerRows).toBeGreaterThan(0);
        }
        
        await page.keyboard.up('Tab');
      });

      // 7. In-Game Menu
      await test.step('Test in-game menu and settings', async () => {
        // Open in-game menu
        await page.keyboard.press('Escape');
        
        const gameMenu = page.locator('[data-testid="game-menu"]');
        await expect(gameMenu).toBeVisible();

        // Check menu options
        const resumeBtn = page.locator('button').filter({ hasText: /Resume/i });
        const settingsBtn = page.locator('button').filter({ hasText: /Settings/i });
        const quitBtn = page.locator('button').filter({ hasText: /Leave Game|Quit/i });

        await expect(resumeBtn).toBeVisible();
        await expect(settingsBtn).toBeVisible();
        await expect(quitBtn).toBeVisible();

        // Test settings
        await settingsBtn.click();
        
        const settingsModal = page.locator('[data-testid="settings-modal"]');
        if (await settingsModal.isVisible()) {
          // Adjust volume
          const volumeSlider = page.locator('input[type="range"][name="volume"]');
          if (await volumeSlider.isVisible()) {
            await volumeSlider.fill('50');
          }

          // Toggle fullscreen
          const fullscreenToggle = page.locator('input[type="checkbox"][name="fullscreen"]');
          if (await fullscreenToggle.isVisible()) {
            await fullscreenToggle.check();
          }

          // Close settings
          const closeBtn = page.locator('button').filter({ hasText: /Close|Back/i });
          await closeBtn.click();
        }

        // Resume game
        await resumeBtn.click();
        await expect(gameMenu).not.toBeVisible();
      });

      // 8. Leave Game
      await test.step('Leave game and return to lobby', async () => {
        // Open menu again
        await page.keyboard.press('Escape');
        
        const quitBtn = page.locator('button').filter({ hasText: /Leave Game|Quit/i });
        await quitBtn.click();

        // Confirm leave if prompted
        const confirmBtn = page.locator('button').filter({ hasText: /Confirm|Yes/i });
        if (await confirmBtn.isVisible()) {
          await confirmBtn.click();
        }

        // Wait for return to lobby
        await page.waitForURL(/^\/$|\/lobby/, { timeout: 10000 });
        
        // Verify we're back in lobby
        const lobbyTitle = page.locator('h1').filter({ hasText: /Lobby|Game Rooms/i });
        await expect(lobbyTitle).toBeVisible();
      });
    });
  });

  test.describe('Multiplayer Flow', () => {
    test('should handle two players joining and playing together', async () => {
      // Create two player pages
      playerOnePage = await context.newPage();
      playerTwoPage = await context.newPage();

      // Player 1: Create room
      await test.step('Player 1 creates a room', async () => {
        await playerOnePage.goto('/');
        await playerOnePage.waitForSelector('[data-testid="app-container"]');
        
        const createRoomBtn = playerOnePage.locator('button').filter({ hasText: /Create Room/i });
        await createRoomBtn.click();

        // Get room ID from URL
        await playerOnePage.waitForURL(/\/room\/[\w-]+/);
        const roomUrl = playerOnePage.url();
        const roomId = roomUrl.match(/\/room\/([\w-]+)/)?.[1];
        expect(roomId).toBeTruthy();

        // Store room ID for player 2
        await playerOnePage.evaluate((id) => {
          if (id) {
            window.localStorage.setItem('test-room-id', id);
          }
        }, roomId);
      });

      // Player 2: Join room
      await test.step('Player 2 joins the room', async () => {
        await playerTwoPage.goto('/');
        await playerTwoPage.waitForSelector('[data-testid="app-container"]');

        // Get room ID from player 1
        const roomId = await playerOnePage.evaluate(() => 
          window.localStorage.getItem('test-room-id')
        );

        // Join specific room
        await playerTwoPage.goto(`/room/${roomId}`);
        
        // Verify both players see each other
        const playerList1 = playerOnePage.locator('[data-testid="player-list"]');
        const playerList2 = playerTwoPage.locator('[data-testid="player-list"]');
        
        await expect(playerList1.locator('[data-testid="player-item"]')).toHaveCount(2);
        await expect(playerList2.locator('[data-testid="player-item"]')).toHaveCount(2);
      });

      // Both players ready up
      await test.step('Both players ready up', async () => {
        const readyBtn1 = playerOnePage.locator('button').filter({ hasText: /Ready/i });
        const readyBtn2 = playerTwoPage.locator('button').filter({ hasText: /Ready/i });
        
        await readyBtn2.click(); // Player 2 ready
        await readyBtn1.click(); // Player 1 ready (host)
        
        // Host starts game
        const startBtn = playerOnePage.locator('button').filter({ hasText: /Start Game/i });
        await expect(startBtn).toBeEnabled();
        await startBtn.click();
      });

      // Both players in game
      await test.step('Both players enter the game', async () => {
        // Wait for both to load game
        await playerOnePage.waitForURL(/\/game\/[\w-]+/);
        await playerTwoPage.waitForURL(/\/game\/[\w-]+/);
        
        // Verify game canvas visible for both
        const canvas1 = playerOnePage.locator('canvas#game-canvas, [data-testid="game-container"]');
        const canvas2 = playerTwoPage.locator('canvas#game-canvas, [data-testid="game-container"]');
        
        await expect(canvas1).toBeVisible();
        await expect(canvas2).toBeVisible();
      });

      // Test player interactions
      await test.step('Test multiplayer interactions', async () => {
        // Player 1 moves
        await playerOnePage.keyboard.press('w');
        await playerOnePage.waitForTimeout(500);
        
        // Player 2 should see player 1's movement
        // This would need actual game state verification
        
        // Player 2 shoots
        await playerTwoPage.mouse.click(960, 540);
        await playerTwoPage.waitForTimeout(500);
        
        // Check if damage registered (would need game state)
        
        // Test chat
        const chatInput1 = playerOnePage.locator('input[data-testid="chat-input"]');
        if (await chatInput1.isVisible()) {
          await chatInput1.fill('Hello Player 2!');
          await chatInput1.press('Enter');
          
          // Check if message appears for player 2
          const chatMessages2 = playerTwoPage.locator('[data-testid="chat-messages"]');
          await expect(chatMessages2).toContainText('Hello Player 2!');
        }
      });

      // Clean up
      await test.step('Clean up multiplayer test', async () => {
        await playerOnePage.close();
        await playerTwoPage.close();
      });
    });
  });

  test.describe('WebSocket Connection Handling', () => {
    test('should handle connection loss and reconnection', async ({ page }) => {
      await page.goto('/');
      await page.waitForSelector('[data-testid="app-container"]');

      // Check initial connection
      const connectionStatus = page.locator('[data-testid="connection-status"]');
      await expect(connectionStatus).toHaveAttribute('data-status', 'connected');

      // Simulate offline
      await page.context().setOffline(true);
      await expect(connectionStatus).toHaveAttribute('data-status', 'disconnected');
      
      // Check for reconnection attempts
      const reconnectingStatus = page.locator('[data-testid="reconnecting-indicator"]');
      if (await reconnectingStatus.isVisible()) {
        await expect(reconnectingStatus).toBeVisible();
      }

      // Go back online
      await page.context().setOffline(false);
      
      // Should reconnect
      await expect(connectionStatus).toHaveAttribute('data-status', 'connected', {
        timeout: 10000
      });
    });

    test('should maintain game state during brief disconnections', async ({ page }) => {
      // Navigate to game
      await page.goto('/game/test-game-id');
      await page.waitForSelector('[data-testid="game-container"]');

      // Store initial game state
      const initialHealth = await page.locator('[data-testid="health-bar"]').getAttribute('data-health');
      const initialAmmo = await page.locator('[data-testid="ammo-counter"]').textContent();

      // Brief disconnection
      await page.context().setOffline(true);
      await page.waitForTimeout(2000);
      await page.context().setOffline(false);

      // Wait for reconnection
      await page.waitForTimeout(3000);

      // Verify state preserved
      const newHealth = await page.locator('[data-testid="health-bar"]').getAttribute('data-health');
      const newAmmo = await page.locator('[data-testid="ammo-counter"]').textContent();

      expect(newHealth).toBe(initialHealth);
      expect(newAmmo).toBe(initialAmmo);
    });
  });

  test.describe('Performance and Load Testing', () => {
    test('should handle rapid user actions without lag', async ({ page }) => {
      await page.goto('/game/test-game-id');
      await page.waitForSelector('[data-testid="game-container"]');

      const startTime = Date.now();

      // Rapid movement commands
      for (let i = 0; i < 20; i++) {
        await page.keyboard.press('w');
        await page.keyboard.press('a');
        await page.keyboard.press('s');
        await page.keyboard.press('d');
      }

      // Rapid shooting
      for (let i = 0; i < 10; i++) {
        await page.mouse.click(960, 540);
        await page.waitForTimeout(50);
      }

      const endTime = Date.now();
      const duration = endTime - startTime;

      // Should complete all actions within reasonable time
      expect(duration).toBeLessThan(5000);

      // Check for error messages
      const errorMessages = await page.locator('[data-testid="error-message"]').count();
      expect(errorMessages).toBe(0);
    });

    test('should maintain stable FPS during gameplay', async ({ page }) => {
      await page.goto('/game/test-game-id');
      await page.waitForSelector('[data-testid="game-container"]');

      // Collect FPS data
      const fpsData = await page.evaluate(() => {
        return new Promise<number[]>((resolve) => {
          const fps: number[] = [];
          let lastTime = performance.now();
          let frameCount = 0;
          
          const collectFPS = () => {
            frameCount++;
            const currentTime = performance.now();
            
            if (currentTime - lastTime >= 1000) {
              fps.push(frameCount);
              frameCount = 0;
              lastTime = currentTime;
              
              if (fps.length >= 5) {
                resolve(fps);
              } else {
                requestAnimationFrame(collectFPS);
              }
            } else {
              requestAnimationFrame(collectFPS);
            }
          };
          
          requestAnimationFrame(collectFPS);
        });
      });

      // Average FPS should be above 30
      const avgFPS = fpsData.reduce((a, b) => a + b, 0) / fpsData.length;
      expect(avgFPS).toBeGreaterThan(30);

      // No severe FPS drops
      const minFPS = Math.min(...fpsData);
      expect(minFPS).toBeGreaterThan(20);
    });
  });

  test.describe('Game Modes and Maps', () => {
    test('should load different game modes correctly', async ({ page }) => {
      const gameModes = ['deathmatch', 'team-deathmatch', 'capture-the-flag', 'defuse'];
      
      for (const mode of gameModes) {
        await test.step(`Test ${mode} mode`, async () => {
          await page.goto('/');
          
          // Create room with specific mode
          const createBtn = page.locator('button').filter({ hasText: /Create Room/i });
          await createBtn.click();
          
          const modeSelect = page.locator('select[name="gameMode"]');
          if (await modeSelect.isVisible()) {
            await modeSelect.selectOption(mode);
            
            const submitBtn = page.locator('button[type="submit"]');
            await submitBtn.click();
            
            // Verify mode is set
            await page.waitForURL(/\/room\/[\w-]+/);
            const modeIndicator = page.locator('[data-testid="game-mode-indicator"]');
            if (await modeIndicator.isVisible()) {
              await expect(modeIndicator).toContainText(mode);
            }
          }
        });
      }
    });

    test('should load different maps correctly', async ({ page }) => {
      const maps = ['de_dust2', 'de_inferno', 'cs_office', 'aim_map'];
      
      for (const map of maps) {
        await test.step(`Test ${map} map`, async () => {
          await page.goto(`/game/test-game-id?map=${map}`);
          await page.waitForSelector('[data-testid="game-container"]');
          
          // Verify map loaded
          const mapIndicator = page.locator('[data-testid="current-map"]');
          if (await mapIndicator.isVisible()) {
            await expect(mapIndicator).toContainText(map);
          }
          
          // Check map-specific elements loaded
          const mapBackground = page.locator(`[data-map="${map}"]`);
          if (await mapBackground.count() > 0) {
            await expect(mapBackground).toBeVisible();
          }
        });
      }
    });
  });
});
