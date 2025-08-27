import { type Page, expect } from '@playwright/test';

/**
 * Lobby and room helper functions for Playwright tests
 */

export interface RoomConfig {
  name?: string;
  gameMode?: 'deathmatch' | 'team-deathmatch' | 'capture-the-flag' | 'defuse';
  maxPlayers?: number;
  map?: string;
  isPrivate?: boolean;
  password?: string;
}

export interface PlayerInfo {
  id: string;
  name: string;
  isHost: boolean;
  isReady: boolean;
  team?: 'ct' | 't';
}

export class LobbyHelpers {
  constructor(private page: Page) {}

  /**
   * Navigate to lobby
   */
  async goToLobby() {
    await this.page.goto('/lobby');
    // Wait for React app to mount at #root
    await this.page.waitForSelector('#root', { state: 'visible' });
    
    // Wait for page to load
    await this.page.waitForLoadState('networkidle');
    
    // Wait for any lobby indicator (more flexible selector)
    const lobbyTitle = this.page.locator('h1, h2, h3').filter({ hasText: /Lobby|Game|Rooms?|CS2D/i });
    if (await lobbyTitle.count() > 0) {
      await expect(lobbyTitle.first()).toBeVisible({ timeout: 5000 });
    }
  }

  /**
   * Get list of available rooms
   */
  async getAvailableRooms(): Promise<Array<{
    id: string;
    name: string;
    players: string;
    mode: string;
    map: string;
  }>> {
    const roomList = this.page.locator('[data-testid="room-list"]');
    
    if (!(await roomList.isVisible())) {
      return [];
    }
    
    const roomItems = roomList.locator('[data-testid="room-item"]');
    const count = await roomItems.count();
    
    const rooms = [];
    for (let i = 0; i < count; i++) {
      const room = roomItems.nth(i);
      
      rooms.push({
        id: await room.getAttribute('data-room-id') || '',
        name: await room.locator('[data-testid="room-name"]').textContent() || '',
        players: await room.locator('[data-testid="room-players"]').textContent() || '',
        mode: await room.locator('[data-testid="room-mode"]').textContent() || '',
        map: await room.locator('[data-testid="room-map"]').textContent() || ''
      });
    }
    
    return rooms;
  }

  /**
   * Create a new room
   */
  async createRoom(config: RoomConfig = {}): Promise<string> {
    const createRoomBtn = this.page.locator('button').filter({ hasText: /Create Room|New Game/i });
    await expect(createRoomBtn).toBeVisible();
    await createRoomBtn.click();
    
    // Wait for room creation modal/form
    const roomForm = this.page.locator('[data-testid="room-creation-form"]');
    
    if (await roomForm.isVisible()) {
      // Fill room name
      if (config.name) {
        const nameInput = this.page.locator('input[name="roomName"]');
        await nameInput.fill(config.name);
      }
      
      // Select game mode
      if (config.gameMode) {
        const modeSelect = this.page.locator('select[name="gameMode"]');
        await modeSelect.selectOption(config.gameMode);
      }
      
      // Set max players
      if (config.maxPlayers) {
        const maxPlayersInput = this.page.locator('input[name="maxPlayers"]');
        await maxPlayersInput.fill(config.maxPlayers.toString());
      }
      
      // Select map
      if (config.map) {
        const mapSelect = this.page.locator('select[name="map"]');
        await mapSelect.selectOption(config.map);
      }
      
      // Set privacy
      if (config.isPrivate) {
        const privateCheckbox = this.page.locator('input[name="isPrivate"]');
        await privateCheckbox.check();
        
        if (config.password) {
          const passwordInput = this.page.locator('input[name="password"]');
          await passwordInput.fill(config.password);
        }
      }
      
      // Submit form
      const submitBtn = this.page.locator('button[type="submit"]').filter({ hasText: /Create|Start/i });
      await submitBtn.click();
    }
    
    // Wait for navigation to room
    await this.page.waitForURL(/\/room\/[\w-]+/, { timeout: 10000 });
    
    // Extract room ID from URL
    const roomUrl = this.page.url();
    const roomId = roomUrl.match(/\/room\/([\w-]+)/)?.[1] || '';
    
    return roomId;
  }

