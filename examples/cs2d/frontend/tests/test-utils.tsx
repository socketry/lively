import React, { type ReactElement } from 'react';
import { render, type RenderOptions, act } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { WebSocketProvider } from '@/contexts/WebSocketContext';
import { AppProvider } from '@/contexts/AppContext';
import { GameProvider } from '@/contexts/GameContext';
import { AuthProvider } from '@/contexts/AuthContext';

// Provider wrapper for tests with real contexts (no mocks)
interface AllProvidersProps {
  children: React.ReactNode;
  initialEntries?: string[];
  initialIndex?: number;
}

const AllProviders: React.FC<AllProvidersProps> = ({ 
  children, 
  initialEntries = ['/'], 
  initialIndex = 0 
}) => {
  return (
    <MemoryRouter 
      initialEntries={initialEntries} 
      initialIndex={initialIndex}
      future={{
        v7_startTransition: true,
        v7_relativeSplatPath: true
      }}
    >
      <AppProvider>
        <AuthProvider>
          <WebSocketProvider>
            <GameProvider>
              {children}
            </GameProvider>
          </WebSocketProvider>
        </AuthProvider>
      </AppProvider>
    </MemoryRouter>
  );
};

interface CustomRenderOptions extends Omit<RenderOptions, 'wrapper'> {
  initialEntries?: string[];
  initialIndex?: number;
}

const customRender = (
  ui: ReactElement,
  options?: CustomRenderOptions
) => {
  const { initialEntries, initialIndex, ...renderOptions } = options || {};
  
  const Wrapper: React.FC<{ children: React.ReactNode }> = ({ children }) => (
    <AllProviders initialEntries={initialEntries} initialIndex={initialIndex}>
      {children}
    </AllProviders>
  );

  return render(ui, { wrapper: Wrapper, ...renderOptions });
};

// Export everything from @testing-library/react
export * from '@testing-library/react';

// Export our custom render function
export { customRender as render };

// Export the AllProviders component for advanced testing scenarios
export { AllProviders };

// Helper functions for testing with real providers

/**
 * Render component with specific route for router testing
 */
export const renderWithRoute = (ui: ReactElement, route: string = '/') => {
  return customRender(ui, { initialEntries: [route] });
};

/**
 * Render component with multiple routes for testing navigation
 */
export const renderWithRoutes = (ui: ReactElement, routes: string[], initialIndex: number = 0) => {
  return customRender(ui, { initialEntries: routes, initialIndex });
};

/**
 * Helper to get real context values in tests (useful for debugging and assertions)
 */
export const getContextValues = () => {
  // Note: These would need to be imported in the test file where used
  return {
    // Example usage in test:
    // const { useApp, useAuth, useGame, useWebSocketStore } = await import('@/contexts');
    // const appContext = useApp();
    info: 'Import context hooks directly in your test files to access real values'
  };
};

/**
 * Helper to trigger common app events for testing with proper act() wrapping
 */
export const triggerAppEvents = {
  goOnline: () => {
    act(() => {
      Object.defineProperty(navigator, 'onLine', { value: true, writable: true });
      window.dispatchEvent(new Event('online'));
    });
  },
  goOffline: () => {
    act(() => {
      Object.defineProperty(navigator, 'onLine', { value: false, writable: true });
      window.dispatchEvent(new Event('offline'));
    });
  },
  enterFullscreen: () => {
    act(() => {
      Object.defineProperty(document, 'fullscreenElement', { value: document.documentElement, writable: true });
      document.dispatchEvent(new Event('fullscreenchange'));
    });
  },
  exitFullscreen: () => {
    act(() => {
      Object.defineProperty(document, 'fullscreenElement', { value: null, writable: true });
      document.dispatchEvent(new Event('fullscreenchange'));
    });
  },
  hideDocument: () => {
    act(() => {
      Object.defineProperty(document, 'hidden', { value: true, writable: true });
      document.dispatchEvent(new Event('visibilitychange'));
    });
  },
  showDocument: () => {
    act(() => {
      Object.defineProperty(document, 'hidden', { value: false, writable: true });
      document.dispatchEvent(new Event('visibilitychange'));
    });
  }
};