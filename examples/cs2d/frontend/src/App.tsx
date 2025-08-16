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

function App() {
  return (
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
          <Route path="/" element={<LobbyView />} />
          <Route path="/room/:id" element={<RoomView />} />
          <Route path="/game/:id" element={<GameView />} />
          <Route path="/settings" element={<SettingsView />} />
          <Route path="/about" element={<AboutView />} />
          <Route path="*" element={<NotFoundView />} />
        </Routes>
      </React.Suspense>
    </div>
  );
}

export default App;