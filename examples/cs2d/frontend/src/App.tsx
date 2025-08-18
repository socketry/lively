import { cn } from '@/utils/tailwind';
import React from 'react';
import { Routes, Route } from 'react-router-dom';

// Lazy load pages used below
const SettingsView = React.lazy(() => import('./views/SettingsView'));
const AboutView = React.lazy(() => import('./views/AboutView'));
const NotFoundView = React.lazy(() => import('./views/NotFoundView'));

// Import new components
import { ModernGameLobby } from './components/ModernGameLobby';
import { EnhancedModernLobby } from './components/EnhancedModernLobby';
import { EnhancedWaitingRoom } from './components/EnhancedWaitingRoom';
import { GameRoom } from './components/GameRoom';
import { GameCanvas } from './components/GameCanvas';
import { I18nProvider } from './contexts/I18nContext';

// Import pixel components
import { PixelGameLobby } from './components/pixel/PixelGameLobby';
import { PixelWaitingRoom } from './components/pixel/PixelWaitingRoom';

// Import pixel styles
import './styles/pixel.css';
import './styles/enhanced-pixel.css';

function App() {
  React.useEffect(() => {
    // Set game state for Playwright tests
    (window as unknown as Window & {
      __gameState: string;
      __gameAPI: { takeDamage: (amount: number) => void; killPlayer: () => void };
    }).__gameState = 'ready';

    (window as unknown as Window & {
      __gameAPI: { takeDamage: (amount: number) => void; killPlayer: () => void };
    }).__gameAPI = {
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
            {/* Enhanced Modern UI Routes (Default) */}
            <Route path="/" element={<EnhancedModernLobby />} />
            <Route path="/lobby" element={<EnhancedModernLobby />} />
            <Route path="/room/:id" element={<EnhancedWaitingRoom roomId={window.location.pathname.split('/').pop() || '1'} />} />
            <Route path="/game/:id" element={<GameCanvas />} />
            <Route path="/game" element={<GameCanvas />} />
            
            {/* Legacy Modern UI Routes */}
            <Route path="/legacy" element={<ModernGameLobby />} />
            <Route path="/legacy/room/:id" element={<GameRoom />} />
            
            {/* Pixel UI Routes */}
            <Route path="/pixel" element={<PixelGameLobby />} />
            <Route path="/pixel/lobby" element={<PixelGameLobby />} />
            <Route path="/pixel/room/:id" element={<PixelWaitingRoom />} />
            <Route path="/pixel/game/:id" element={<GameCanvas />} />
            <Route path="/pixel/game" element={<GameCanvas />} />
            
            {/* Other Routes */}
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
