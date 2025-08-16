import React from 'react';
import { BrowserRouter as Router, Routes, Route } from 'react-router-dom';
import { AppProvider } from './contexts/AppContext';
import { AuthProvider } from './contexts/AuthContext';
import { WebSocketProvider } from './contexts/WebSocketContext';
import { GameProvider } from './contexts/GameContext';

// Lazy load components
const LobbyView = React.lazy(() => import('./views/LobbyView'));
const RoomView = React.lazy(() => import('./views/RoomView'));
const GameView = React.lazy(() => import('./views/GameView'));
const SettingsView = React.lazy(() => import('./views/SettingsView'));
const AboutView = React.lazy(() => import('./views/AboutView'));
const NotFoundView = React.lazy(() => import('./views/NotFoundView'));

function App() {
  return (
    <AppProvider>
      <AuthProvider>
        <WebSocketProvider>
          <GameProvider>
            <Router>
              <div className="app">
                <React.Suspense fallback={<div>Loading...</div>}>
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
            </Router>
          </GameProvider>
        </WebSocketProvider>
      </AuthProvider>
    </AppProvider>
  );
}

export default App;