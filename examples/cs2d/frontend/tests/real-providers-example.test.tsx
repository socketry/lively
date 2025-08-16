import React from 'react';
import { render, screen, fireEvent, waitFor } from './test-utils';
import { renderWithRoute, triggerAppEvents } from './test-utils';
import { useApp } from '@/contexts/AppContext';
import { useAuth } from '@/contexts/AuthContext';
import { useGame } from '@/contexts/GameContext';
import { useWebSocketStore } from '@/contexts/WebSocketContext';

// Example component that uses multiple real contexts
const MultiContextComponent: React.FC = () => {
  const { state: appState, actions: appActions } = useApp();
  const { state: authState, actions: authActions } = useAuth();
  const { state: gameState, actions: gameActions } = useGame();
  const { state: wsState, actions: wsActions } = useWebSocketStore();

  return (
    <div>
      <h1>Real Context Integration Test</h1>
      
      {/* App Context */}
      <div data-testid="app-info">
        <p>Theme: {appState.theme}</p>
        <p>Language: {appState.language}</p>
        <p>Online: {appState.online ? 'Yes' : 'No'}</p>
        <p>Loading: {appState.loading ? 'Yes' : 'No'}</p>
        <button onClick={() => appActions.setTheme('light')}>Switch to Light</button>
        <button onClick={() => appActions.setLanguage('zh-TW')}>Switch to Chinese</button>
        <button onClick={() => appActions.addNotification({ type: 'info', title: 'Test', message: 'Test notification' })}>
          Add Notification
        </button>
      </div>

      {/* Auth Context */}
      <div data-testid="auth-info">
        <p>Authenticated: {authState.player ? 'Yes' : 'No'}</p>
        <p>Player Name: {authState.player?.name || 'None'}</p>
        <p>Is Guest: {authState.isGuest ? 'Yes' : 'No'}</p>
        <button onClick={() => authActions.initializePlayer('TestPlayer')}>Initialize Player</button>
        <button onClick={() => authActions.setPlayerReady(true)}>Set Ready</button>
      </div>

      {/* Game Context */}
      <div data-testid="game-info">
        <p>Game Status: {gameState.gameStatus}</p>
        <p>Room ID: {gameState.currentRoomId || 'None'}</p>
        <p>Player Count: {gameState.players.size}</p>
        <button onClick={() => gameActions.initializeGame('test-room-123')}>Initialize Game</button>
        <button onClick={() => gameActions.updatePerformanceMetrics({ fps: 60, ping: 50, packetLoss: 0 })}>
          Update Performance
        </button>
      </div>

      {/* WebSocket Context */}
      <div data-testid="websocket-info">
        <p>Connection Status: {wsState.connectionStatus.status}</p>
        <p>Reconnect Attempts: {wsState.connectionStatus.reconnectAttempts}</p>
        <p>Message Count: {wsState.messageHistory.length}</p>
        <button onClick={() => wsActions.setConnectionStatus('connected')}>Connect</button>
        <button onClick={() => wsActions.addMessage({ type: 'test', data: 'test message' })}>Add Message</button>
      </div>

      {/* Notifications */}
      <div data-testid="notifications">
        {appState.notifications.map(notification => (
          <div key={notification.id} className="notification">
            {notification.title}: {notification.message}
          </div>
        ))}
      </div>
    </div>
  );
};

