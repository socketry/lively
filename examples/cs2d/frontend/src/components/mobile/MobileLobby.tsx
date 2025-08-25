import React, { useEffect, useRef, useState } from 'react';
import { useI18n } from '@/contexts/I18nContext';
import { setupWebSocket } from '@/services/websocket';
import { useIsMobile, useIsTouchDevice } from '@/hooks/useResponsive';

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

export const MobileLobby: React.FC = () => {
  const { t } = useI18n();
  const wsRef = useRef<ReturnType<typeof setupWebSocket> | null>(null)
  const isMobile = useIsMobile();
  const isTouch = useIsTouchDevice();
  
  const [rooms, setRooms] = useState<Room[]>([
    { 
      id: '1', 
      name: 'Dust2 Classic', 
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
      name: 'Aim Training', 
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
  const [showFilters, setShowFilters] = useState(false);
  const [isConnected, setIsConnected] = useState(false)
  
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

  // WebSocket setup
  useEffect(() => {
    const ws = setupWebSocket()
    wsRef.current = ws
    ws.connect().then(() => setIsConnected(true)).catch(() => setIsConnected(false))
    
    const offCreated = ws.on('room:created', (data: any) => {
      const id = (data && (data.id || data.roomId)) || String(Date.now())
      window.location.href = `/room/${id}`
    })
    
    const offUpdated = ws.on('room:updated', (data: any) => {
      const list = Array.isArray(data) ? data : (data?.rooms || [])
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
        }))
        setRooms(mapped)
      }
    })
    
    return () => { offCreated(); offUpdated() }
  }, [])

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-indigo-900 to-purple-900 flex flex-col">
      {/* Mobile Header */}
      <header className="backdrop-blur-xl bg-white/5 border-b border-white/10 shadow-2xl">
        <div className="px-4 py-4">
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center space-x-3">
              <div className="w-10 h-10 bg-gradient-to-br from-orange-400 via-pink-500 to-purple-600 rounded-lg flex items-center justify-center">
                <span className="text-white font-black text-lg">CS</span>
              </div>
              <div>
                <h1 className="text-xl font-black bg-gradient-to-r from-orange-400 via-pink-500 to-purple-600 bg-clip-text text-transparent">
                  CS2D Enhanced
                </h1>
                <p className="text-xs text-white/70">Modern Counter-Strike Experience</p>
              </div>
            </div>

            {/* Connection Status */}
            <div className="flex items-center space-x-2 px-2 py-1 bg-green-500/20 rounded-lg">
              <div className="w-2 h-2 bg-green-500 rounded-full animate-pulse" />
              <span className="text-green-400 text-xs">Online</span>
            </div>
          </div>

          {/* Search Bar */}
          <div className="relative mb-4">
            <input 
              type="text"
              placeholder="Search rooms..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className={`w-full px-4 py-3 pl-10 backdrop-blur-md bg-white/10 border border-white/20 rounded-lg text-white placeholder-white/50 focus:outline-none focus:border-white/40 ${
                isTouch ? 'text-base' : 'text-sm'
              }`}
            />
            <span className="absolute left-3 top-1/2 transform -translate-y-1/2 text-white/50">🔍</span>
          </div>

          {/* Action Buttons */}
          <div className="flex space-x-2 mb-4">
            <button 
              onClick={() => setShowCreateModal(true)}
              className={`flex-1 bg-gradient-to-r from-orange-500 to-pink-600 text-white rounded-lg hover:shadow-lg transition-all font-bold ${
                isTouch ? 'py-3 px-4 text-base' : 'py-2 px-3 text-sm'
              }`}
            >
              ➕ Create Room
            </button>
            
            <button 
              onClick={quickJoinWithBots}
              className={`flex-1 bg-gradient-to-r from-purple-600 to-indigo-600 text-white rounded-lg hover:shadow-lg transition-all font-bold ${
                isTouch ? 'py-3 px-4 text-base' : 'py-2 px-3 text-sm'
              }`}
            >
              🎮 Quick Play
            </button>

            <button 
              onClick={() => setShowFilters(!showFilters)}
              className={`px-4 backdrop-blur-md bg-white/10 border border-white/20 rounded-lg text-white transition-all ${
                isTouch ? 'py-3 min-w-[48px]' : 'py-2'
              }`}
            >
              🔽
            </button>
          </div>

          {/* Collapsible Filters */}
          {showFilters && (
            <div className="space-y-3 p-3 backdrop-blur-md bg-white/5 rounded-lg border border-white/20">
              <select 
                value={filterMode}
                onChange={(e) => setFilterMode(e.target.value)}
                className={`w-full backdrop-blur-md bg-white/10 border border-white/20 rounded-lg text-white focus:outline-none focus:border-white/40 ${
                  isTouch ? 'py-3 px-4' : 'py-2 px-3'
                }`}
              >
                <option value="all">All Modes</option>
                <option value="deathmatch">Deathmatch</option>
                <option value="teamDeathmatch">Team Deathmatch</option>
                <option value="bombDefusal">Bomb Defusal</option>
                <option value="hostageRescue">Hostage Rescue</option>
              </select>
              
              <label className="flex items-center space-x-3 text-white">
                <input 
                  type="checkbox"
                  checked={showOnlyWithBots}
                  onChange={(e) => setShowOnlyWithBots(e.target.checked)}
                  className={`rounded ${isTouch ? 'w-5 h-5' : 'w-4 h-4'}`}
                />
                <span>Show Bot Rooms Only</span>
              </label>
            </div>
          )}
        </div>
      </header>

      {/* Room List */}
      <div className="flex-1 p-4 overflow-y-auto">
        <div className="space-y-4">
          {filteredRooms.map((room) => (
            <button
              key={room.id}
              type="button"
              className={`w-full text-left backdrop-blur-xl bg-white/5 border border-white/20 rounded-xl shadow-xl hover:bg-white/10 hover:border-white/30 transition-all duration-300 active:scale-95 ${
                isTouch ? 'p-4' : 'p-3'
              }`}
              onClick={() => window.location.href = `/room/${room.id}`}
            >
              {/* Room Header */}
              <div className="flex items-start justify-between mb-3">
                <div className="flex-1 min-w-0">
                  <h3 className="text-lg font-bold text-white mb-1 truncate">{room.name}</h3>
                  <div className="flex flex-wrap items-center gap-2">
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
                  <div className={`font-bold text-sm ${
                    room.ping < 30 ? 'text-green-400' : 
                    room.ping < 60 ? 'text-yellow-400' : 'text-red-400'
                  }`}>
                    {room.ping}ms
                  </div>
                </div>
              </div>

              {/* Room Info Grid */}
              <div className="grid grid-cols-2 gap-3 text-sm">
                <div className="flex justify-between">
                  <span className="text-white/60">Map</span>
                  <span className="text-white font-medium truncate ml-2">{room.map}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-white/60">Mode</span>
                  <span className="text-white font-medium truncate ml-2">{room.mode}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-white/60">Players</span>
                  <span className="text-white font-medium">👥 {room.players}/{room.maxPlayers}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-white/60">Bots</span>
                  <span className="text-white font-medium">
                    {difficultyIcons[room.botDifficulty]} {room.bots}
                  </span>
                </div>
              </div>

              {/* Progress Bar */}
              <div className="w-full bg-white/10 rounded-full h-2 mt-3 overflow-hidden">
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
            </button>
          ))}
        </div>

        {/* Empty State */}
        {filteredRooms.length === 0 && (
          <div className="backdrop-blur-xl bg-white/5 border border-white/20 rounded-xl p-8 text-center">
            <div className="text-4xl mb-4">🎮</div>
            <h3 className="text-xl font-bold text-white mb-2">No Rooms Found</h3>
            <p className="text-white/60 mb-6">Create a new room or adjust your filters</p>
            <button 
              onClick={() => setShowCreateModal(true)}
              className="px-6 py-3 bg-gradient-to-r from-orange-500 to-pink-600 text-white rounded-lg font-bold"
            >
              Create First Room
            </button>
          </div>
        )}
      </div>

      {/* Create Room Modal */}
      {showCreateModal && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <div className="backdrop-blur-xl bg-white/10 border border-white/20 rounded-xl shadow-2xl w-full max-w-md max-h-[90vh] overflow-y-auto">
            <div className="p-6">
              <div className="flex items-center justify-between mb-6">
                <h2 className="text-2xl font-bold text-white">Create Room</h2>
                <button 
                  onClick={() => setShowCreateModal(false)}
                  className="text-white/60 hover:text-white text-xl"
                >
                  ✕
                </button>
              </div>
              
              <div className="space-y-4">
                <div>
                  <label className="block text-white/80 mb-2">Room Name</label>
                  <input 
                    type="text"
                    value={roomConfig.name}
                    onChange={(e) => setRoomConfig({...roomConfig, name: e.target.value})}
                    className={`w-full backdrop-blur-md bg-white/10 border border-white/20 rounded-lg text-white placeholder-white/50 focus:outline-none focus:border-white/40 ${
                      isTouch ? 'py-3 px-4' : 'py-2 px-3'
                    }`}
                    placeholder="Enter room name..."
                  />
                </div>
                
                <div>
                  <label className="block text-white/80 mb-2">Game Mode</label>
                  <select 
                    value={roomConfig.mode}
                    onChange={(e) => setRoomConfig({...roomConfig, mode: e.target.value})}
                    className={`w-full backdrop-blur-md bg-white/10 border border-white/20 rounded-lg text-white focus:outline-none focus:border-white/40 ${
                      isTouch ? 'py-3 px-4' : 'py-2 px-3'
                    }`}
                  >
                    <option value="deathmatch">Deathmatch</option>
                    <option value="teamDeathmatch">Team Deathmatch</option>
                    <option value="bombDefusal">Bomb Defusal</option>
                    <option value="hostageRescue">Hostage Rescue</option>
                  </select>
                </div>
                
                <div>
                  <label className="block text-white/80 mb-2">Map</label>
                  <select 
                    value={roomConfig.map}
                    onChange={(e) => setRoomConfig({...roomConfig, map: e.target.value})}
                    className={`w-full backdrop-blur-md bg-white/10 border border-white/20 rounded-lg text-white focus:outline-none focus:border-white/40 ${
                      isTouch ? 'py-3 px-4' : 'py-2 px-3'
                    }`}
                  >
                    <option value="de_dust2">Dust 2</option>
                    <option value="de_inferno">Inferno</option>
                    <option value="de_mirage">Mirage</option>
                    <option value="cs_office">Office</option>
                  </select>
                </div>

                {/* Bot Configuration */}
                <div className="p-4 backdrop-blur-md bg-white/5 border border-white/20 rounded-lg">
                  <label className="flex items-center space-x-3 mb-4">
                    <input 
                      type="checkbox"
                      checked={roomConfig.botConfig.enabled}
                      onChange={(e) => setRoomConfig({
                        ...roomConfig, 
                        botConfig: {...roomConfig.botConfig, enabled: e.target.checked}
                      })}
                      className={`rounded ${isTouch ? 'w-5 h-5' : 'w-4 h-4'}`}
                    />
                    <span className="text-white font-semibold">Enable Bots</span>
                  </label>
                  
                  {roomConfig.botConfig.enabled && (
                    <div className="space-y-4">
                      <div>
                        <label className="block text-white/80 mb-2">Number of Bots</label>
                        <input 
                          type="number"
                          value={roomConfig.botConfig.count}
                          onChange={(e) => setRoomConfig({
                            ...roomConfig,
                            botConfig: {...roomConfig.botConfig, count: parseInt(e.target.value)}
                          })}
                          className={`w-full backdrop-blur-md bg-white/10 border border-white/20 rounded-lg text-white focus:outline-none focus:border-white/40 ${
                            isTouch ? 'py-3 px-4' : 'py-2 px-3'
                          }`}
                          min="0"
                          max={roomConfig.maxPlayers - 1}
                        />
                      </div>
                      
                      <div>
                        <label className="block text-white/80 mb-2">Bot Difficulty</label>
                        <select 
                          value={roomConfig.botConfig.difficulty}
                          onChange={(e) => setRoomConfig({
                            ...roomConfig,
                            botConfig: { ...roomConfig.botConfig, difficulty: e.target.value as 'easy' | 'normal' | 'hard' | 'expert' }
                          })}
                          className={`w-full backdrop-blur-md bg-white/10 border border-white/20 rounded-lg text-white focus:outline-none focus:border-white/40 ${
                            isTouch ? 'py-3 px-4' : 'py-2 px-3'
                          }`}
                        >
                          <option value="easy">🟢 Easy</option>
                          <option value="normal">🟡 Normal</option>
                          <option value="hard">🟠 Hard</option>
                          <option value="expert">🔴 Expert</option>
                        </select>
                      </div>
                    </div>
                  )}
                </div>
                
                <div className="flex space-x-3 pt-4">
                  <button 
                    onClick={() => setShowCreateModal(false)}
                    className={`flex-1 backdrop-blur-md bg-white/10 border border-white/20 rounded-lg text-white transition-all ${
                      isTouch ? 'py-3 px-4' : 'py-2 px-3'
                    }`}
                  >
                    Cancel
                  </button>
                  <button 
                    onClick={createRoom}
                    className={`flex-1 bg-gradient-to-r from-orange-500 to-pink-600 text-white rounded-lg font-semibold transition-all ${
                      isTouch ? 'py-3 px-4' : 'py-2 px-3'
                    }`}
                  >
                    Create
                  </button>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};