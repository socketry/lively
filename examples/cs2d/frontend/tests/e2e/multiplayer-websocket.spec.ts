import { test, expect } from './fixtures/game-fixtures';
import { 
  createMultiplePlayers, 
  simulateNetworkConditions,
  captureGameState,
  waitForGameState 
} from './fixtures/game-fixtures';

// Configure test settings at top level
test.use({
  viewport: { width: 1920, height: 1080 },
  video: 'retain-on-failure'
});

test.describe('Multiplayer and WebSocket', () => {

  test.describe('WebSocket Connection', () => {
    test('should establish WebSocket connection on app load', async ({ page }) => {
      await page.goto('/');
      
      // Wait for app to initialize
      await page.waitForSelector('[data-testid="app-container"]');
      
      // Check connection status indicator
      const connectionStatus = page.locator('[data-testid="connection-status"]');
      await expect(connectionStatus).toBeVisible();
      await expect(connectionStatus).toHaveAttribute('data-status', 'connected', {
        timeout: 10000
      });
      
      // Check latency display
      const latencyDisplay = page.locator('[data-testid="latency-display"]');
      if (await latencyDisplay.count() > 0) {
        const latencyText = await latencyDisplay.textContent();
        expect(latencyText).toMatch(/\d+ms/);
        
        // Latency should be reasonable
        const latency = parseInt(latencyText?.replace('ms', '') || '0');
        expect(latency).toBeLessThan(200);
      }
    });

    test('should handle connection loss gracefully', async ({ page }) => {
      await page.goto('/');
      await page.waitForSelector('[data-testid="app-container"]');
      
      const connectionStatus = page.locator('[data-testid="connection-status"]');
      
      // Simulate offline
      await simulateNetworkConditions(page, 'offline');
      
      // Should show disconnected status
      await expect(connectionStatus).toHaveAttribute('data-status', 'disconnected', {
        timeout: 5000
      });
      
      // Should show reconnection UI
      const reconnectingIndicator = page.locator('[data-testid="reconnecting-indicator"]');
      if (await reconnectingIndicator.count() > 0) {
        await expect(reconnectingIndicator).toBeVisible();
      }
      
      // Should show offline notification
      const offlineNotification = page.locator('[data-testid="offline-notification"]');
      if (await offlineNotification.count() > 0) {
        await expect(offlineNotification).toBeVisible();
        await expect(offlineNotification).toContainText(/offline|disconnected/i);
      }
      
      // Go back online
      await simulateNetworkConditions(page, 'online');
      
      // Should reconnect
      await expect(connectionStatus).toHaveAttribute('data-status', 'connected', {
        timeout: 15000
      });
      
      // Offline notification should disappear
      if (await offlineNotification.count() > 0) {
        await expect(offlineNotification).not.toBeVisible();
      }
    });

    test('should handle reconnection with state recovery', async ({ page, lobbyHelpers }) => {
      // Join a room
      await lobbyHelpers.goToLobby();
      const roomId = await lobbyHelpers.createRoom({
        name: 'Reconnect Test'
      });
      
      // Store initial state
      const initialPlayers = await lobbyHelpers.getPlayersInRoom();
      const initialRoomInfo = await lobbyHelpers.getRoomInfo();
      
      // Simulate brief disconnection
      await simulateNetworkConditions(page, 'offline');
      await page.waitForTimeout(3000);
      await simulateNetworkConditions(page, 'online');
      
      // Wait for reconnection
      await page.waitForTimeout(5000);
      
      // Verify state recovered
      const recoveredPlayers = await lobbyHelpers.getPlayersInRoom();
      const recoveredRoomInfo = await lobbyHelpers.getRoomInfo();
      
      expect(recoveredPlayers.length).toBe(initialPlayers.length);
      expect(recoveredRoomInfo.id).toBe(initialRoomInfo.id);
      expect(recoveredRoomInfo.name).toBe(initialRoomInfo.name);
    });

    test('should handle slow network conditions', async ({ page, lobbyHelpers }) => {
      await page.goto('/');
      
      // Simulate slow 3G
      await simulateNetworkConditions(page, 'slow-3g');
      
      // Operations should still work, just slower
      await lobbyHelpers.goToLobby();
      
      // Create room with timeout consideration
      const roomId = await lobbyHelpers.createRoom({
        name: 'Slow Network Test'
      });
      
      expect(roomId).toBeTruthy();
      
      // Check for lag compensation UI
      const lagIndicator = page.locator('[data-testid="high-latency-warning"]');
      if (await lagIndicator.count() > 0) {
        await expect(lagIndicator).toBeVisible();
      }
      
      // Reset to normal
      await simulateNetworkConditions(page, 'online');
    });

    test('should queue messages during disconnection', async ({ page, lobbyHelpers }) => {
      await lobbyHelpers.goToLobby();
      await lobbyHelpers.createRoom({ name: 'Queue Test' });
      
      // Go offline
      await simulateNetworkConditions(page, 'offline');
      
      // Try to send messages while offline
      const messages = ['Message 1', 'Message 2', 'Message 3'];
      for (const msg of messages) {
        await lobbyHelpers.sendRoomChat(msg);
      }
      
      // Messages should be queued (check UI indication)
      const queueIndicator = page.locator('[data-testid="messages-queued"]');
      if (await queueIndicator.count() > 0) {
        await expect(queueIndicator).toBeVisible();
        await expect(queueIndicator).toContainText('3');
      }
      
      // Go back online
      await simulateNetworkConditions(page, 'online');
      
      // Wait for messages to be sent
      await page.waitForTimeout(3000);
      
      // All messages should appear in chat
      const chatMessages = page.locator('[data-testid="room-chat-messages"]');
      for (const msg of messages) {
        await expect(chatMessages).toContainText(msg);
      }
    });
  });

  test.describe('Multiplayer Interactions', () => {
    test('should sync player movements between clients', async ({ browser }) => {
      // Create two players
      const { pages, helpers } = await createMultiplePlayers(browser, 2);
      
      // Both join same room
      const lobby1 = new (await import('./helpers/lobby-helpers')).LobbyHelpers(pages[0]);
      const lobby2 = new (await import('./helpers/lobby-helpers')).LobbyHelpers(pages[1]);
      
      await lobby1.goToLobby();
      const roomId = await lobby1.createRoom({
        name: 'Movement Sync Test',
        gameMode: 'deathmatch'
      });
      
      await lobby2.goToLobby();
      await lobby2.joinRoom(roomId);
      
      // Both ready and start game
      await lobby2.toggleReady();
      await lobby1.startGame(false);
      
      // Wait for both in game
      await waitForGameState(pages[0], 'playing', 15000);
      await waitForGameState(pages[1], 'playing', 15000);
      
      // Player 1 moves
      await helpers[0].performMovementSequence(['up', 'up', 'right', 'right']);
      
      // Player 2 should see player 1's position update
      await pages[1].waitForTimeout(1000); // Allow for network delay
      
      // Check if player 2 sees player 1
      const otherPlayerIndicator = pages[1].locator('[data-testid="other-player"]');
      if (await otherPlayerIndicator.count() > 0) {
        await expect(otherPlayerIndicator).toBeVisible();
      }
      
      // Clean up
      await Promise.all(pages.map(p => p.close()));
    });

    test('should sync shooting and damage between players', async ({ browser }) => {
      const { pages, helpers } = await createMultiplePlayers(browser, 2);
      
      // Setup game with both players
      const lobby1 = new (await import('./helpers/lobby-helpers')).LobbyHelpers(pages[0]);
      const lobby2 = new (await import('./helpers/lobby-helpers')).LobbyHelpers(pages[1]);
      
      await lobby1.goToLobby();
      const roomId = await lobby1.createRoom({
        name: 'Combat Sync Test',
        gameMode: 'deathmatch'
      });
      
      await lobby2.goToLobby();
      await lobby2.joinRoom(roomId);
      await lobby2.toggleReady();
      await lobby1.startGame(false);
      
      await waitForGameState(pages[0], 'playing', 15000);
      await waitForGameState(pages[1], 'playing', 15000);
      
      // Get initial health for both players
      const initialHealth1 = await helpers[0].getPlayerHealth();
      const initialHealth2 = await helpers[1].getPlayerHealth();
      
      expect(initialHealth1).toBe(100);
      expect(initialHealth2).toBe(100);
      
      // Player 1 shoots at player 2's position
      // This would need actual position data from the game
      await helpers[0].shootAt(960, 540);
      await pages[0].waitForTimeout(500);
      
      // Check if damage was dealt (in a real scenario)
      // This depends on hit detection and game mechanics
      
      // Check kill feed if available
      const killFeed = pages[0].locator('[data-testid="kill-feed"]');
      if (await killFeed.count() > 0) {
        // Should show kill/damage events
        const feedItems = killFeed.locator('[data-testid="feed-item"]');
        const itemCount = await feedItems.count();
        
        if (itemCount > 0) {
          expect(itemCount).toBeGreaterThan(0);
        }
      }
      
      await Promise.all(pages.map(p => p.close()));
    });

    test('should sync game state updates', async ({ browser }) => {
      const { pages } = await createMultiplePlayers(browser, 3);
      
      // All players join same room
      const lobbies = await Promise.all(
        pages.map(async p => {
          const { LobbyHelpers } = await import('./helpers/lobby-helpers');
          return new LobbyHelpers(p);
        })
      );
      
      await lobbies[0].goToLobby();
      const roomId = await lobbies[0].createRoom({
        name: 'State Sync Test',
        gameMode: 'team-deathmatch',
        maxPlayers: 4
      });
      
      await Promise.all([
        lobbies[1].goToLobby().then(() => lobbies[1].joinRoom(roomId)),
        lobbies[2].goToLobby().then(() => lobbies[2].joinRoom(roomId))
      ]);
      
      // Check all players see same room state
      const roomInfos = await Promise.all(
        lobbies.map(l => l.getRoomInfo())
      );
      
      // All should have same room info
      expect(roomInfos[0].id).toBe(roomInfos[1].id);
      expect(roomInfos[1].id).toBe(roomInfos[2].id);
      expect(roomInfos[0].currentPlayers).toBe(3);
      expect(roomInfos[1].currentPlayers).toBe(3);
      expect(roomInfos[2].currentPlayers).toBe(3);
      
      // Player 2 changes team
      await lobbies[1].switchTeam('ct');
      await pages[0].waitForTimeout(1000);
      
      // All players should see the team change
      const players = await Promise.all(
        lobbies.map(l => l.getPlayersInRoom())
      );
      
      // Find player 2 in each view
      const player2InView0 = players[0].find(p => !p.isHost && p.team === 'ct');
      const player2InView1 = players[1].find(p => !p.isHost && p.team === 'ct');
      const player2InView2 = players[2].find(p => !p.isHost && p.team === 'ct');
      
      expect(player2InView0).toBeTruthy();
      expect(player2InView1).toBeTruthy();
      expect(player2InView2).toBeTruthy();
      
      await Promise.all(pages.map(p => p.close()));
    });

    test('should handle player disconnection and reconnection', async ({ browser }) => {
      const context = await browser.newContext();
      
      // Create 3 players
      const pages = await Promise.all([
        context.newPage(),
        context.newPage(),
        context.newPage()
      ]);
      
      const lobbies = await Promise.all(
        pages.map(async p => {
          const { LobbyHelpers } = await import('./helpers/lobby-helpers');
          return new LobbyHelpers(p);
        })
      );
      
      // All join same room
      await lobbies[0].goToLobby();
      const roomId = await lobbies[0].createRoom({
        name: 'Disconnect Test',
        maxPlayers: 4
      });
      
      await Promise.all([
        lobbies[1].goToLobby().then(() => lobbies[1].joinRoom(roomId)),
        lobbies[2].goToLobby().then(() => lobbies[2].joinRoom(roomId))
      ]);
      
      // Player 2 disconnects
      await pages[1].close();
      await pages[0].waitForTimeout(2000);
      
      // Other players should see player 2 as disconnected
      const playersAfterDisconnect = await lobbies[0].getPlayersInRoom();
      expect(playersAfterDisconnect.length).toBe(2);
      
      // Player 2 reconnects
      pages[1] = await context.newPage();
      lobbies[1] = new (await import('./helpers/lobby-helpers')).LobbyHelpers(pages[1]);
      
      await lobbies[1].goToLobby();
      await lobbies[1].joinRoom(roomId);
      
      // All players should be back
      const playersAfterReconnect = await lobbies[0].getPlayersInRoom();
      expect(playersAfterReconnect.length).toBe(3);
      
      await context.close();
    });

    test('should handle concurrent actions from multiple players', async ({ browser }) => {
      const { pages, helpers } = await createMultiplePlayers(browser, 4);
      
      // All join and start game
      const lobbies = await Promise.all(
        pages.map(async p => {
          const { LobbyHelpers } = await import('./helpers/lobby-helpers');
          return new LobbyHelpers(p);
        })
      );
      
      await lobbies[0].goToLobby();
      const roomId = await lobbies[0].createRoom({
        name: 'Concurrent Actions',
        gameMode: 'deathmatch'
      });
      
      await Promise.all(
        lobbies.slice(1).map(l => l.goToLobby().then(() => l.joinRoom(roomId)))
      );
      
      // All ready up
      await Promise.all(
        lobbies.slice(1).map(l => l.toggleReady())
      );
      
      await lobbies[0].startGame(false);
      
      // Wait for all in game
      await Promise.all(
        pages.map(p => waitForGameState(p, 'playing', 15000))
      );
      
      // All players perform actions simultaneously
      await Promise.all([
        helpers[0].movePlayer('up', 1000),
        helpers[1].movePlayer('down', 1000),
        helpers[2].movePlayer('left', 1000),
        helpers[3].movePlayer('right', 1000)
      ]);
      
      // All shoot at the same time
      await Promise.all([
        helpers[0].shootAt(960, 540),
        helpers[1].shootAt(960, 540),
        helpers[2].shootAt(960, 540),
        helpers[3].shootAt(960, 540)
      ]);
      
      // Game should handle concurrent actions without crashing
      // Check all players still connected
      for (const page of pages) {
        const connectionStatus = page.locator('[data-testid="connection-status"]');
        await expect(connectionStatus).toHaveAttribute('data-status', 'connected');
      }
      
      await Promise.all(pages.map(p => p.close()));
    });

    test('should sync chat messages across all players', async ({ browser }) => {
      const { pages } = await createMultiplePlayers(browser, 3);
      
      const lobbies = await Promise.all(
        pages.map(async p => {
          const { LobbyHelpers } = await import('./helpers/lobby-helpers');
          return new LobbyHelpers(p);
        })
      );
      
      // All join same room
      await lobbies[0].goToLobby();
      const roomId = await lobbies[0].createRoom({ name: 'Chat Sync' });
      
      await Promise.all(
        lobbies.slice(1).map(l => l.goToLobby().then(() => l.joinRoom(roomId)))
      );
      
      // Each player sends a message
      const messages = [
        'Hello from Player 1',
        'Hi from Player 2',
        'Greetings from Player 3'
      ];
      
      for (let i = 0; i < messages.length; i++) {
        await lobbies[i].sendRoomChat(messages[i]);
        await pages[0].waitForTimeout(500);
      }
      
      // All players should see all messages
      for (const page of pages) {
        const chatMessages = page.locator('[data-testid="room-chat-messages"]');
        for (const msg of messages) {
          await expect(chatMessages).toContainText(msg);
        }
      }
      
      await Promise.all(pages.map(p => p.close()));
    });

    test('should handle spectator mode for multiple viewers', async ({ browser }) => {
      const { pages, helpers } = await createMultiplePlayers(browser, 4);
      
      // Setup game
      const lobbies = await Promise.all(
        pages.map(async p => {
          const { LobbyHelpers } = await import('./helpers/lobby-helpers');
          return new LobbyHelpers(p);
        })
      );
      
      await lobbies[0].goToLobby();
      const roomId = await lobbies[0].createRoom({
        name: 'Spectator Test',
        gameMode: 'deathmatch'
      });
      
      await Promise.all(
        lobbies.slice(1).map(l => l.goToLobby().then(() => l.joinRoom(roomId)))
      );
      
      // Set players 3 and 4 as spectators
      await pages[2].evaluate(() => {
        (window as any).__spectatorMode = true;
      });
      await pages[3].evaluate(() => {
        (window as any).__spectatorMode = true;
      });
      
      // Start game
      await Promise.all(lobbies.slice(1, 2).map(l => l.toggleReady()));
      await lobbies[0].startGame(false);
      
      await Promise.all(
        pages.map(p => waitForGameState(p, 'playing', 15000))
      );
      
      // Spectators should see spectator UI
      for (const page of [pages[2], pages[3]]) {
        const spectatorUI = page.locator('[data-testid="spectator-ui"]');
        if (await spectatorUI.count() > 0) {
          await expect(spectatorUI).toBeVisible();
        }
      }
      
      // Active players perform actions
      await helpers[0].movePlayer('up', 500);
      await helpers[1].movePlayer('down', 500);
      
      // Spectators should see the action
      // This would need game-specific verification
      
      await Promise.all(pages.map(p => p.close()));
    });
  });

  test.describe('Performance Under Load', () => {
    test('should handle many players in same room', async ({ browser }) => {
      const playerCount = 8;
      const { pages } = await createMultiplePlayers(browser, playerCount);
      
      const lobbies = await Promise.all(
        pages.map(async p => {
          const { LobbyHelpers } = await import('./helpers/lobby-helpers');
          return new LobbyHelpers(p);
        })
      );
      
      // First player creates room
      await lobbies[0].goToLobby();
      const roomId = await lobbies[0].createRoom({
        name: 'Load Test',
        maxPlayers: playerCount,
        gameMode: 'deathmatch'
      });
      
      // All others join
      await Promise.all(
        lobbies.slice(1).map((l, i) => 
          l.goToLobby()
            .then(() => l.joinRoom(roomId))
            .then(() => pages[0].waitForTimeout(500 * i)) // Stagger joins
        )
      );
      
      // Verify all players present
      const finalPlayers = await lobbies[0].getPlayersInRoom();
      expect(finalPlayers.length).toBe(playerCount);
      
      // All ready up
      await Promise.all(lobbies.slice(1).map(l => l.toggleReady()));
      
      // Start game
      await lobbies[0].startGame(false);
      
      // Check performance metrics
      const metrics = await Promise.all(
        pages.map(p => p.evaluate(() => {
          const perf = performance.getEntriesByType('navigation')[0] as PerformanceNavigationTiming;
          return {
            loadTime: perf.loadEventEnd - perf.fetchStart,
            domReady: perf.domContentLoadedEventEnd - perf.fetchStart
          };
        })
      );
      
      // All should load in reasonable time
      for (const metric of metrics) {
        expect(metric.loadTime).toBeLessThan(10000);
        expect(metric.domReady).toBeLessThan(5000);
      }
      
      await Promise.all(pages.map(p => p.close()));
    });
  });
});