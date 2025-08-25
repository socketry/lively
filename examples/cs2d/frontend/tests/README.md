# Testing with Real Context Providers

This project uses **real context providers** in tests instead of mocks, ensuring that tests verify actual behavior rather than mocked behavior.

## Overview

The `test-utils.tsx` file provides a testing environment with:
- **Real AppProvider**: Manages app state, themes, notifications, and settings
- **Real AuthProvider**: Handles player authentication and user management
- **Real GameProvider**: Manages game state, player actions, and game logic  
- **Real WebSocketProvider**: Handles connection status and messaging
- **MemoryRouter**: For testing routing functionality

## Key Benefits

✅ **Tests actual behavior** - No mocks means tests verify real functionality  
✅ **Catches integration issues** - Tests how contexts work together  
✅ **Validates state persistence** - Tests localStorage, settings, and state management  
✅ **Realistic test environment** - Closer to production behavior  

## Basic Usage

```tsx
import { render, screen } from './test-utils';
import MyComponent from '@/components/MyComponent';

describe('MyComponent', () => {
  it('should work with real contexts', () => {
    render(<MyComponent />);
    
    // All contexts are available and working
    expect(screen.getByText('Some content')).toBeInTheDocument();
  });
});
```

## Advanced Usage

### Testing with Specific Routes

```tsx
import { renderWithRoute, renderWithRoutes } from './test-utils';

// Render with a specific route
renderWithRoute(<MyComponent />, '/game/room-123');

// Render with multiple routes for navigation testing
renderWithRoutes(<MyComponent />, ['/lobby', '/game', '/settings'], 1); // Start at /game
```

### Testing App Events

```tsx
import { triggerAppEvents } from './test-utils';

it('should handle going offline', async () => {
  render(<MyComponent />);
  
  // Trigger real app events (properly wrapped in act())
  triggerAppEvents.goOffline();
  
  await waitFor(() => {
    expect(screen.getByText('Offline')).toBeInTheDocument();
  });
  
  triggerAppEvents.goOnline();
  
  await waitFor(() => {
    expect(screen.getByText('Online')).toBeInTheDocument();
  });
});
```

### Accessing Real Context Values

```tsx
import { useApp, useAuth, useGame } from '@/contexts';

const TestComponent = () => {
  const { state, actions } = useApp();
  const { computed } = useAuth();
  
  return (
    <div>
      <p>Theme: {state.theme}</p>
      <p>Authenticated: {computed.isAuthenticated ? 'Yes' : 'No'}</p>
      <button onClick={() => actions.setTheme('light')}>Switch Theme</button>
    </div>
  );
};

it('should access real context values', () => {
  render(<TestComponent />);
  
  expect(screen.getByText('Theme: dark')).toBeInTheDocument();
  
  fireEvent.click(screen.getByText('Switch Theme'));
  expect(screen.getByText('Theme: light')).toBeInTheDocument();
});
```

### Testing State Persistence

```tsx
it('should persist settings to localStorage', () => {
  render(<MyComponent />);
  
  // Change a setting
  fireEvent.click(screen.getByText('Switch to Light Theme'));
  
  // Verify real localStorage usage
  const savedSettings = JSON.parse(localStorage.getItem('cs2d_app_settings') || '{}');
  expect(savedSettings.theme).toBe('light');
});
```

### Testing Multiple Contexts Together

```tsx
const MultiContextComponent = () => {
  const { actions: appActions } = useApp();
  const { actions: authActions, computed } = useAuth();
  const { actions: gameActions, state } = useGame();
  
  const handleStartGame = async () => {
    await authActions.initializePlayer('TestPlayer');
    gameActions.initializeGame('room-123');
    appActions.setTitle('CS2D - In Game');
  };
  
  return (
    <div>
      <p>Player: {computed.playerName}</p>
      <p>Game Status: {state.gameStatus}</p>
      <button onClick={handleStartGame}>Start Game</button>
    </div>
  );
};

it('should handle multiple context interactions', async () => {
  render(<MultiContextComponent />);
  
  fireEvent.click(screen.getByText('Start Game'));
  
  await waitFor(() => {
    expect(screen.getByText('Player: TestPlayer')).toBeInTheDocument();
    expect(screen.getByText('Game Status: loading')).toBeInTheDocument();
  });
});
```

