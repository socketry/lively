import React, { useEffect, useRef, useState, useCallback, useMemo } from 'react';
import { useI18n } from '../../contexts/I18nContext';
import { LanguageSwitcher } from '../LanguageSwitcher';
import { setupWebSocket } from '@/services/websocket';
import { useOptimizedSearch, useRenderPerformance, useDebounce } from '@/hooks/usePerformance';
import { OptimizedConnectionStatus } from './OptimizedConnectionStatus';
import { VirtualScrollList } from '../common/VirtualScrollList';
import { ConditionalLazy } from '../lazy/LazyComponents';
import { getPerformanceMonitor } from '@/utils/performanceMonitor';

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

const RoomCard = React.memo<{ 
  room: Room; 
  onJoin: (roomId: string) => void;
  difficultyColors: Record<string, string>;
  difficultyIcons: Record<string, string>;
}>(({ room, onJoin, difficultyColors, difficultyIcons }) => {
  const handleJoin = useCallback(() => onJoin(room.id), [onJoin, room.id]);
  
  return (
    <button
      type="button"
      className="text-left backdrop-blur-xl bg-white/5 border border-white/20 rounded-2xl shadow-2xl p-6 hover:bg-white/10 hover:border-white/30 transition-all duration-300 cursor-pointer transform hover:scale-105 w-full"
      onClick={handleJoin}
      onKeyDown={(e) => { if (e.key === 'Enter' || e.key === ' ') handleJoin(); }}
    >
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
      <div className="w-full bg-white/10 rounded-full h-3 overflow-hidden mb-4">
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
      <div className="w-full py-2 bg-gradient-to-r from-purple-600 to-pink-600 text-white rounded-lg text-center font-semibold">
        Join Room
      </div>
    </button>
  );
}, (prevProps, nextProps) => {
  return prevProps.room.id === nextProps.room.id &&
         prevProps.room.players === nextProps.room.players &&
         prevProps.room.status === nextProps.room.status &&
         prevProps.room.ping === nextProps.room.ping;
});

RoomCard.displayName = 'RoomCard';