describe('Real Context Providers Integration', () => {
  it('should provide working AppContext without mocks', async () => {
    render(<MultiContextComponent />);
    
    // Test initial state
    expect(screen.getByText('Theme: dark')).toBeInTheDocument();
    expect(screen.getByText('Language: en')).toBeInTheDocument();
    expect(screen.getByText('Online: Yes')).toBeInTheDocument();
    expect(screen.getByText('Loading: No')).toBeInTheDocument();

    // Test theme switching
    fireEvent.click(screen.getByText('Switch to Light'));
    expect(screen.getByText('Theme: light')).toBeInTheDocument();

    // Test language switching
    fireEvent.click(screen.getByText('Switch to Chinese'));
    expect(screen.getByText('Language: zh-TW')).toBeInTheDocument();

    // Test notification system
    fireEvent.click(screen.getByText('Add Notification'));
    await waitFor(() => {
      expect(screen.getByText('Test: Test notification')).toBeInTheDocument();
    });
  });

  it('should provide working AuthContext without mocks', async () => {
    render(<MultiContextComponent />);
    
    // Test initial state
    expect(screen.getByText('Authenticated: No')).toBeInTheDocument();
    expect(screen.getByText('Player Name: None')).toBeInTheDocument();
    expect(screen.getByText('Is Guest: No')).toBeInTheDocument();

    // Test player initialization
    fireEvent.click(screen.getByText('Initialize Player'));
    
    await waitFor(() => {
      expect(screen.getByText('Authenticated: Yes')).toBeInTheDocument();
      expect(screen.getByText('Player Name: TestPlayer')).toBeInTheDocument();
      expect(screen.getByText('Is Guest: Yes')).toBeInTheDocument();
    });

    // Test player ready state
    fireEvent.click(screen.getByText('Set Ready'));
    // Player ready state would be reflected in the player object
  });

  it('should provide working GameContext without mocks', () => {
    render(<MultiContextComponent />);
    
    // Test initial state
    expect(screen.getByText('Game Status: idle')).toBeInTheDocument();
    expect(screen.getByText('Room ID: None')).toBeInTheDocument();
    expect(screen.getByText('Player Count: 0')).toBeInTheDocument();

    // Test game initialization
    fireEvent.click(screen.getByText('Initialize Game'));
    expect(screen.getByText('Game Status: loading')).toBeInTheDocument();
    expect(screen.getByText('Room ID: test-room-123')).toBeInTheDocument();

    // Test performance metrics
    fireEvent.click(screen.getByText('Update Performance'));
    // Performance metrics would be updated in the context
  });

  it('should provide working WebSocketContext without mocks', () => {
    render(<MultiContextComponent />);
    
    // Test initial state
    expect(screen.getByText('Connection Status: disconnected')).toBeInTheDocument();
    expect(screen.getByText('Reconnect Attempts: 0')).toBeInTheDocument();
    expect(screen.getByText('Message Count: 0')).toBeInTheDocument();

    // Test connection status change
    fireEvent.click(screen.getByText('Connect'));
    expect(screen.getByText('Connection Status: connected')).toBeInTheDocument();

    // Test message handling
    fireEvent.click(screen.getByText('Add Message'));
    expect(screen.getByText('Message Count: 1')).toBeInTheDocument();
  });

  it('should handle real app events through triggerAppEvents helper', async () => {
    render(<MultiContextComponent />);
    
    // Initially online
    expect(screen.getByText('Online: Yes')).toBeInTheDocument();

    // Simulate going offline
    triggerAppEvents.goOffline();
    
    // AppProvider listens to 'offline' events and updates state
    await waitFor(() => {
      expect(screen.getByText('Online: No')).toBeInTheDocument();
    });

    // Simulate going back online
    triggerAppEvents.goOnline();
    
    await waitFor(() => {
      expect(screen.getByText('Online: Yes')).toBeInTheDocument();
    });
  });

  it('should persist settings to localStorage using real AppProvider', () => {
    render(<MultiContextComponent />);
    
    // Change settings
    fireEvent.click(screen.getByText('Switch to Light'));
    fireEvent.click(screen.getByText('Switch to Chinese'));
    
    // Verify localStorage is used (AppProvider saves settings)
    expect(localStorage.getItem('cs2d_app_settings')).toBeTruthy();
    
    const savedSettings = JSON.parse(localStorage.getItem('cs2d_app_settings') || '{}');
    expect(savedSettings.theme).toBe('light');
    expect(savedSettings.language).toBe('zh-TW');
  });

  it('should work with router navigation using renderWithRoute helper', () => {
    renderWithRoute(<MultiContextComponent />, '/game/room-123');
    
    // Component should render with all contexts working
    expect(screen.getByText('Real Context Integration Test')).toBeInTheDocument();
    expect(screen.getByTestId('app-info')).toBeInTheDocument();
    expect(screen.getByTestId('auth-info')).toBeInTheDocument();
    expect(screen.getByTestId('game-info')).toBeInTheDocument();
    expect(screen.getByTestId('websocket-info')).toBeInTheDocument();
  });

  it('should demonstrate real provider state persistence across renders', async () => {
    const { rerender } = render(<MultiContextComponent />);
    
    // Set up initial state
    fireEvent.click(screen.getByText('Initialize Player'));
    fireEvent.click(screen.getByText('Switch to Light'));
    fireEvent.click(screen.getByText('Connect'));
    
    await waitFor(() => {
      expect(screen.getByText('Authenticated: Yes')).toBeInTheDocument();
      expect(screen.getByText('Theme: light')).toBeInTheDocument();
      expect(screen.getByText('Connection Status: connected')).toBeInTheDocument();
    });

    // Rerender the component - state should persist because providers are real
    rerender(<MultiContextComponent />);
    
    // State should still be there
    expect(screen.getByText('Authenticated: Yes')).toBeInTheDocument();
    expect(screen.getByText('Theme: light')).toBeInTheDocument();
    expect(screen.getByText('Connection Status: connected')).toBeInTheDocument();
  });
});