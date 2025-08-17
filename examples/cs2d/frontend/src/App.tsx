import { cn } from '@/utils/tailwind';
import React from 'react';
import { Routes, Route } from 'react-router-dom';

// Lazy load components
const LobbyView = React.lazy(() => import('./views/LobbyView'));
const RoomView = React.lazy(() => import('./views/RoomView'));
const GameView = React.lazy(() => import('./views/GameView'));
const SettingsView = React.lazy(() => import('./views/SettingsView'));
const AboutView = React.lazy(() => import('./views/AboutView'));
const NotFoundView = React.lazy(() => import('./views/NotFoundView'));

// Import new components
import { GameLobby } from './components/GameLobby';
import { ModernGameLobby } from './components/ModernGameLobby';
import { GameRoom } from './components/GameRoom';
import { GameCanvas } from './components/GameCanvas';
import { I18nProvider } from './contexts/I18nContext';

function App() {
  React.useEffect(() => {
    // Set game state for Playwright tests
    (window as any).__gameState = 'ready';
    (window as any).__gameAPI = {
      takeDamage: (amount: number) => console.log(`Taking ${amount} damage`),
      killPlayer: () => console.log('Player killed'),
    };
    console.log('[App] Initialized successfully');
  }, []);
  return (
    <I18nProvider>
      <div className={cn(
        "min-h-screen bg-gradient-to-br from-cs-blue-900 to-cs-gray-900",
        "text-cs-text font-cs antialiased",
        "transition-all duration-300",
        "md:overflow-hidden lg:bg-opacity-95",
        "dark:from-cs-black dark:to-cs-gray-800"
      )}>
        <React.Suspense fallback={
          <div className="flex items-center justify-center min-h-screen">
            <div className="text-lg text-cs-text-muted animate-pulse">
              Loading CS2D...
            </div>
          </div>
        }>
          <Routes>
            <Route path="/" element={<ModernGameLobby />} />
            <Route path="/lobby" element={<ModernGameLobby />} />
            <Route path="/room/:id" element={<GameRoom />} />
            <Route path="/game/:id" element={<GameCanvas />} />
            <Route path="/game" element={<GameCanvas />} />
            <Route path="/settings" element={<SettingsView />} />
            <Route path="/about" element={<AboutView />} />
            <Route path="*" element={<NotFoundView />} />
          </Routes>
        </React.Suspense>
      </div>
    </I18nProvider>
  );
}

export default App;