import React, { useEffect, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useI18n } from '../contexts/I18nContext';
import { LanguageSwitcher } from './LanguageSwitcher';
import { LobbySkeletonGrid } from './common/SkeletonLoader';
import { setupWebSocket } from '@/services/websocket';
import {
  ARIA_LABELS,
  KEYBOARD_KEYS,
  isActionKey,
  handleEscapeKey,
  createButtonProps,
  createListProps,
  createListItemProps,
  focusUtils,
  announceToScreenReader
} from '@/utils/accessibility';

interface Room {
  id: string;
  name: string;
  players: number;
  maxPlayers: number;
  mode: string;
  map: string;
  status: 'waiting' | 'playing';
  ping: number;
  hasPassword: boolean;
  bots: number;
  botDifficulty: 'easy' | 'normal' | 'hard' | 'expert';
}


export const EnhancedModernLobby: React.FC = () => {
  const { t } = useI18n();
  const navigate = useNavigate();
  const wsRef = useRef<ReturnType<typeof setupWebSocket> | null>(null)
  const [rooms, setRooms] = useState<Room[]>([
    { 
      id: '1', 
      name: 'Dust2 Classic - Bots Enabled', 
      players: 3, 
      maxPlayers: 10, 
      mode: 'deathmatch', 
      map: 'de_dust2', 
      status: 'waiting', 
      ping: 32,
      hasPassword: false,
      bots: 4,
      botDifficulty: 'normal'
    },
    { 
      id: '2', 
      name: 'Aim Training - Expert Bots', 
      players: 2, 
      maxPlayers: 8, 
      mode: 'freeForAll', 
      map: 'aim_map', 
      status: 'playing', 
      ping: 45,
      hasPassword: true,
      bots: 6,
      botDifficulty: 'expert'
    },
  ]);

  const [showCreateModal, setShowCreateModal] = useState(false);
  const [showBotPanel, setShowBotPanel] = useState(false);
  const [isConnected, setIsConnected] = useState(false);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [isInitialLoading, setIsInitialLoading] = useState(false);
  const [isJoiningRoom, setIsJoiningRoom] = useState<string | null>(null);
  const [audioEnabled, setAudioEnabled] = useState(true);
  const [soundEffect] = useState(new Audio('/sounds/ui/click.wav')); // Fallback UI sound
  
  const [roomConfig, setRoomConfig] = useState({
    name: '',
    mode: 'deathmatch',
    map: 'de_dust2',
    maxPlayers: 10,
    password: '',
    botConfig: {
      enabled: false,
      count: 0,
      difficulty: 'normal' as const,
      fillEmpty: true,
      teamBalance: true
    }
  });

  const [searchQuery, setSearchQuery] = useState('');
  const [filterMode, setFilterMode] = useState('all');
  const [showOnlyWithBots, setShowOnlyWithBots] = useState(false);

  const difficultyColors = {
    easy: 'text-green-400',
    normal: 'text-yellow-400',
    hard: 'text-orange-400',
    expert: 'text-red-400'
  };

  const difficultyIcons = {
    easy: '🟢',
    normal: '🟡',
    hard: '🟠',
    expert: '🔴'
  };

  const createRoom = () => {
    const newRoom: Room = {
      id: Date.now().toString(),
      name: roomConfig.name || t('lobby.roomName'),
      players: 1,
      maxPlayers: roomConfig.maxPlayers,
      mode: roomConfig.mode,
      map: roomConfig.map,
      status: 'waiting',
      ping: Math.floor(Math.random() * 50) + 10,
      hasPassword: roomConfig.password !== '',
      bots: roomConfig.botConfig.enabled ? roomConfig.botConfig.count : 0,
      botDifficulty: roomConfig.botConfig.difficulty
    };
    // Try server create, fall back to local
    if (wsRef.current?.isConnected) {
      wsRef.current.emit('room:create', {
        name: roomConfig.name || t('lobby.roomName'),
        mode: roomConfig.mode,
        map: roomConfig.map,
        maxPlayers: roomConfig.maxPlayers,
        password: roomConfig.password || undefined,
        bots: roomConfig.botConfig
      })
      setShowCreateModal(false)
    } else {
      setRooms([...rooms, newRoom]);
      setShowCreateModal(false);
      window.location.href = `/room/${newRoom.id}`;
    }
  };

  const filteredRooms = rooms.filter(room => {
    const matchesSearch = room.name.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesMode = filterMode === 'all' || room.mode === filterMode;
    const matchesBotFilter = !showOnlyWithBots || room.bots > 0;
    return matchesSearch && matchesMode && matchesBotFilter;
  });

  const quickJoinWithBots = () => {
    const availableRooms = rooms.filter(r => 
      r.status === 'waiting' && 
      r.bots > 0 && 
      r.players < r.maxPlayers && 
      !r.hasPassword
    );
    
    if (availableRooms.length > 0) {
      const room = availableRooms[Math.floor(Math.random() * availableRooms.length)];
      window.location.href = `/room/${room.id}`;
    }
  };

  const navigateToRoom = (roomId: string) => {
    // Navigate to the game with the room ID
    setTimeout(() => {
      navigate(`/game/${roomId}`);
    }, 500);
  };

  const playUISound = (soundType: 'click' | 'hover' | 'success' | 'error' = 'click') => {
    if (!audioEnabled) return;
    
    try {
      soundEffect.currentTime = 0;
      soundEffect.volume = 0.3;
      soundEffect.play().catch(() => {
        // Fallback: visual feedback only
        console.log(`UI Sound: ${soundType}`);
      });
    } catch (e) {
      // Silent fail for audio
    }
  };

  const notifyGameAction = (action: string, message: string, type: 'info' | 'success' | 'error' = 'info') => {
    // Play corresponding UI sound
    playUISound(type === 'success' ? 'success' : type === 'error' ? 'error' : 'click');
    
    // Simple console notification for now
    console.log(`[${type.toUpperCase()}] ${action}: ${message}`);
    // Could add toast notification here in the future
  };

  // WebSocket: connect and listen for room updates
  useEffect(() => {
    const ws = setupWebSocket()
    wsRef.current = ws
    ws.connect().then(() => setIsConnected(true)).catch(() => setIsConnected(false))
    const offCreated = ws.on('room:created', (data: any) => {
      const id = (data && (data.id || data.roomId)) || String(Date.now())
      window.location.href = `/room/${id}`
    })
    const offUpdated = ws.on('room:updated', (data: any) => {
      // Accept either { rooms: [...] } or array
      const list = Array.isArray(data) ? data : (data?.rooms || [])
      if (Array.isArray(list) && list.length) {
        // Normalize minimal fields
        const mapped: Room[] = list.map((r: any) => ({
          id: String(r.id || r.roomId || Date.now()),
          name: r.name || 'Room',
          players: (r.players && (r.players.length || r.players)) || 0,
          maxPlayers: r.maxPlayers || 10,
          mode: r.mode || 'deathmatch',
          map: r.map || 'de_dust2',
          status: r.status || 'waiting',
          ping: 32,
          hasPassword: !!r.hasPassword,
          bots: r.bots || 0,
          botDifficulty: r.botDifficulty || 'normal'
        }))
        setRooms(mapped)
      }
    })
    return () => { offCreated(); offUpdated() }
  }, [])

  // Handle global keyboard shortcuts
  const handleGlobalKeyDown = (event: React.KeyboardEvent) => {
    // Escape key closes modals
    if (event.key === KEYBOARD_KEYS.ESCAPE) {
      if (showCreateModal) {
        setShowCreateModal(false);
        announceToScreenReader('Create room dialog closed');
      }
      if (showBotPanel) {
        setShowBotPanel(false);
        announceToScreenReader('Bot manager closed');
      }
    }
  };

  // Focus management for modals
  useEffect(() => {
    if (showCreateModal) {
      const modalElement = document.querySelector('.create-room-modal') as HTMLElement;
      if (modalElement) {
        setTimeout(() => focusUtils.focusFirst(modalElement), 100);
      }
      announceToScreenReader('Create room dialog opened', 'assertive');
    }
  }, [showCreateModal]);

  useEffect(() => {
    if (showBotPanel) {
      const modalElement = document.querySelector('.bot-manager-panel') as HTMLElement;
      if (modalElement) {
        setTimeout(() => focusUtils.focusFirst(modalElement), 100);
      }
      announceToScreenReader('Bot manager opened', 'assertive');
    }
  }, [showBotPanel]);

  return (
    <div 
      className="min-h-screen bg-gradient-to-br from-slate-900 via-indigo-900 to-purple-900 overflow-hidden relative"
      onKeyDown={handleGlobalKeyDown}
      role="application"
      aria-label="CS2D Game Lobby"
    >
      {/* Skip navigation link */}
      <a 
        href="#main-content" 
        className="skip-nav sr-only focus:not-sr-only"
        aria-label="Skip to main content"
      >
        Skip to main content
      </a>
      
      {/* Live region for screen reader announcements */}
      <div 
        aria-live="polite" 
        aria-atomic="true" 
        className="live-region"
        id="announcements"
      ></div>
      {/* Enhanced Animated Background */}
      <div className="absolute inset-0 overflow-hidden">
        {/* Primary gradient background */}
        <div className="absolute inset-0 bg-gradient-to-br from-slate-900 via-indigo-900 to-purple-900" />
        
        {/* Floating gradient orbs */}
        <div className="absolute top-0 -left-4 w-96 h-96 bg-gradient-to-r from-purple-500/30 to-pink-500/30 rounded-full mix-blend-multiply filter blur-3xl animate-blob" />
        <div className="absolute top-0 -right-4 w-96 h-96 bg-gradient-to-r from-cyan-500/30 to-blue-500/30 rounded-full mix-blend-multiply filter blur-3xl animate-blob" style={{ animationDelay: '2s' }} />
        <div className="absolute -bottom-8 left-20 w-96 h-96 bg-gradient-to-r from-pink-500/30 to-red-500/30 rounded-full mix-blend-multiply filter blur-3xl animate-blob" style={{ animationDelay: '4s' }} />
        <div className="absolute bottom-0 right-20 w-96 h-96 bg-gradient-to-r from-indigo-500/30 to-purple-500/30 rounded-full mix-blend-multiply filter blur-3xl animate-blob" style={{ animationDelay: '6s' }} />
        
        {/* Animated geometric patterns */}
        <div className="absolute top-1/4 left-1/4 w-32 h-32 border border-white/10 rotate-45 animate-spin" style={{ animationDuration: '20s' }} />
        <div className="absolute top-3/4 right-1/4 w-24 h-24 border border-orange-500/20 rotate-12 animate-pulse" />
        
        {/* Grid pattern overlay */}
        <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/5 to-transparent animate-pulse" style={{ animationDuration: '3s' }} />
      </div>

      {/* Enhanced Header with Glass Effect */}
      <header 
        className="relative backdrop-blur-xl bg-white/5 border-b border-white/10 shadow-2xl"
        role="banner"
        aria-label="Game lobby header"
      >
        <div className="max-w-7xl mx-auto px-6 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-6">
              {/* Enhanced Logo with Animation */}
              <div className="flex items-center space-x-3">
                <div className="w-14 h-14 bg-gradient-to-br from-orange-400 via-pink-500 to-purple-600 rounded-xl flex items-center justify-center shadow-lg shadow-orange-500/25 animate-pulse">
                  <span className="text-white font-black text-2xl">CS</span>
                </div>
                <div>
                  <h1 className="text-4xl font-black bg-gradient-to-r from-orange-400 via-pink-500 to-purple-600 bg-clip-text text-transparent" data-testid="lobby-header">
                    CS2D Enhanced
                  </h1>
                  <p className="text-sm text-white/70">Modern Counter-Strike Experience</p>
                </div>
              </div>
            </div>

            {/* Enhanced Navigation */}
            <nav className="flex items-center space-x-4">
              {/* Connection Status */}
              <div className="flex items-center space-x-2 px-3 py-1 bg-green-500/20 rounded-lg" data-testid="connection-status" data-status="connected">
                <div className="w-2 h-2 bg-green-500 rounded-full animate-pulse" />
                <span className="text-green-400 text-sm">Connected</span>
              </div>
              
              <button 
                onClick={() => {
                  playUISound('click');
                  setShowBotPanel(!showBotPanel);
                }}
                onMouseEnter={() => playUISound('hover')}
                className="px-4 py-2 backdrop-blur-md bg-white/10 border border-white/20 rounded-lg text-white hover:bg-white/20 hover:scale-105 transition-all duration-200 transform active:scale-95 flex items-center space-x-2"
              >
                <span>🤖</span>
                <span>Bot Manager</span>
              </button>
              
              <button className="px-4 py-2 backdrop-blur-md bg-white/10 border border-white/20 rounded-lg text-white hover:bg-white/20 transition-all duration-200">
                📊 Stats
              </button>
              
              <button className="px-4 py-2 backdrop-blur-md bg-white/10 border border-white/20 rounded-lg text-white hover:bg-white/20 transition-all duration-200">
                🏆 Leaderboard
              </button>
              
              <LanguageSwitcher />
              
              {/* Audio Toggle */}
              <button 
                onClick={() => {
                  setAudioEnabled(!audioEnabled);
                  playUISound('click');
                }}
                onMouseEnter={() => playUISound('hover')}
                className="px-3 py-2 backdrop-blur-md bg-white/10 border border-white/20 rounded-lg text-white hover:bg-white/20 hover:scale-105 transition-all duration-200 transform active:scale-95"
                title={audioEnabled ? "Mute sounds" : "Enable sounds"}
              >
                {audioEnabled ? '🔊' : '🔇'}
              </button>
              
              <button 
                onMouseEnter={() => playUISound('hover')}
                onClick={() => playUISound('click')}
                className="px-4 py-2 backdrop-blur-md bg-gradient-to-r from-orange-500 to-pink-600 text-white rounded-lg hover:shadow-lg hover:shadow-orange-500/25 hover:scale-105 transition-all duration-200 transform active:scale-95 font-semibold"
              >
                👤 Profile
              </button>
            </nav>
          </div>
        </div>
      </header>

      {/* Bot Manager Panel */}
      {showBotPanel && (
        <div className="fixed top-20 right-4 z-50 w-96 backdrop-blur-xl bg-white/10 border border-white/20 rounded-2xl shadow-2xl p-6">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-xl font-bold text-white">🤖 Bot Practice Manager</h3>
            <button 
              onClick={() => setShowBotPanel(false)}
              className="text-white/60 hover:text-white"
            >
              ✕
            </button>
          </div>
          
          <div className="space-y-4">
            <div className="backdrop-blur-md bg-white/5 rounded-lg p-4">
              <h4 className="text-white font-semibold mb-2">Quick Bot Match</h4>
              <div className="grid grid-cols-2 gap-2">
                <button className="px-3 py-2 bg-green-600/30 border border-green-500/50 rounded-lg text-green-400 hover:bg-green-600/40 transition-all">
                  🟢 Easy Bots
                </button>
                <button className="px-3 py-2 bg-yellow-600/30 border border-yellow-500/50 rounded-lg text-yellow-400 hover:bg-yellow-600/40 transition-all">
                  🟡 Normal Bots
                </button>
                <button className="px-3 py-2 bg-orange-600/30 border border-orange-500/50 rounded-lg text-orange-400 hover:bg-orange-600/40 transition-all">
                  🟠 Hard Bots
                </button>
                <button className="px-3 py-2 bg-red-600/30 border border-red-500/50 rounded-lg text-red-400 hover:bg-red-600/40 transition-all">
                  🔴 Expert Bots
                </button>
              </div>
            </div>
            
            <div className="backdrop-blur-md bg-white/5 rounded-lg p-4">
              <h4 className="text-white font-semibold mb-2">Bot Training Modes</h4>
              <div className="space-y-2">
                <button className="w-full px-3 py-2 bg-white/10 rounded-lg text-white hover:bg-white/20 transition-all text-left">
                  🎯 Aim Training - Improve accuracy
                </button>
                <button className="w-full px-3 py-2 bg-white/10 rounded-lg text-white hover:bg-white/20 transition-all text-left">
                  🏃 Movement Practice - Master strafing
                </button>
                <button className="w-full px-3 py-2 bg-white/10 rounded-lg text-white hover:bg-white/20 transition-all text-left">
                  💣 Defuse Training - Learn bomb sites
                </button>
                <button className="w-full px-3 py-2 bg-white/10 rounded-lg text-white hover:bg-white/20 transition-all text-left">
                  🔫 Weapon Mastery - Practice all weapons
                </button>
              </div>
            </div>
            
            <button 
              onClick={quickJoinWithBots}
              className="w-full py-3 bg-gradient-to-r from-purple-600 to-pink-600 text-white rounded-lg hover:shadow-lg hover:shadow-purple-500/25 transition-all duration-200 font-bold"
            >
              ⚡ Quick Join Bot Game
            </button>
          </div>
        </div>
      )}

      {/* Main Content Area */}
      <div className="relative max-w-7xl mx-auto px-6 py-8">
        {/* Enhanced Controls Section */}
        <div className="backdrop-blur-xl bg-white/5 border border-white/20 rounded-2xl shadow-2xl p-6 mb-8">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-4">
              <button 
                onClick={() => {
                  playUISound('click');
                  setShowCreateModal(true);
                }}
                onMouseEnter={() => playUISound('hover')}
                className="px-6 py-3 bg-gradient-to-r from-orange-500 to-pink-600 text-white rounded-xl hover:shadow-lg hover:shadow-orange-500/25 hover:scale-105 transition-all duration-200 transform active:scale-95 font-bold text-lg relative overflow-hidden group"
                data-testid="create-room-btn"
              >
                <div className="absolute inset-0 bg-gradient-to-r from-pink-600 to-orange-500 opacity-0 group-hover:opacity-100 transition-opacity duration-200" />
                <span className="relative z-10">➕ Create Room</span>
              </button>
              
              <button 
                onClick={() => {
                  playUISound('success');
                  quickJoinWithBots();
                }}
                onMouseEnter={() => playUISound('hover')}
                className="px-6 py-3 bg-gradient-to-r from-purple-600 to-indigo-600 text-white rounded-xl hover:shadow-lg hover:shadow-purple-500/25 hover:scale-105 transition-all duration-200 transform active:scale-95 font-bold text-lg relative overflow-hidden group"
                data-testid="quick-join-btn"
              >
                <div className="absolute inset-0 bg-gradient-to-r from-indigo-600 to-purple-600 opacity-0 group-hover:opacity-100 transition-opacity duration-200" />
                <span className="relative z-10">🎮 Quick Play (with Bots)</span>
              </button>
              
              <button className="px-6 py-3 backdrop-blur-md bg-white/10 border border-white/20 rounded-xl text-white hover:bg-white/20 transition-all duration-200 font-semibold">
                🔄 Refresh
              </button>
            </div>
            
            {/* Enhanced Search and Filters */}
            <div className="flex items-center space-x-4">
              <div className="relative">
                <input 
                  type="text"
                  placeholder="Search rooms..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="px-4 py-2 pl-10 backdrop-blur-md bg-white/10 border border-white/20 rounded-lg text-white placeholder-white/50 focus:outline-none focus:border-white/40"
                />
                <span className="absolute left-3 top-2.5 text-white/50">🔍</span>
              </div>
              
              <select 
                value={filterMode}
                onChange={(e) => setFilterMode(e.target.value)}
                className="px-4 py-2 backdrop-blur-md bg-white/10 border border-white/20 rounded-lg text-white focus:outline-none focus:border-white/40"
              >
                <option value="all">All Modes</option>
                <option value="deathmatch">Deathmatch</option>
                <option value="teamDeathmatch">Team Deathmatch</option>
                <option value="bombDefusal">Bomb Defusal</option>
                <option value="hostageRescue">Hostage Rescue</option>
                <option value="zombies">Zombie Mode</option>
              </select>
              
              <label className="flex items-center space-x-2 text-white">
                <input 
                  type="checkbox"
                  checked={showOnlyWithBots}
                  onChange={(e) => setShowOnlyWithBots(e.target.checked)}
                  className="rounded"
                />
                <span>Show Bot Rooms</span>
              </label>
            </div>
          </div>
        </div>

        {/* Enhanced loading states */}
        {isRefreshing && (
          <div className="fixed top-4 left-4 z-30 backdrop-blur-md bg-white/10 border border-white/20 rounded-lg px-4 py-3 shadow-2xl">
            <div className="flex items-center space-x-3 text-white">
              <div className="relative">
                <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                <div className="absolute top-0 left-0 w-5 h-5 border-2 border-transparent border-t-blue-400 rounded-full animate-spin" style={{ animationDuration: '1.5s' }} />
              </div>
              <div>
                <div className="text-sm font-semibold">Refreshing rooms...</div>
                <div className="text-xs text-white/60">Finding the best matches</div>
              </div>
              {/* Audio visualization bars */}
              {audioEnabled && (
                <div className="flex items-end space-x-1">
                  <div className="w-1 bg-green-400 rounded-full animate-pulse" style={{ height: '8px', animationDelay: '0ms' }} />
                  <div className="w-1 bg-green-400 rounded-full animate-pulse" style={{ height: '12px', animationDelay: '100ms' }} />
                  <div className="w-1 bg-green-400 rounded-full animate-pulse" style={{ height: '6px', animationDelay: '200ms' }} />
                  <div className="w-1 bg-green-400 rounded-full animate-pulse" style={{ height: '10px', animationDelay: '300ms' }} />
                </div>
              )}
            </div>
          </div>
        )}
        
        {/* Connection status with sound indicator */}
        {!isConnected && (
          <div className="fixed top-4 right-4 z-30 backdrop-blur-md bg-red-900/20 border border-red-500/30 rounded-lg px-4 py-3 shadow-2xl">
            <div className="flex items-center space-x-3 text-white">
              <div className="relative">
                <div className="w-3 h-3 bg-red-500 rounded-full animate-ping" />
                <div className="absolute top-0 left-0 w-3 h-3 bg-red-400 rounded-full" />
              </div>
              <div>
                <div className="text-sm font-semibold text-red-200">Connection Lost</div>
                <div className="text-xs text-red-300">Reconnecting...</div>
              </div>
            </div>
          </div>
        )}

        {/* Enhanced Room List */}
        {isInitialLoading ? (
          <LobbySkeletonGrid count={6} />
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6" data-testid="room-list">
            {filteredRooms.map((room) => (
              <div
                key={room.id}
                className="text-left backdrop-blur-xl bg-white/5 border border-white/20 rounded-2xl shadow-2xl p-6 hover:bg-white/10 hover:border-white/30 transition-all duration-300 cursor-pointer transform hover:scale-105 hover:shadow-[0_20px_50px_rgba(8,_112,_184,_0.3)] relative overflow-hidden group"
                onClick={() => {
                  if (isJoiningRoom !== room.id) {
                    playUISound('click');
                    setIsJoiningRoom(room.id);
                    notifyGameAction('joining', `Joining ${room.name}...`, 'info');
                    navigateToRoom(room.id);
                  }
                }}
                onKeyDown={(e) => { 
                  if ((e.key === 'Enter' || e.key === ' ') && isJoiningRoom !== room.id) {
                    playUISound('click');
                    setIsJoiningRoom(room.id);
                    notifyGameAction('joining', `Joining ${room.name}...`, 'info');
                    navigateToRoom(room.id);
                  }
                }}
                onMouseEnter={() => playUISound('hover')}
                tabIndex={0}
                role="button"
                aria-label={`Join room ${room.name}`}
              >
                {/* Animated background glow on hover */}
                <div className="absolute inset-0 bg-gradient-to-r from-blue-500/10 via-purple-500/10 to-pink-500/10 opacity-0 group-hover:opacity-100 transition-opacity duration-500" />
                
                {/* Status indicator pulse */}
                {room.status === 'waiting' && (
                  <div className="absolute -top-1 -right-1 w-4 h-4 bg-green-500 rounded-full animate-ping opacity-75" />
                )}
              {/* Room Header */}
              <div className="flex items-start justify-between mb-4">
                <div>
                  <h3 className="text-xl font-bold text-white mb-1">{room.name}</h3>
                  <div className="flex items-center space-x-2">
                    <span className={`text-xs px-2 py-1 rounded-full ${
                      room.status === 'waiting' 
                        ? 'bg-green-500/20 text-green-400 border border-green-500/30' 
                        : 'bg-red-500/20 text-red-400 border border-red-500/30'
                    }`}>
                      {room.status === 'waiting' ? '⏳ Waiting' : '🎮 In Game'}
                    </span>
                    {room.hasPassword && (
                      <span className="text-xs px-2 py-1 rounded-full bg-yellow-500/20 text-yellow-400 border border-yellow-500/30">
                        🔒 Private
                      </span>
                    )}
                  </div>
                </div>
                <div className="text-right">
                  <div className="text-white/60 text-sm">Ping</div>
                  <div className={`font-bold ${
                    room.ping < 30 ? 'text-green-400' : 
                    room.ping < 60 ? 'text-yellow-400' : 'text-red-400'
                  }`}>
                    {room.ping}ms
                  </div>
                </div>
              </div>

              {/* Room Info */}
              <div className="space-y-3 mb-4">
                <div className="flex justify-between items-center">
                  <span className="text-white/60">Map</span>
                  <span className="text-white font-semibold">{room.map}</span>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-white/60">Mode</span>
                  <span className="text-white font-semibold">{room.mode}</span>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-white/60">Players</span>
                  <div className="flex items-center space-x-2">
                    <span className="text-white font-semibold">
                      👥 {room.players}/{room.maxPlayers}
                    </span>
                    {room.bots > 0 && (
                      <span className={`font-semibold ${difficultyColors[room.botDifficulty]}`}>
                        {difficultyIcons[room.botDifficulty]} {room.bots} Bots
                      </span>
                    )}
                  </div>
                </div>
              </div>

              {/* Player Bar Visualization */}
              <div className="w-full bg-white/10 rounded-full h-3 overflow-hidden">
                <div className="h-full flex">
                  <div 
                    className="bg-gradient-to-r from-green-400 to-blue-500 transition-all duration-300"
                    style={{ width: `${(room.players / room.maxPlayers) * 100}%` }}
                  />
                  {room.bots > 0 && (
                    <div 
                      className="bg-gradient-to-r from-purple-400 to-pink-500 transition-all duration-300"
                      style={{ width: `${(room.bots / room.maxPlayers) * 100}%` }}
                    />
                  )}
                </div>
              </div>

              {/* Join Button */}
              <div 
                className={`w-full mt-4 py-2 bg-gradient-to-r from-purple-600 to-pink-600 text-white rounded-lg hover:shadow-lg hover:shadow-purple-500/25 transition-all duration-200 font-semibold text-center ${
                  isJoiningRoom === room.id ? 'opacity-50 cursor-not-allowed' : 'cursor-pointer'
                }`}
                onClick={(e) => {
                  e.stopPropagation();
                  if (isJoiningRoom !== room.id) {
                    setIsJoiningRoom(room.id);
                    notifyGameAction('joining', `Joining ${room.name}...`, 'info');
                    navigateToRoom(room.id);
                  }
                }}
              >
                {isJoiningRoom === room.id ? (
                  <span className="flex items-center justify-center space-x-2">
                    <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                    <span>Joining...</span>
                  </span>
                ) : (
                  'Join Room'
                )}
              </div>
            </div>
          ))}
          </div>
        )}

        {/* Empty State */}
        {filteredRooms.length === 0 && (
          <div className="backdrop-blur-xl bg-white/5 border border-white/20 rounded-2xl shadow-2xl p-12 text-center">
            <div className="text-6xl mb-4">🎮</div>
            <h3 className="text-2xl font-bold text-white mb-2">No Rooms Found</h3>
            <p className="text-white/60 mb-6">Try adjusting your filters or create a new room</p>
            <button 
              onClick={() => setShowCreateModal(true)}
              className="px-6 py-3 bg-gradient-to-r from-orange-500 to-pink-600 text-white rounded-xl hover:shadow-lg hover:shadow-orange-500/25 transition-all duration-200 font-bold"
            >
              Create First Room
            </button>
          </div>
        )}
      </div>

      {/* Enhanced Create Room Modal */}
      {showCreateModal && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50">
          <div className="backdrop-blur-xl bg-white/10 border border-white/20 rounded-2xl shadow-2xl p-8 w-full max-w-2xl">
            <h2 className="text-3xl font-bold text-white mb-6">Create New Room</h2>
            
            <div className="grid grid-cols-2 gap-6">
              <div>
                <label className="block text-white/80 mb-2" htmlFor="room-name">Room Name</label>
                <input 
                  id="room-name"
                  type="text"
                  value={roomConfig.name}
                  onChange={(e) => setRoomConfig({...roomConfig, name: e.target.value})}
                  className="w-full px-4 py-2 backdrop-blur-md bg-white/10 border border-white/20 rounded-lg text-white placeholder-white/50 focus:outline-none focus:border-white/40"
                  placeholder="Enter room name..."
                />
              </div>
              
              <div>
                <label className="block text-white/80 mb-2" htmlFor="game-mode">Game Mode</label>
                <select 
                  id="game-mode"
                  value={roomConfig.mode}
                  onChange={(e) => setRoomConfig({...roomConfig, mode: e.target.value})}
                  className="w-full px-4 py-2 backdrop-blur-md bg-white/10 border border-white/20 rounded-lg text-white focus:outline-none focus:border-white/40"
                >
                  <option value="deathmatch">Deathmatch</option>
                  <option value="teamDeathmatch">Team Deathmatch</option>
                  <option value="bombDefusal">Bomb Defusal</option>
                  <option value="hostageRescue">Hostage Rescue</option>
                  <option value="zombies">Zombie Mode</option>
                </select>
              </div>
              
              <div>
                <label className="block text-white/80 mb-2" htmlFor="map">Map</label>
                <select 
                  id="map"
                  value={roomConfig.map}
                  onChange={(e) => setRoomConfig({...roomConfig, map: e.target.value})}
                  className="w-full px-4 py-2 backdrop-blur-md bg-white/10 border border-white/20 rounded-lg text-white focus:outline-none focus:border-white/40"
                >
                  <option value="de_dust2">Dust 2</option>
                  <option value="de_inferno">Inferno</option>
                  <option value="de_mirage">Mirage</option>
                  <option value="cs_office">Office</option>
                  <option value="aim_map">Aim Map</option>
                </select>
              </div>
              
              <div>
                <label className="block text-white/80 mb-2" htmlFor="max-players">Max Players</label>
                <input 
                  id="max-players"
                  type="number"
                  value={roomConfig.maxPlayers}
                  onChange={(e) => setRoomConfig({...roomConfig, maxPlayers: parseInt(e.target.value)})}
                  className="w-full px-4 py-2 backdrop-blur-md bg-white/10 border border-white/20 rounded-lg text-white focus:outline-none focus:border-white/40"
                  min="2"
                  max="32"
                />
              </div>
              
              <div className="col-span-2">
                <label className="block text-white/80 mb-2" htmlFor="room-password">Password (Optional)</label>
                <input 
                  id="room-password"
                  type="password"
                  value={roomConfig.password}
                  onChange={(e) => setRoomConfig({...roomConfig, password: e.target.value})}
                  className="w-full px-4 py-2 backdrop-blur-md bg-white/10 border border-white/20 rounded-lg text-white placeholder-white/50 focus:outline-none focus:border-white/40"
                  placeholder="Leave empty for public room..."
                />
              </div>
            </div>

            {/* Bot Configuration Section */}
            <div className="mt-6 p-4 backdrop-blur-md bg-white/5 border border-white/20 rounded-lg">
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-xl font-semibold text-white">🤖 Bot Configuration</h3>
                <label className="flex items-center space-x-2" htmlFor="enable-bots">
                  <input 
                    id="enable-bots"
                    type="checkbox"
                    checked={roomConfig.botConfig.enabled}
                    onChange={(e) => setRoomConfig({
                      ...roomConfig, 
                      botConfig: {...roomConfig.botConfig, enabled: e.target.checked}
                    })}
                    className="rounded"
                  />
                  <span className="text-white">Enable Bots</span>
                </label>
              </div>
              
              {roomConfig.botConfig.enabled && (
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-white/80 mb-2" htmlFor="bot-count">Number of Bots</label>
                    <input 
                      id="bot-count"
                      type="number"
                      value={roomConfig.botConfig.count}
                      onChange={(e) => setRoomConfig({
                        ...roomConfig,
                        botConfig: {...roomConfig.botConfig, count: parseInt(e.target.value)}
                      })}
                      className="w-full px-4 py-2 backdrop-blur-md bg-white/10 border border-white/20 rounded-lg text-white focus:outline-none focus:border-white/40"
                      min="0"
                      max={roomConfig.maxPlayers - 1}
                    />
                  </div>
                  
                  <div>
                    <label className="block text-white/80 mb-2" htmlFor="bot-difficulty">Bot Difficulty</label>
                    <select 
                      id="bot-difficulty"
                      value={roomConfig.botConfig.difficulty}
                      onChange={(e) => setRoomConfig({
                        ...roomConfig,
                        botConfig: { ...roomConfig.botConfig, difficulty: e.target.value as 'easy' | 'normal' | 'hard' | 'expert' }
                      })}
                      className="w-full px-4 py-2 backdrop-blur-md bg-white/10 border border-white/20 rounded-lg text-white focus:outline-none focus:border-white/40"
                    >
                      <option value="easy">🟢 Easy</option>
                      <option value="normal">🟡 Normal</option>
                      <option value="hard">🟠 Hard</option>
                      <option value="expert">🔴 Expert</option>
                    </select>
                  </div>
                  
                  <div>
                    <label className="flex items-center space-x-2 text-white mt-6" htmlFor="fill-empty">
                      <input 
                        id="fill-empty"
                        type="checkbox"
                        checked={roomConfig.botConfig.fillEmpty}
                        onChange={(e) => setRoomConfig({
                          ...roomConfig,
                          botConfig: {...roomConfig.botConfig, fillEmpty: e.target.checked}
                        })}
                        className="rounded"
                      />
                      <span>Auto-fill empty slots</span>
                    </label>
                  </div>
                  
                  <div>
                    <label className="flex items-center space-x-2 text-white mt-6" htmlFor="team-balance">
                      <input 
                        id="team-balance"
                        type="checkbox"
                        checked={roomConfig.botConfig.teamBalance}
                        onChange={(e) => setRoomConfig({
                          ...roomConfig,
                          botConfig: {...roomConfig.botConfig, teamBalance: e.target.checked}
                        })}
                        className="rounded"
                      />
                      <span>Auto team balance</span>
                    </label>
                  </div>
                </div>
              )}
            </div>
            
            <div className="flex justify-end space-x-4 mt-8">
              <button 
                onClick={() => setShowCreateModal(false)}
                className="px-6 py-2 backdrop-blur-md bg-white/10 border border-white/20 rounded-lg text-white hover:bg-white/20 transition-all duration-200"
              >
                Cancel
              </button>
              <button 
                onClick={createRoom}
                className="px-6 py-2 bg-gradient-to-r from-orange-500 to-pink-600 text-white rounded-lg hover:shadow-lg hover:shadow-orange-500/25 transition-all duration-200 font-semibold"
              >
                Create Room
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