  /**
   * Join a specific room
   */
  async joinRoom(roomId: string, password?: string) {
    // Navigate directly to room URL
    await this.page.goto(`/room/${roomId}`);
    
    // Handle password prompt if needed
    if (password) {
      const passwordModal = this.page.locator('[data-testid="password-modal"]');
      
      if (await passwordModal.isVisible()) {
        const passwordInput = passwordModal.locator('input[type="password"]');
        await passwordInput.fill(password);
        
        const joinBtn = passwordModal.locator('button').filter({ hasText: /Join|Enter/i });
        await joinBtn.click();
      }
    }
    
    // Wait for room to load
    await this.page.waitForSelector('[data-testid="room-info"]');
  }

  /**
   * Quick join any available room
   */
  async quickJoin() {
    const quickJoinBtn = this.page.locator('button').filter({ hasText: /Quick Join|Play Now/i });
    
    if (await quickJoinBtn.isVisible()) {
      await quickJoinBtn.click();
      await this.page.waitForURL(/\/room\/[\w-]+/, { timeout: 10000 });
    } else {
      // Join first available room
      const rooms = await this.getAvailableRooms();
      
      if (rooms.length > 0) {
        await this.joinRoom(rooms[0].id);
      } else {
        // Create new room if none available
        await this.createRoom();
      }
    }
  }

  /**
   * Get current room info
   */
  async getRoomInfo(): Promise<{
    id: string;
    name: string;
    mode: string;
    map: string;
    maxPlayers: number;
    currentPlayers: number;
  }> {
    const roomInfo = this.page.locator('[data-testid="room-info"]');
    await expect(roomInfo).toBeVisible();
    
    return {
      id: await roomInfo.getAttribute('data-room-id') || '',
      name: await roomInfo.locator('[data-testid="room-name"]').textContent() || '',
      mode: await roomInfo.locator('[data-testid="game-mode"]').textContent() || '',
      map: await roomInfo.locator('[data-testid="selected-map"]').textContent() || '',
      maxPlayers: parseInt(await roomInfo.getAttribute('data-max-players') || '8', 10),
      currentPlayers: parseInt(await roomInfo.getAttribute('data-current-players') || '1', 10)
    };
  }

  /**
   * Get list of players in room
   */
  async getPlayersInRoom(): Promise<PlayerInfo[]> {
    const playerList = this.page.locator('[data-testid="player-list"]');
    const playerItems = playerList.locator('[data-testid="player-item"]');
    
    const count = await playerItems.count();
    const players: PlayerInfo[] = [];
    
    for (let i = 0; i < count; i++) {
      const player = playerItems.nth(i);
      
      players.push({
        id: await player.getAttribute('data-player-id') || '',
        name: await player.locator('[data-testid="player-name"]').textContent() || '',
        isHost: (await player.locator('[data-testid="host-badge"]').count()) > 0,
        isReady: (await player.locator('[data-testid="ready-indicator"]').count()) > 0,
        team: await player.getAttribute('data-team') as 'ct' | 't' | undefined
      });
    }
    
    return players;
  }

  /**
   * Toggle ready status
   */
  async toggleReady() {
    const readyBtn = this.page.locator('button').filter({ hasText: /Ready|Not Ready/i });
    await readyBtn.click();
    
    // Wait for status update
    await this.page.waitForTimeout(500);
  }

  /**
   * Check if current player is ready
   */
  async isReady(): Promise<boolean> {
    const readyBtn = this.page.locator('button').filter({ hasText: /Ready|Not Ready/i });
    const btnText = await readyBtn.textContent();
    
    return btnText?.includes('Not Ready') || btnText?.includes('Cancel') || false;
  }

  /**
   * Start game (host only)
   */
  async startGame(forceStart: boolean = false) {
    const startBtn = this.page.locator('button').filter({ hasText: /Start Game|Begin/i });
    
    if (await startBtn.isEnabled()) {
      await startBtn.click();
    } else if (forceStart) {
      // Try force start for testing
      const forceBtn = this.page.locator('button').filter({ hasText: /Start Anyway|Force Start|Practice/i });
      
      if (await forceBtn.isVisible()) {
        await forceBtn.click();
      }
    }
    
    // Wait for game to start
    await this.page.waitForURL(/\/game\/[\w-]+/, { timeout: 15000 });
  }