export const OptimizedModernLobby: React.FC = () => {
  useRenderPerformance('OptimizedModernLobby');
  
  const { t } = useI18n();
  const wsRef = useRef<ReturnType<typeof setupWebSocket> | null>(null);
  const performanceMonitor = getPerformanceMonitor();
  
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
  const [connectionState, setConnectionState] = useState({
    isConnected: false,
    reconnectAttempts: 0
  });
  
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

  const [filterMode, setFilterMode] = useState('all');
  const [showOnlyWithBots, setShowOnlyWithBots] = useState(false);

  // Memoized constants
  const difficultyColors = useMemo(() => ({
    easy: 'text-green-400',
    normal: 'text-yellow-400',
    hard: 'text-orange-400',
    expert: 'text-red-400'
  }), []);

  const difficultyIcons = useMemo(() => ({
    easy: '🟢',
    normal: '🟡',
    hard: '🟠',
    expert: '🔴'
  }), []);

  // Optimized search functionality
  const searchFunction = useCallback((items: Room[], query: string) => {
    const lowercaseQuery = query.toLowerCase();
    return items.filter(room => 
      room.name.toLowerCase().includes(lowercaseQuery) ||
      room.map.toLowerCase().includes(lowercaseQuery) ||
      room.mode.toLowerCase().includes(lowercaseQuery)
    );
  }, []);

  const { 
    query: searchQuery, 
    setQuery: setSearchQuery, 
    filteredItems: searchResults 
  } = useOptimizedSearch(rooms, searchFunction, 300);

  // Apply additional filters
  const filteredRooms = useMemo(() => {
    return searchResults.filter(room => {
      const matchesMode = filterMode === 'all' || room.mode === filterMode;
      const matchesBotFilter = !showOnlyWithBots || room.bots > 0;
      return matchesMode && matchesBotFilter;
    });
  }, [searchResults, filterMode, showOnlyWithBots]);

  // Debounced room config for performance
  const debouncedRoomConfig = useDebounce(roomConfig, 300);

  // Optimized callbacks
  const createRoom = useCallback(() => {
    const newRoom: Room = {
      id: Date.now().toString(),
      name: debouncedRoomConfig.name || t('lobby.roomName'),
      players: 1,
      maxPlayers: debouncedRoomConfig.maxPlayers,
      mode: debouncedRoomConfig.mode,
      map: debouncedRoomConfig.map,
      status: 'waiting',
      ping: Math.floor(Math.random() * 50) + 10,
      hasPassword: debouncedRoomConfig.password !== '',
      bots: debouncedRoomConfig.botConfig.enabled ? debouncedRoomConfig.botConfig.count : 0,
      botDifficulty: debouncedRoomConfig.botConfig.difficulty
    };

    if (wsRef.current?.isConnected) {
      wsRef.current.emit('room:create', {
        name: debouncedRoomConfig.name || t('lobby.roomName'),
        mode: debouncedRoomConfig.mode,
        map: debouncedRoomConfig.map,
        maxPlayers: debouncedRoomConfig.maxPlayers,
        password: debouncedRoomConfig.password || undefined,
        bots: debouncedRoomConfig.botConfig
      });
      setShowCreateModal(false);
    } else {
      setRooms(prev => [...prev, newRoom]);
      setShowCreateModal(false);
      window.location.href = `/room/${newRoom.id}`;
    }
  }, [debouncedRoomConfig, t]);

  const joinRoom = useCallback((roomId: string) => {
    window.location.href = `/room/${roomId}`;
  }, []);

  const quickJoinWithBots = useCallback(() => {
    const availableRooms = filteredRooms.filter(r => 
      r.status === 'waiting' && 
      r.bots > 0 && 
      r.players < r.maxPlayers && 
      !r.hasPassword
    );
    
    if (availableRooms.length > 0) {
      const room = availableRooms[Math.floor(Math.random() * availableRooms.length)];
      joinRoom(room.id);
    }
  }, [filteredRooms, joinRoom]);

  const handleReconnect = useCallback(() => {
    if (wsRef.current) {
      wsRef.current.connect()
        .then(() => setConnectionState({ isConnected: true, reconnectAttempts: 0 }))
        .catch(() => setConnectionState(prev => ({ 
          isConnected: false, 
          reconnectAttempts: prev.reconnectAttempts + 1 
        })));
    }
  }, []);

  // Virtual scroll render function
  const renderRoom = useCallback((room: Room, index: number) => (
    <div className="p-2">
      <RoomCard
        room={room}
        onJoin={joinRoom}
        difficultyColors={difficultyColors}
        difficultyIcons={difficultyIcons}
      />
    </div>
  ), [joinRoom, difficultyColors, difficultyIcons]);

  const roomKeyExtractor = useCallback((room: Room) => room.id, []);

  // WebSocket connection with performance monitoring
  useEffect(() => {
    const ws = setupWebSocket();
    wsRef.current = ws;
    
    const connectStart = performance.now();
    ws.connect()
      .then(() => {
        const connectionTime = performance.now() - connectStart;
        performanceMonitor.measureRender('WebSocketConnection', () => connectionTime);
        setConnectionState({ isConnected: true, reconnectAttempts: 0 });
      })
      .catch(() => setConnectionState(prev => ({ 
        isConnected: false, 
        reconnectAttempts: prev.reconnectAttempts + 1 
      })));

    const offCreated = ws.on('room:created', (data: any) => {
      const id = (data && (data.id || data.roomId)) || String(Date.now());
      window.location.href = `/room/${id}`;
    });

    const offUpdated = ws.on('room:updated', (data: any) => {
      const list = Array.isArray(data) ? data : (data?.rooms || []);
      if (Array.isArray(list) && list.length) {
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
        }));
        setRooms(mapped);
      }
    });

    return () => { 
      offCreated(); 
      offUpdated(); 
    };
  }, [performanceMonitor]);

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-indigo-900 to-purple-900 overflow-hidden relative">
      {/* Enhanced Animated Background */}
      <div className="absolute inset-0">
        <div className="absolute top-0 -left-4 w-96 h-96 bg-purple-500 rounded-full mix-blend-multiply filter blur-3xl opacity-20 animate-blob" />
        <div className="absolute top-0 -right-4 w-96 h-96 bg-cyan-500 rounded-full mix-blend-multiply filter blur-3xl opacity-20 animate-blob animation-delay-2000" />
        <div className="absolute -bottom-8 left-20 w-96 h-96 bg-pink-500 rounded-full mix-blend-multiply filter blur-3xl opacity-20 animate-blob animation-delay-4000" />
        <div className="absolute bottom-0 right-20 w-96 h-96 bg-indigo-500 rounded-full mix-blend-multiply filter blur-3xl opacity-20 animate-blob animation-delay-6000" />
      </div>

      {/* Enhanced Header */}
      <header className="relative backdrop-blur-xl bg-white/5 border-b border-white/10 shadow-2xl">
        <div className="max-w-7xl mx-auto px-6 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-6">
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
              <OptimizedConnectionStatus
                isConnected={connectionState.isConnected}
                reconnectAttempts={connectionState.reconnectAttempts}
                onManualReconnect={handleReconnect}
                serverUrl={import.meta.env.VITE_WS_URL || 'ws://localhost:9292'}
              />
              
              <button 
                onClick={() => setShowBotPanel(!showBotPanel)}
                className="px-4 py-2 backdrop-blur-md bg-white/10 border border-white/20 rounded-lg text-white hover:bg-white/20 transition-all duration-200 flex items-center space-x-2"
              >
                <span>🤖</span>
                <span>Bot Manager</span>
              </button>
              
              <LanguageSwitcher />
              
              <button className="px-4 py-2 backdrop-blur-md bg-gradient-to-r from-orange-500 to-pink-600 text-white rounded-lg hover:shadow-lg hover:shadow-orange-500/25 transition-all duration-200 font-semibold">
                👤 Profile
              </button>
            </nav>
          </div>
        </div>
      </header>

      {/* Main Content Area */}
      <div className="relative max-w-7xl mx-auto px-6 py-8">
        {/* Enhanced Controls Section */}
        <div className="backdrop-blur-xl bg-white/5 border border-white/20 rounded-2xl shadow-2xl p-6 mb-8">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-4">
              <button 
                onClick={() => setShowCreateModal(true)}
                className="px-6 py-3 bg-gradient-to-r from-orange-500 to-pink-600 text-white rounded-xl hover:shadow-lg hover:shadow-orange-500/25 transition-all duration-200 font-bold text-lg"
                data-testid="create-room-btn"
              >
                ➕ Create Room
              </button>
              
              <button 
                onClick={quickJoinWithBots}
                disabled={filteredRooms.filter(r => r.status === 'waiting' && r.bots > 0 && !r.hasPassword).length === 0}
                className="px-6 py-3 bg-gradient-to-r from-purple-600 to-indigo-600 text-white rounded-xl hover:shadow-lg hover:shadow-purple-500/25 transition-all duration-200 font-bold text-lg disabled:opacity-50 disabled:cursor-not-allowed"
                data-testid="quick-join-btn"
              >
                🎮 Quick Play (with Bots)
              </button>
              
              <button 
                onClick={() => window.location.reload()}
                className="px-6 py-3 backdrop-blur-md bg-white/10 border border-white/20 rounded-xl text-white hover:bg-white/20 transition-all duration-200 font-semibold"
              >
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

        {/* Optimized Room List with Virtual Scrolling */}
        <div className="backdrop-blur-xl bg-white/5 border border-white/20 rounded-2xl shadow-2xl p-6" data-testid="room-list">
          {filteredRooms.length > 0 ? (
            <VirtualScrollList
              items={filteredRooms}
              itemHeight={200} // Approximate height of a room card
              containerHeight={600}
              renderItem={renderRoom}
              keyExtractor={roomKeyExtractor}
              overscan={2}
            />
          ) : (
            <div className="text-center py-12">
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
      </div>

      {/* Conditionally Lazy-loaded Create Room Modal */}
      <ConditionalLazy condition={showCreateModal}>
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50">
          <div className="backdrop-blur-xl bg-white/10 border border-white/20 rounded-2xl shadow-2xl p-8 w-full max-w-2xl">
            <h2 className="text-3xl font-bold text-white mb-6">Create New Room</h2>
            
            {/* Room creation form would go here - abbreviated for performance demo */}
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
      </ConditionalLazy>
    </div>
  );
};