import React, { useState } from 'react';
import { useI18n } from '../contexts/I18nContext';
import { LanguageSwitcher } from './LanguageSwitcher';

interface Room {
  id: string;
  name: string;
  players: number;
  maxPlayers: number;
  mode: string;
  map: string;
  status: 'waiting' | 'playing';
  ping: number;
}

export const ModernGameLobby: React.FC = () => {
  const { t } = useI18n();
  const [rooms, setRooms] = useState<Room[]>([
    { id: '1', name: 'Dust2 Classic', players: 3, maxPlayers: 10, mode: 'deathmatch', map: 'de_dust2', status: 'waiting', ping: 32 },
    { id: '2', name: 'Aim Training', players: 8, maxPlayers: 8, mode: 'freeForAll', map: 'aim_map', status: 'playing', ping: 45 },
    { id: '3', name: 'Zombie Survival', players: 12, maxPlayers: 20, mode: 'zombies', map: 'zm_panic', status: 'waiting', ping: 28 },
  ]);
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [roomConfig, setRoomConfig] = useState({
    name: '',
    mode: 'deathmatch',
    map: 'de_dust2',
    maxPlayers: 10,
    password: ''
  });
  const [searchQuery, setSearchQuery] = useState('');
  const [filterMode, setFilterMode] = useState('all');

  const createRoom = () => {
    const newRoom: Room = {
      id: Date.now().toString(),
      name: roomConfig.name || t('lobby.roomName'),
      players: 1,
      maxPlayers: roomConfig.maxPlayers,
      mode: roomConfig.mode,
      map: roomConfig.map,
      status: 'waiting',
      ping: Math.floor(Math.random() * 50) + 10
    };
    setRooms([...rooms, newRoom]);
    setShowCreateModal(false);
    window.location.href = `/room/${newRoom.id}`;
  };

  const filteredRooms = rooms.filter(room => {
    const matchesSearch = room.name.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesMode = filterMode === 'all' || room.mode === filterMode;
    return matchesSearch && matchesMode;
  });

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-purple-900 to-slate-900 overflow-hidden relative">
      {/* Animated Background */}
      <div className="absolute inset-0">
        <div className="absolute top-0 -left-4 w-96 h-96 bg-purple-500 rounded-full mix-blend-multiply filter blur-3xl opacity-20 animate-blob" />
        <div className="absolute top-0 -right-4 w-96 h-96 bg-yellow-500 rounded-full mix-blend-multiply filter blur-3xl opacity-20 animate-blob animation-delay-2000" />
        <div className="absolute -bottom-8 left-20 w-96 h-96 bg-pink-500 rounded-full mix-blend-multiply filter blur-3xl opacity-20 animate-blob animation-delay-4000" />
      </div>

      {/* Header with Glass Effect */}
      <header className="relative backdrop-blur-xl bg-white/5 border-b border-white/10 shadow-2xl">
        <div className="max-w-7xl mx-auto px-6 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-6">
              {/* Logo with Gradient */}
              <div className="flex items-center space-x-3">
                <div className="w-12 h-12 bg-gradient-to-br from-orange-400 to-pink-600 rounded-xl flex items-center justify-center shadow-lg shadow-orange-500/25">
                  <span className="text-white font-black text-xl">CS</span>
                </div>
                <div>
                  <h1 className="text-3xl font-black bg-gradient-to-r from-orange-400 to-pink-600 bg-clip-text text-transparent" data-testid="lobby-header">
                    CS2D
                  </h1>
                  <p className="text-xs text-white/60 -mt-1">{t('lobby.title')}</p>
                </div>
              </div>
            </div>

            <div className="flex items-center space-x-6">
              {/* Language Switcher */}
              <LanguageSwitcher />
              
              {/* Connection Status */}
              <div className="flex items-center space-x-3">
                <span className="text-sm text-white/60">{t('common.playersOnline')}: 1,247</span>
                <div className="flex items-center space-x-2 px-3 py-1 bg-green-500/20 rounded-lg" data-testid="connection-status" data-status="connected">
                  <div className="w-2 h-2 bg-green-400 rounded-full animate-pulse shadow-lg shadow-green-400/50" />
                  <span className="text-xs text-green-400 font-medium">{t('common.connected')}</span>
                </div>
              </div>

              {/* User Profile */}
              <div className="flex items-center space-x-3">
                <div className="w-10 h-10 bg-gradient-to-br from-purple-400 to-blue-600 rounded-xl flex items-center justify-center">
                  <span className="text-white font-bold">P1</span>
                </div>
              </div>
            </div>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <div className="relative max-w-7xl mx-auto p-6">
        {/* Action Bar with Glass Effect */}
        <div className="backdrop-blur-xl bg-white/5 rounded-2xl p-6 mb-6 border border-white/10 shadow-2xl">
          <div className="flex flex-col lg:flex-row justify-between items-center gap-4">
            <div className="flex gap-3">
              <button
                onClick={() => setShowCreateModal(true)}
                className="relative px-8 py-3 rounded-xl font-bold text-white bg-gradient-to-r from-orange-500 to-pink-600 hover:from-orange-600 hover:to-pink-700 transform hover:scale-105 transition-all duration-200 shadow-lg shadow-orange-500/25"
                data-testid="create-room-btn"
              >
                <span className="relative z-10">{t('lobby.createRoom')}</span>
              </button>
              <button 
                className="px-8 py-3 rounded-xl font-bold text-white backdrop-blur-xl bg-white/10 hover:bg-white/20 border border-white/20 transform hover:scale-105 transition-all duration-200"
                data-testid="quick-join-btn"
              >
                {t('lobby.quickJoin')}
              </button>
            </div>
            
            <div className="flex gap-3">
              <div className="relative">
                <input
                  type="text"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  placeholder={t('lobby.searchRooms')}
                  className="w-64 px-4 py-3 pl-10 rounded-xl backdrop-blur-xl bg-white/10 border border-white/20 text-white placeholder-white/40 focus:outline-none focus:ring-2 focus:ring-orange-500/50 focus:border-orange-500/50 transition-all"
                />
                <svg className="absolute left-3 top-3.5 w-4 h-4 text-white/40" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                </svg>
              </div>
              <select 
                value={filterMode}
                onChange={(e) => setFilterMode(e.target.value)}
                className="px-4 py-3 rounded-xl backdrop-blur-xl bg-white/10 border border-white/20 text-white focus:outline-none focus:ring-2 focus:ring-orange-500/50 transition-all"
              >
                <option value="all" className="bg-slate-900">{t('lobby.allModes')}</option>
                <option value="deathmatch" className="bg-slate-900">{t('modes.deathmatch')}</option>
                <option value="teamDeathmatch" className="bg-slate-900">{t('modes.teamDeathmatch')}</option>
                <option value="defuse" className="bg-slate-900">{t('modes.defuse')}</option>
                <option value="zombies" className="bg-slate-900">{t('modes.zombies')}</option>
              </select>
            </div>
          </div>
        </div>

        {/* Room Grid */}
        <div className="grid gap-4" data-testid="room-list">
          {filteredRooms.length === 0 ? (
            <div className="backdrop-blur-xl bg-white/5 rounded-2xl p-12 text-center border border-white/10">
              <div className="w-20 h-20 bg-gradient-to-br from-purple-400 to-blue-600 rounded-2xl mx-auto mb-4 flex items-center justify-center">
                <svg className="w-10 h-10 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 11H5m14 0a2 2 0 012 2v6a2 2 0 01-2 2H5a2 2 0 01-2-2v-6a2 2 0 012-2m14 0V9a2 2 0 00-2-2M5 11V9a2 2 0 012-2m0 0V5a2 2 0 012-2h6a2 2 0 012 2v2M7 7h10" />
                </svg>
              </div>
              <p className="text-white/60 text-lg">{t('lobby.noRooms')}</p>
            </div>
          ) : (
            filteredRooms.map(room => (
              <div 
                key={room.id} 
                className="backdrop-blur-xl bg-white/5 rounded-xl p-6 border border-white/10 hover:bg-white/10 hover:border-white/20 transform hover:scale-[1.02] transition-all duration-200 group"
              >
                <div className="flex items-center justify-between">
                  <div className="flex items-center space-x-4">
                    {/* Room Icon */}
                    <div className="w-14 h-14 bg-gradient-to-br from-blue-400 to-purple-600 rounded-xl flex items-center justify-center shadow-lg group-hover:shadow-xl transition-shadow">
                      <span className="text-white font-bold text-lg">{room.players}</span>
                    </div>
                    
                    {/* Room Info */}
                    <div>
                      <h3 className="text-lg font-bold text-white" data-testid="room-name">{room.name}</h3>
                      <div className="flex items-center space-x-4 mt-1">
                        <span className="text-sm text-white/60">{t(`modes.${room.mode}`)}</span>
                        <span className="text-sm text-white/40">•</span>
                        <span className="text-sm text-white/60">{room.map}</span>
                        <span className="text-sm text-white/40">•</span>
                        <span className="text-sm text-white/60" data-testid="player-count">
                          {room.players}/{room.maxPlayers} {t('lobby.players')}
                        </span>
                      </div>
                    </div>
                  </div>
                  
                  <div className="flex items-center space-x-4">
                    {/* Ping */}
                    <div className="flex items-center space-x-2">
                      <div className={`w-2 h-2 rounded-full ${room.ping < 50 ? 'bg-green-400' : room.ping < 100 ? 'bg-yellow-400' : 'bg-red-400'}`} />
                      <span className="text-sm text-white/60">{room.ping}ms</span>
                    </div>
                    
                    {/* Status */}
                    <span className={`px-3 py-1 rounded-lg text-xs font-medium ${
                      room.status === 'waiting' 
                        ? 'bg-green-500/20 text-green-400' 
                        : 'bg-yellow-500/20 text-yellow-400'
                    }`}>
                      {t(`lobby.${room.status === 'waiting' ? 'waiting' : 'inGame'}`)}
                    </span>
                    
                    {/* Join Button */}
                    <button 
                      className="px-6 py-2 rounded-lg bg-gradient-to-r from-blue-500 to-purple-600 hover:from-blue-600 hover:to-purple-700 text-white font-medium transform hover:scale-105 transition-all duration-200 shadow-lg"
                      onClick={() => window.location.href = `/room/${room.id}`}
                    >
                      {t('lobby.joinRoom')}
                    </button>
                  </div>
                </div>
              </div>
            ))
          )}
        </div>
      </div>

      {/* Create Room Modal */}
      {showCreateModal && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <div className="backdrop-blur-xl bg-white/10 rounded-2xl p-8 w-full max-w-md border border-white/20 shadow-2xl transform scale-100 animate-modalIn">
            <h2 className="text-3xl font-black bg-gradient-to-r from-orange-400 to-pink-600 bg-clip-text text-transparent mb-6">
              {t('lobby.createRoom')}
            </h2>
            
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-white/60 mb-2">{t('lobby.roomName')}</label>
                <input
                  type="text"
                  value={roomConfig.name}
                  onChange={(e) => setRoomConfig({...roomConfig, name: e.target.value})}
                  className="w-full px-4 py-3 rounded-xl backdrop-blur-xl bg-white/10 border border-white/20 text-white placeholder-white/40 focus:outline-none focus:ring-2 focus:ring-orange-500/50 transition-all"
                  placeholder={t('lobby.roomName')}
                />
              </div>
              
              <div>
                <label className="block text-sm font-medium text-white/60 mb-2">{t('lobby.gameMode')}</label>
                <select 
                  value={roomConfig.mode}
                  onChange={(e) => setRoomConfig({...roomConfig, mode: e.target.value})}
                  className="w-full px-4 py-3 rounded-xl backdrop-blur-xl bg-white/10 border border-white/20 text-white focus:outline-none focus:ring-2 focus:ring-orange-500/50 transition-all"
                  data-testid="game-mode"
                >
                  <option value="deathmatch" className="bg-slate-900">{t('modes.deathmatch')}</option>
                  <option value="teamDeathmatch" className="bg-slate-900">{t('modes.teamDeathmatch')}</option>
                  <option value="defuse" className="bg-slate-900">{t('modes.defuse')}</option>
                  <option value="zombies" className="bg-slate-900">{t('modes.zombies')}</option>
                </select>
              </div>
              
              <div>
                <label className="block text-sm font-medium text-white/60 mb-2">{t('lobby.map')}</label>
                <select 
                  value={roomConfig.map}
                  onChange={(e) => setRoomConfig({...roomConfig, map: e.target.value})}
                  className="w-full px-4 py-3 rounded-xl backdrop-blur-xl bg-white/10 border border-white/20 text-white focus:outline-none focus:ring-2 focus:ring-orange-500/50 transition-all"
                  data-testid="selected-map"
                >
                  <option value="de_dust2" className="bg-slate-900">de_dust2</option>
                  <option value="de_inferno" className="bg-slate-900">de_inferno</option>
                  <option value="aim_map" className="bg-slate-900">aim_map</option>
                  <option value="zm_panic" className="bg-slate-900">zm_panic</option>
                </select>
              </div>
              
              <div>
                <label className="block text-sm font-medium text-white/60 mb-2">{t('room.maxPlayers')}</label>
                <input
                  type="number"
                  min="2"
                  max="32"
                  value={roomConfig.maxPlayers}
                  onChange={(e) => setRoomConfig({...roomConfig, maxPlayers: parseInt(e.target.value)})}
                  className="w-full px-4 py-3 rounded-xl backdrop-blur-xl bg-white/10 border border-white/20 text-white focus:outline-none focus:ring-2 focus:ring-orange-500/50 transition-all"
                />
              </div>
            </div>
            
            <div className="flex gap-3 mt-8">
              <button
                onClick={() => setShowCreateModal(false)}
                className="flex-1 px-6 py-3 rounded-xl backdrop-blur-xl bg-white/10 hover:bg-white/20 border border-white/20 text-white font-medium transition-all"
              >
                {t('common.cancel')}
              </button>
              <button
                onClick={createRoom}
                className="flex-1 px-6 py-3 rounded-xl bg-gradient-to-r from-orange-500 to-pink-600 hover:from-orange-600 hover:to-pink-700 text-white font-bold transform hover:scale-105 transition-all shadow-lg"
              >
                {t('lobby.createRoom')}
              </button>
            </div>
          </div>
        </div>
      )}
      
      <style jsx>{`
        @keyframes blob {
          0% { transform: translate(0px, 0px) scale(1); }
          33% { transform: translate(30px, -50px) scale(1.1); }
          66% { transform: translate(-20px, 20px) scale(0.9); }
          100% { transform: translate(0px, 0px) scale(1); }
        }
        @keyframes modalIn {
          from { opacity: 0; transform: scale(0.9); }
          to { opacity: 1; transform: scale(1); }
        }
        .animate-blob { animation: blob 7s infinite; }
        .animation-delay-2000 { animation-delay: 2s; }
        .animation-delay-4000 { animation-delay: 4s; }
        .animate-modalIn { animation: modalIn 0.3s ease-out; }
      `}</style>
    </div>
  );
};