  /**
   * Leave current room
   */
  async leaveRoom() {
    const leaveBtn = this.page.locator('button').filter({ hasText: /Leave Room|Back to Lobby/i });
    await leaveBtn.click();
    
    // Confirm if prompted
    const confirmBtn = this.page.locator('button').filter({ hasText: /Confirm|Yes/i });
    if (await confirmBtn.isVisible()) {
      await confirmBtn.click();
    }
    
    // Wait for return to lobby
    await this.page.waitForURL(/^\/$|\/lobby/, { timeout: 10000 });
  }

  /**
   * Change room settings (host only)
   */
  async changeRoomSettings(settings: Partial<RoomConfig>) {
    const settingsBtn = this.page.locator('button').filter({ hasText: /Room Settings|Configure/i });
    
    if (await settingsBtn.isVisible()) {
      await settingsBtn.click();
      
      const settingsModal = this.page.locator('[data-testid="room-settings-modal"]');
      await expect(settingsModal).toBeVisible();
      
      // Update settings
      if (settings.gameMode) {
        const modeSelect = settingsModal.locator('select[name="gameMode"]');
        await modeSelect.selectOption(settings.gameMode);
      }
      
      if (settings.map) {
        const mapSelect = settingsModal.locator('select[name="map"]');
        await mapSelect.selectOption(settings.map);
      }
      
      if (settings.maxPlayers) {
        const maxPlayersInput = settingsModal.locator('input[name="maxPlayers"]');
        await maxPlayersInput.fill(settings.maxPlayers.toString());
      }
      
      // Save settings
      const saveBtn = settingsModal.locator('button').filter({ hasText: /Save|Apply/i });
      await saveBtn.click();
    }
  }

  /**
   * Switch team
   */
  async switchTeam(team: 'ct' | 't' | 'auto') {
    const teamBtn = this.page.locator(`button[data-team="${team}"]`);
    
    if (await teamBtn.isVisible()) {
      await teamBtn.click();
    } else {
      // Try team selection dropdown
      const teamSelect = this.page.locator('select[name="team"]');
      if (await teamSelect.isVisible()) {
        await teamSelect.selectOption(team);
      }
    }
    
    // Wait for team update
    await this.page.waitForTimeout(500);
  }

  /**
   * Send room chat message
   */
  async sendRoomChat(message: string) {
    const chatInput = this.page.locator('input[data-testid="room-chat-input"]');
    await chatInput.fill(message);
    await chatInput.press('Enter');
    
    // Verify message appears
    const chatMessages = this.page.locator('[data-testid="room-chat-messages"]');
    await expect(chatMessages).toContainText(message);
  }

  /**
   * Kick player (host only)
   */
  async kickPlayer(playerName: string) {
    const playerItem = this.page.locator(`[data-testid="player-item"]`).filter({ hasText: playerName });
    const kickBtn = playerItem.locator('button').filter({ hasText: /Kick/i });
    
    if (await kickBtn.isVisible()) {
      await kickBtn.click();
      
      // Confirm kick
      const confirmBtn = this.page.locator('button').filter({ hasText: /Confirm|Yes/i });
      if (await confirmBtn.isVisible()) {
        await confirmBtn.click();
      }
    }
  }

  /**
   * Check WebSocket connection status
   */
  async checkConnectionStatus(): Promise<'connected' | 'disconnected' | 'connecting'> {
    const connectionStatus = this.page.locator('[data-testid="connection-status"]');
    const status = await connectionStatus.getAttribute('data-status');
    
    return status as 'connected' | 'disconnected' | 'connecting';
  }

  /**
   * Wait for all players to be ready
   */
  async waitForAllPlayersReady(timeout: number = 30000) {
    const startTime = Date.now();
    
    while (Date.now() - startTime < timeout) {
      const players = await this.getPlayersInRoom();
      const allReady = players.every(p => p.isReady || p.isHost);
      
      if (allReady && players.length > 1) {
        return true;
      }
      
      await this.page.waitForTimeout(1000);
    }
    
    throw new Error('Timeout waiting for all players to be ready');
  }
}