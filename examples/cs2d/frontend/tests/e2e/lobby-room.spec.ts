import { test, expect } from './fixtures/game-fixtures';

// Configure test settings at top level
test.use({ 
  viewport: { width: 1920, height: 1080 },
  video: 'on-first-retry'
});

test.describe('Lobby and Room Management', () => {

  test('should display lobby with available rooms', async ({ page, lobbyHelpers }) => {
    await lobbyHelpers.goToLobby();
    
    // Check lobby UI elements
    await expect(page.locator('[data-testid="lobby-header"]')).toBeVisible();
    await expect(page.locator('[data-testid="room-list"]')).toBeVisible();
    await expect(page.locator('[data-testid="create-room-btn"]')).toBeVisible();
    await expect(page.locator('[data-testid="quick-join-btn"]')).toBeVisible();
    
    // Get available rooms
    const rooms = await lobbyHelpers.getAvailableRooms();
    console.log(`Found ${rooms.length} available rooms`);
    
    // Check connection status
    const status = await lobbyHelpers.checkConnectionStatus();
    expect(status).toBe('connected');
  });

  test('should create a new room with custom settings', async ({ lobbyHelpers }) => {
    await lobbyHelpers.goToLobby();
    
    const roomConfig = {
      name: `Test Room ${Date.now()}`,
      gameMode: 'deathmatch' as const,
      maxPlayers: 10,
      map: 'de_dust2',
      isPrivate: false
    };
    
    const roomId = await lobbyHelpers.createRoom(roomConfig);
    expect(roomId).toBeTruthy();
    
    // Verify room creation
    const roomInfo = await lobbyHelpers.getRoomInfo();
    expect(roomInfo.name).toContain('Test Room');
    expect(roomInfo.mode).toContain('deathmatch');
    expect(roomInfo.map).toContain('dust2');
    expect(roomInfo.maxPlayers).toBe(10);
    
    // Verify player is host
    const players = await lobbyHelpers.getPlayersInRoom();
    expect(players).toHaveLength(1);
    expect(players[0].isHost).toBe(true);
  });

  test('should join an existing room', async ({ browser }) => {
    const context = await browser.newContext();
    
    // Player 1: Create room
    const page1 = await context.newPage();
    const lobby1 = new (await import('./helpers/lobby-helpers')).LobbyHelpers(page1);
    
    await lobby1.goToLobby();
    const roomId = await lobby1.createRoom({
      name: 'Join Test Room',
      gameMode: 'team-deathmatch',
      maxPlayers: 4
    });
    
    // Player 2: Join room
    const page2 = await context.newPage();
    const lobby2 = new (await import('./helpers/lobby-helpers')).LobbyHelpers(page2);
    
    await lobby2.goToLobby();
    await lobby2.joinRoom(roomId);
    
    // Verify both players in room
    const players1 = await lobby1.getPlayersInRoom();
    const players2 = await lobby2.getPlayersInRoom();
    
    expect(players1).toHaveLength(2);
    expect(players2).toHaveLength(2);
    
    // Verify host status
    const host = players1.find(p => p.isHost);
    expect(host).toBeTruthy();
    
    await context.close();
  });

  test('should handle private room with password', async ({ browser }) => {
    const context = await browser.newContext();
    
    // Create private room
    const page1 = await context.newPage();
    const lobby1 = new (await import('./helpers/lobby-helpers')).LobbyHelpers(page1);
    
    await lobby1.goToLobby();
    const roomId = await lobby1.createRoom({
      name: 'Private Room',
      isPrivate: true,
      password: 'secret123'
    });
    
    // Try to join without password (should fail)
    const page2 = await context.newPage();
    const lobby2 = new (await import('./helpers/lobby-helpers')).LobbyHelpers(page2);
    
    await lobby2.goToLobby();
    await page2.goto(`/room/${roomId}`);
    
    // Should see password prompt
    const passwordModal = page2.locator('[data-testid="password-modal"]');
    await expect(passwordModal).toBeVisible();
    
    // Join with correct password
    await lobby2.joinRoom(roomId, 'secret123');
    
    // Verify joined successfully
    const players = await lobby2.getPlayersInRoom();
    expect(players).toHaveLength(2);
    
    await context.close();
  });

  test('should handle ready status and game start', async ({ browser }) => {
    const context = await browser.newContext();
    
    // Create room with 2 players
    const page1 = await context.newPage();
    const page2 = await context.newPage();
    
    const lobby1 = new (await import('./helpers/lobby-helpers')).LobbyHelpers(page1);
    const lobby2 = new (await import('./helpers/lobby-helpers')).LobbyHelpers(page2);
    
    // Player 1 creates room
    await lobby1.goToLobby();
    const roomId = await lobby1.createRoom({
      name: 'Ready Test',
      gameMode: 'deathmatch',
      maxPlayers: 2
    });
    
    // Player 2 joins
    await lobby2.goToLobby();
    await lobby2.joinRoom(roomId);
    
    // Both players ready up
    await lobby1.toggleReady();
    await lobby2.toggleReady();
    
    // Check ready status
    const isReady1 = await lobby1.isReady();
    const isReady2 = await lobby2.isReady();
    
    expect(isReady1).toBe(true);
    expect(isReady2).toBe(true);
    
    // Host starts game
    const startBtn = page1.locator('button').filter({ hasText: /Start Game/i });
    await expect(startBtn).toBeEnabled();
    await startBtn.click();
    
    // Both should navigate to game
    await expect(page1).toHaveURL(/\/game\/[\w-]+/, { timeout: 15000 });
    await expect(page2).toHaveURL(/\/game\/[\w-]+/, { timeout: 15000 });
    
    await context.close();
  });

  test('should handle room settings changes', async ({ lobbyHelpers }) => {
    // Use gameRoom fixture which auto-creates a room
    const _initialInfo = await lobbyHelpers.getRoomInfo();
    
    // Change settings (host only)
    await lobbyHelpers.changeRoomSettings({
      gameMode: 'capture-the-flag',
      map: 'de_inferno',
      maxPlayers: 16
    });
    
    // Verify settings updated
    const updatedInfo = await lobbyHelpers.getRoomInfo();
    expect(updatedInfo.mode).toContain('capture');
    expect(updatedInfo.map).toContain('inferno');
    expect(updatedInfo.maxPlayers).toBe(16);
  });

  test('should handle team selection', async ({ lobbyHelpers }) => {
    // Switch to CT team
    await lobbyHelpers.switchTeam('ct');
    
    // Verify team assignment
    const players = await lobbyHelpers.getPlayersInRoom();
    const currentPlayer = players[0];
    expect(currentPlayer.team).toBe('ct');
    
    // Switch to T team
    await lobbyHelpers.switchTeam('t');
    
    // Verify team changed
    const updatedPlayers = await lobbyHelpers.getPlayersInRoom();
    expect(updatedPlayers[0].team).toBe('t');
  });

  test('should handle room chat', async ({ browser }) => {
    const context = await browser.newContext();
    
    // Setup two players in same room
    const page1 = await context.newPage();
    const page2 = await context.newPage();
    
    const lobby1 = new (await import('./helpers/lobby-helpers')).LobbyHelpers(page1);
    const lobby2 = new (await import('./helpers/lobby-helpers')).LobbyHelpers(page2);
    
    await lobby1.goToLobby();
    const roomId = await lobby1.createRoom({ name: 'Chat Test' });
    
    await lobby2.goToLobby();
    await lobby2.joinRoom(roomId);
    
    // Player 1 sends message
    await lobby1.sendRoomChat('Hello from Player 1!');
    
    // Player 2 should see message
    const chatMessages2 = page2.locator('[data-testid="room-chat-messages"]');
    await expect(chatMessages2).toContainText('Hello from Player 1!');
    
    // Player 2 responds
    await lobby2.sendRoomChat('Hi Player 1!');
    
    // Player 1 should see response
    const chatMessages1 = page1.locator('[data-testid="room-chat-messages"]');
    await expect(chatMessages1).toContainText('Hi Player 1!');
    
    await context.close();
  });

  test('should handle player kick (host only)', async ({ browser }) => {
    const context = await browser.newContext();
    
    // Setup room with host and another player
    const page1 = await context.newPage();
    const page2 = await context.newPage();
    
    const lobby1 = new (await import('./helpers/lobby-helpers')).LobbyHelpers(page1);
    const lobby2 = new (await import('./helpers/lobby-helpers')).LobbyHelpers(page2);
    
    // Set player names
    await page1.evaluate(() => localStorage.setItem('playerName', 'Host'));
    await page2.evaluate(() => localStorage.setItem('playerName', 'Player2'));
    
    await lobby1.goToLobby();
    const roomId = await lobby1.createRoom({ name: 'Kick Test' });
    
    await lobby2.goToLobby();
    await lobby2.joinRoom(roomId);
    
    // Host kicks Player2
    await lobby1.kickPlayer('Player2');
    
    // Player2 should be redirected to lobby
    await expect(page2).toHaveURL(/^\/$|\/lobby/, { timeout: 5000 });
    
    // Room should only have host
    const remainingPlayers = await lobby1.getPlayersInRoom();
    expect(remainingPlayers).toHaveLength(1);
    expect(remainingPlayers[0].name).toBe('Host');
    
    await context.close();
  });

  test('should handle quick join', async ({ page, lobbyHelpers }) => {
    await lobbyHelpers.goToLobby();
    
    // Use quick join
    await lobbyHelpers.quickJoin();
    
    // Should be in a room
    await expect(page).toHaveURL(/\/room\/[\w-]+/);
    
    // Verify in room
    const roomInfo = await lobbyHelpers.getRoomInfo();
    expect(roomInfo.id).toBeTruthy();
    expect(roomInfo.currentPlayers).toBeGreaterThan(0);
  });

  test('should display room info correctly', async ({ page, lobbyHelpers, gameRoom }) => {
    const roomInfo = await lobbyHelpers.getRoomInfo();
    
    // Check all room info is displayed
    expect(roomInfo.id).toBe(gameRoom.roomId);
    expect(roomInfo.name).toBeTruthy();
    expect(roomInfo.mode).toBeTruthy();
    expect(roomInfo.map).toBeTruthy();
    expect(roomInfo.maxPlayers).toBeGreaterThan(0);
    expect(roomInfo.currentPlayers).toBeGreaterThan(0);
    
    // Check UI elements
    await expect(page.locator('[data-testid="room-name"]')).toBeVisible();
    await expect(page.locator('[data-testid="game-mode"]')).toBeVisible();
    await expect(page.locator('[data-testid="selected-map"]')).toBeVisible();
    await expect(page.locator('[data-testid="player-count"]')).toBeVisible();
  });

  test('should handle leaving room', async ({ page, lobbyHelpers, gameRoom }) => {
    // Leave room
    await lobbyHelpers.leaveRoom();
    
    // Should be back in lobby
    await expect(page).toHaveURL(/^\/$|\/lobby/);
    
    // Room should not be in URL
    expect(page.url()).not.toContain(gameRoom.roomId);
  });

  test('should wait for all players ready', async ({ browser }) => {
    const context = await browser.newContext();
    
    // Create room with 3 players
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
    
    // Player 1 creates room
    await lobbies[0].goToLobby();
    const roomId = await lobbies[0].createRoom({
      name: 'Wait Ready Test',
      maxPlayers: 3
    });
    
    // Players 2 and 3 join
    await Promise.all([
      lobbies[1].goToLobby().then(() => lobbies[1].joinRoom(roomId)),
      lobbies[2].goToLobby().then(() => lobbies[2].joinRoom(roomId))
    ]);
    
    // Players ready up one by one
    await lobbies[1].toggleReady();
    await lobbies[2].toggleReady();
    
    // Wait for all ready
    const allReady = await lobbies[0].waitForAllPlayersReady(10000);
    expect(allReady).toBe(true);
    
    // Verify all players show as ready
    const players = await lobbies[0].getPlayersInRoom();
    const readyCount = players.filter(p => p.isReady || p.isHost).length;
    expect(readyCount).toBe(3);
    
    await context.close();
  });
});