## Test Environment Setup

The `setup.ts` file provides:

- **Environment mocks**: `matchMedia`, `IntersectionObserver`, `ResizeObserver`
- **Browser API mocks**: `requestFullscreen`, `navigator.onLine`, `document.hidden`
- **Test cleanup**: Clears localStorage and sessionStorage between tests
- **Error suppression**: Reduces noise from expected provider errors
- **Vite environment**: Sets up `import.meta.env` for testing

## File Structure

```
tests/
├── setup.ts                    # Test environment configuration
├── test-utils.tsx              # Real provider wrapper and helpers
├── real-providers-example.test.tsx # Complete integration example
├── README.md                   # This documentation
└── [component].test.tsx        # Individual component tests
```

## Available Helper Functions

### From `test-utils.tsx`:

- `render()` - Custom render with all real providers
- `renderWithRoute(ui, route)` - Render with specific route
- `renderWithRoutes(ui, routes, initialIndex)` - Render with multiple routes
- `triggerAppEvents.goOnline()` - Simulate going online
- `triggerAppEvents.goOffline()` - Simulate going offline
- `triggerAppEvents.enterFullscreen()` - Simulate entering fullscreen
- `triggerAppEvents.exitFullscreen()` - Simulate exiting fullscreen
- `triggerAppEvents.hideDocument()` - Simulate tab/window hiding
- `triggerAppEvents.showDocument()` - Simulate tab/window showing

## Common Test Patterns

### Testing Theme Changes

```tsx
it('should switch themes', () => {
  render(<ThemeComponent />);
  
  expect(screen.getByText('Theme: dark')).toBeInTheDocument();
  fireEvent.click(screen.getByText('Switch to Light'));
  expect(screen.getByText('Theme: light')).toBeInTheDocument();
});
```

### Testing Notifications

```tsx
it('should show notifications', async () => {
  render(<NotificationComponent />);
  
  fireEvent.click(screen.getByText('Add Notification'));
  
  await waitFor(() => {
    expect(screen.getByText('Test notification')).toBeInTheDocument();
  });
});
```

### Testing Game State

```tsx
it('should initialize game', () => {
  render(<GameComponent />);
  
  fireEvent.click(screen.getByText('Start Game'));
  
  expect(screen.getByText('Game Status: loading')).toBeInTheDocument();
});
```

### Testing WebSocket Connection

```tsx
it('should handle connection status', () => {
  render(<ConnectionComponent />);
  
  expect(screen.getByText('Status: disconnected')).toBeInTheDocument();
  
  fireEvent.click(screen.getByText('Connect'));
  expect(screen.getByText('Status: connected')).toBeInTheDocument();
});
```

## Best Practices

1. **Use real providers** - Don't mock contexts unless absolutely necessary
2. **Test integration** - Verify how multiple contexts work together
3. **Test side effects** - Verify localStorage, event listeners, etc.
4. **Use act() for events** - Already handled in `triggerAppEvents`
5. **Clean state** - Tests automatically clean localStorage between runs
6. **Test realistic scenarios** - Use real user flows and interactions

## Migration from Mocks

If you have existing tests with mocked contexts:

1. Remove mock implementations
2. Import from `./test-utils` instead of `@testing-library/react`
3. Test actual behavior instead of mock calls
4. Use real context hooks for assertions
5. Test side effects like localStorage

## Example: Complete Integration Test

See `real-providers-example.test.tsx` for a comprehensive example showing:
- All four contexts working together
- Real state management and persistence
- Event handling and side effects
- Router integration
- Helper function usage

This approach ensures your tests verify actual application behavior and catch real integration issues.